import base64
import csv
import re
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from app.core.config import (
    MAXIMO_BASE_URL,
    MAXIMO_USERNAME,
    MAXIMO_PASSWORD,
    MAXIMO_SITEID,
)

DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "maximo_training_data.csv"

_session = None


def get_session() -> requests.Session:
    global _session

    if _session is None:
        _session = requests.Session()

        retry = Retry(
            total=3,
            connect=3,
            read=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET"],
        )

        adapter = HTTPAdapter(max_retries=retry)
        _session.mount("http://", adapter)
        _session.mount("https://", adapter)

    return _session


def safe(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def clean_text(value: str) -> str:
    value = safe(value).lower()
    value = re.sub(r"<[^>]+>", " ", value)
    value = value.replace("\n", " ").replace("\r", " ")
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def get_headers() -> dict:
    token = base64.b64encode(
        f"{MAXIMO_USERNAME}:{MAXIMO_PASSWORD}".encode("utf-8")
    ).decode("utf-8")

    return {
        "maxauth": token,
        "Accept": "application/json",
        "Content-Type": "application/json",
        "properties": "*",
    }


def build_url(object_structure: str, params: dict) -> str:
    query = urlencode(params, safe='{},:" ')
    return f"{MAXIMO_BASE_URL}/oslc/os/{object_structure}?{query}"


def rewrite_maximo_url(url: str) -> str:
    if not url:
        return ""

    if "/maximo/" in url:
        suffix = url.split("/maximo", 1)[1]
        return f"{MAXIMO_BASE_URL}{suffix}"

    return url


def maximo_get(url: str) -> dict:
    url = rewrite_maximo_url(url)

    response = get_session().get(
        url,
        headers=get_headers(),
        timeout=60,
    )

    if response.status_code >= 400:
        raise Exception(
            f"Maximo error {response.status_code}: {response.text[:1500]}"
        )

    return response.json()


def fetch_collection(collection_url: str, limit: int = 5) -> list[dict]:
    if not collection_url:
        return []

    collection_url = rewrite_maximo_url(collection_url)
    separator = "&" if "?" in collection_url else "?"
    url = f"{collection_url}{separator}lean=1&oslc.pageSize={limit}"

    try:
        data = maximo_get(url)
        return data.get("member", [])
    except Exception as e:
        print("COLLECTION FETCH ERROR:", str(e))
        print("COLLECTION URL:", url)
        return []


def fetch_workorders_from_maximo(limit: int = 1000) -> list[dict]:
    select = ",".join([
        "href",
        "wonum",
        "siteid",
        "description",
        "status",
        "status_description",
        "assetnum",
        "location",
        "locationdescription",
        "priority",
        "wopriority",
        "workorderid",
        "ishistory",
        "scheduledstart",
        "scheduledfinish",
        "reportdate",
        "changedate",
        "faildate",
        "worktype",
        "problemcode",
        "failurecode",
        "causecode",
        "remedycode",
        "worklog_collectionref",
        "wpmaterial_collectionref",
        "matusetrans_collectionref",
        "wplabor_collectionref",
        "labtrans_collectionref",
    ])

    params = {
        "lean": "1",
        "oslc.pageSize": str(limit),
        "oslc.where": f'siteid="{MAXIMO_SITEID}" and istask=0',
        "oslc.select": select,
        "oslc.orderBy": "-changedate",
    }

    for order_field in ["-changedate", "-reportdate", None]:
        if order_field:
            params["oslc.orderBy"] = order_field
        else:
            params.pop("oslc.orderBy", None)

        try:
            url = build_url("mxapiwo", params)
            data = maximo_get(url)
            return data.get("member", [])
        except Exception:
            continue

    return []


def fetch_debug_workorder(wonum: str = "1209") -> dict:
    select = ",".join([
        "href",
        "wonum",
        "siteid",
        "description",
        "status",
        "status_description",
        "faildate",
        "changedate",
        "reportdate",
        "problemcode",
        "failurecode",
        "causecode",
        "remedycode",
        "worklog_collectionref",
        "wpmaterial_collectionref",
        "matusetrans_collectionref",
        "wplabor_collectionref",
        "labtrans_collectionref",
    ])

    params = {
        "lean": "1",
        "oslc.pageSize": "1",
        "oslc.where": f'wonum="{wonum}" and siteid="{MAXIMO_SITEID}"',
        "oslc.select": select,
    }

    url = build_url("mxapiwo", params)
    data = maximo_get(url)
    members = data.get("member", [])

    if not members:
        return {
            "message": "Aucun workorder trouvé",
            "url": url,
            "raw": data,
        }

    wo = members[0]

    return {
        "url": url,
        "keys": list(wo.keys()),
        "sample": wo,
        "collections": {
            "worklogs_sample": fetch_collection(wo.get("worklog_collectionref"), 5),
            "planned_materials_sample": fetch_collection(wo.get("wpmaterial_collectionref"), 5),
            "actual_materials_sample": fetch_collection(wo.get("matusetrans_collectionref"), 5),
            "planned_labor_sample": fetch_collection(wo.get("wplabor_collectionref"), 5),
            "actual_labor_sample": fetch_collection(wo.get("labtrans_collectionref"), 5),
        },
    }


def extract_worklogs(wo: dict, load_collections: bool = False) -> str:
    worklogs = wo.get("worklog") or []

    if load_collections and not worklogs and wo.get("worklog_collectionref"):
        worklogs = fetch_collection(wo.get("worklog_collectionref"), limit=10)

    parts = []

    if isinstance(worklogs, list):
        for log in worklogs:
            parts.append(safe(log.get("description")))
            parts.append(safe(log.get("longdescription")))
            parts.append(safe(log.get("description_longdescription")))

    return clean_text(" ".join(parts))


def extract_materials(wo: dict, load_collections: bool = False) -> tuple[str, int]:
    materials = []

    planned = wo.get("wpmaterial") or []
    actual = wo.get("matusetrans") or []

    if load_collections and not planned and wo.get("wpmaterial_collectionref"):
        planned = fetch_collection(wo.get("wpmaterial_collectionref"), limit=10)

    if load_collections and not actual and wo.get("matusetrans_collectionref"):
        actual = fetch_collection(wo.get("matusetrans_collectionref"), limit=10)

    if isinstance(planned, list):
        for item in planned:
            itemnum = safe(item.get("itemnum"))
            desc = safe(item.get("description"))
            qty = safe(item.get("itemqty") or item.get("quantity"))
            if itemnum or desc:
                materials.append(f"planned:{itemnum} {desc} qty:{qty}")

    if isinstance(actual, list):
        for item in actual:
            itemnum = safe(item.get("itemnum"))
            desc = safe(item.get("description"))
            qty = safe(item.get("quantity") or item.get("itemqty"))
            if itemnum or desc:
                materials.append(f"actual:{itemnum} {desc} qty:{qty}")

    return clean_text(" | ".join(materials)), len(materials)


def extract_labor(wo: dict, load_collections: bool = False) -> tuple[str, int]:
    labor = []

    planned = wo.get("wplabor") or []
    actual = wo.get("labtrans") or []

    if load_collections and not planned and wo.get("wplabor_collectionref"):
        planned = fetch_collection(wo.get("wplabor_collectionref"), limit=10)

    if load_collections and not actual and wo.get("labtrans_collectionref"):
        actual = fetch_collection(wo.get("labtrans_collectionref"), limit=10)

    if isinstance(planned, list):
        for item in planned:
            laborcode = safe(item.get("laborcode"))
            desc = safe(item.get("description"))
            craft = safe(item.get("craft"))
            hrs = safe(item.get("regularhrs") or item.get("labhrs") or item.get("laborhrs"))
            if laborcode or desc or craft:
                labor.append(f"planned:{laborcode} {desc} craft:{craft} hrs:{hrs}")

    if isinstance(actual, list):
        for item in actual:
            laborcode = safe(item.get("laborcode"))
            craft = safe(item.get("craft"))
            hrs = safe(item.get("regularhrs"))
            if laborcode or craft:
                labor.append(f"actual:{laborcode} craft:{craft} hrs:{hrs}")

    return clean_text(" | ".join(labor)), len(labor)


def extract_cause(wo: dict) -> str:
    return safe(
        wo.get("causecode")
        or wo.get("cause")
        or wo.get("failurecause")
        or wo.get("failurecausecode")
    )


def extract_remedy(wo: dict) -> str:
    return safe(
        wo.get("remedycode")
        or wo.get("remedy")
        or wo.get("failureremedy")
        or wo.get("failureremedycode")
    )


def build_training_text(
    wo: dict,
    worklogs: str,
    materials: str,
    labor: str,
    cause: str,
    remedy: str,
) -> str:
    parts = [
        f"description: {safe(wo.get('description'))}",
        f"asset: {safe(wo.get('assetnum'))}",
        f"location: {safe(wo.get('location'))}",
        f"location description: {safe(wo.get('locationdescription'))}",
        f"worktype: {safe(wo.get('worktype'))}",
        f"priority: {safe(wo.get('wopriority') or wo.get('priority'))}",
        f"status: {safe(wo.get('status'))}",
        f"failure class: {safe(wo.get('failurecode'))}",
        f"problem: {safe(wo.get('problemcode'))}",
        f"cause: {cause}",
        f"remedy: {remedy}",
        f"worklogs: {worklogs}",
        f"materials: {materials}",
        f"labor: {labor}",
    ]

    return clean_text(" ".join([p for p in parts if p]))


def export_training_data_from_maximo(
    limit: int = 1000,
    load_collections: bool = False,
) -> dict:
    workorders = fetch_workorders_from_maximo(limit)

    rows = []
    skipped = 0

    unknown_failure = 0
    unknown_problem = 0
    unknown_cause = 0
    unknown_remedy = 0

    with_worklog = 0
    with_materials = 0
    with_labor = 0

    for wo in workorders:
        failure_class = safe(wo.get("failurecode"))
        problem = safe(wo.get("problemcode"))
        cause = extract_cause(wo)
        remedy = extract_remedy(wo)

        if not failure_class:
            failure_class = "UNKNOWN"
            unknown_failure += 1

        if not problem:
            problem = "UNKNOWN"
            unknown_problem += 1

        if not cause:
            cause = "UNKNOWN"
            unknown_cause += 1

        if not remedy:
            remedy = "UNKNOWN"
            unknown_remedy += 1

        worklogs = extract_worklogs(wo, load_collections=load_collections)
        materials, material_count = extract_materials(wo, load_collections=load_collections)
        labor, labor_count = extract_labor(wo, load_collections=load_collections)

        if worklogs:
            with_worklog += 1

        if material_count > 0:
            with_materials += 1

        if labor_count > 0:
            with_labor += 1

        text = build_training_text(
            wo=wo,
            worklogs=worklogs,
            materials=materials,
            labor=labor,
            cause=cause,
            remedy=remedy,
        )

        if not text:
            skipped += 1
            continue

        rows.append({
            "wonum": safe(wo.get("wonum")),
            "siteid": safe(wo.get("siteid")),
            "text": text,
            "failure_class": failure_class,
            "problem": problem,
            "cause": cause,
            "remedy": remedy,
            "assetnum": safe(wo.get("assetnum")),
            "location": safe(wo.get("location")),
            "worktype": safe(wo.get("worktype")),
            "priority": safe(wo.get("wopriority") or wo.get("priority")),
            "status": safe(wo.get("status")),
            "materials": materials,
            "labor": labor,
            "material_count": material_count,
            "labor_count": labor_count,
        })

    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)

    with open(DATA_PATH, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "wonum",
                "siteid",
                "text",
                "failure_class",
                "problem",
                "cause",
                "remedy",
                "assetnum",
                "location",
                "worktype",
                "priority",
                "status",
                "materials",
                "labor",
                "material_count",
                "labor_count",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)

    return {
        "total_from_maximo": len(workorders),
        "exported_rows": len(rows),
        "skipped_rows": skipped,
        "with_worklog": with_worklog,
        "with_materials": with_materials,
        "with_labor": with_labor,
        "unknown_failure": unknown_failure,
        "unknown_problem": unknown_problem,
        "unknown_cause": unknown_cause,
        "unknown_remedy": unknown_remedy,
        "load_collections": load_collections,
        "path": str(DATA_PATH),
    }

def search_assets_from_maximo(
    query: str = "",
    location: str = "",
    limit: int = 20,
) -> list[dict]:
    select = ",".join([
        "assetnum",
        "description",
        "location",
        "siteid",
        "status",
    ])

    where_parts = [f'siteid="{MAXIMO_SITEID}"']

    clean_query = safe(query).replace('"', "")
    clean_location = safe(location).replace('"', "")

    if clean_location:
        where_parts.append(f'location="{clean_location}"')

    if clean_query:
        where_parts.append(
            f'(assetnum~"{clean_query}" or description~"{clean_query}")'
        )

    params = {
        "lean": "1",
        "oslc.pageSize": str(limit),
        "oslc.where": " and ".join(where_parts),
        "oslc.select": select,
    }

    url = build_url("mxapiasset", params)

    try:
        data = maximo_get(url)
        assets = data.get("member", [])

        return [
            {
                "assetnum": safe(a.get("assetnum")),
                "description": safe(a.get("description")),
                "location": safe(a.get("location")),
                "siteid": safe(a.get("siteid")),
                "status": safe(a.get("status")),
                "source": "maximo",
            }
            for a in assets
            if safe(a.get("assetnum"))
        ]
    except Exception as e:
        print("MAXIMO ASSET SEARCH ERROR:", str(e))
        return []


def get_assets_for_workorder_context(
    assetnum: str = "",
    location: str = "",
    description: str = "",
    limit: int = 20,
) -> list[dict]:
    keywords = []

    n = clean_text(description)

    if "pompe" in n or "pump" in n:
        keywords.append("pompe")
    if "moteur" in n or "motor" in n:
        keywords.append("moteur")
    if "huile" in n or "lubrification" in n:
        keywords.append("lub")
    if "vibration" in n:
        keywords.append("roulement")

    results = []

    if assetnum:
        results.extend(search_assets_from_maximo(assetnum, "", limit=5))

    if location:
        results.extend(search_assets_from_maximo("", location, limit=limit))

    for kw in keywords:
        results.extend(search_assets_from_maximo(kw, location, limit=10))

    unique = {}
    for asset in results:
        unique[asset["assetnum"]] = asset

    return list(unique.values())[:limit]