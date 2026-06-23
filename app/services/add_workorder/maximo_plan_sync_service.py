import base64
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from pymongo import MongoClient, UpdateOne

from app.core.config import (
    MAXIMO_BASE_URL,
    MAXIMO_PASSWORD,
    MAXIMO_PLAN_OS,
    MAXIMO_SITEID,
    MAXIMO_USERNAME,
    MONGO_DB_NAME,
    MONGO_URI,
)


def _db():
    client = MongoClient(MONGO_URI)
    return client[MONGO_DB_NAME]


def _make_maxauth(username: str, password: str) -> str:
    raw = f"{username}:{password}".encode("utf-8")
    return base64.b64encode(raw).decode("utf-8")


def _get_members(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    return (
        data.get("member")
        or data.get("rdfs:member")
        or data.get("rdfs_member")
        or []
    )


def _to_array(value: Any) -> List[Any]:
    if value is None:
        return []

    if isinstance(value, list):
        return value

    return [value]


def _clean(value: Any) -> str:
    if value is None:
        return ""

    if isinstance(value, dict):
        return str(
            value.get("location")
            or value.get("value")
            or value.get("description")
            or ""
        ).strip()

    return str(value).strip()


def _to_float(value: Any, default: float = 0.0) -> float:
    if value is None or value == "":
        return default

    if isinstance(value, (int, float)):
        return float(value)

    text = str(value).strip().replace(",", ".")

    if ":" in text:
        try:
            hours, minutes = text.split(":", 1)
            return float(hours or 0) + float(minutes or 0) / 60
        except Exception:
            return default

    try:
        return float(text)
    except Exception:
        return default


def _normalize_text(value: Any) -> str:
    return (
        str(value or "")
        .lower()
        .replace("é", "e")
        .replace("è", "e")
        .replace("ê", "e")
        .replace("ë", "e")
        .replace("à", "a")
        .replace("ç", "c")
        .replace("ù", "u")
        .strip()
    )


def _search_text(*values: Any) -> str:
    return " ".join(
        _normalize_text(value)
        for value in values
        if value is not None and str(value).strip()
    ).strip()


class MaximoPlanClient:
    def __init__(self):
        username = str(MAXIMO_USERNAME or "").strip()
        password = str(MAXIMO_PASSWORD or "").strip()

        if not username or not password:
            raise RuntimeError(
                "MAXIMO_USERNAME et MAXIMO_PASSWORD sont obligatoires dans .env"
            )

        self.client = httpx.Client(
            timeout=httpx.Timeout(
                connect=10.0,
                read=25.0,
                write=10.0,
                pool=10.0,
            ),
            follow_redirects=True,
        )

        self.maxauth = _make_maxauth(username, password)

    def login(self) -> Dict[str, Any]:
        url = f"{MAXIMO_BASE_URL.rstrip('/')}/oslc/login"

        response = self.client.post(
            url,
            params={"lean": "1"},
            headers={
                "MAXAUTH": self.maxauth,
                "Accept": "application/json",
            },
        )

        if response.status_code >= 400:
            raise RuntimeError(
                f"Erreur login Maximo HTTP {response.status_code}: {response.text}"
            )

        try:
            return response.json()
        except Exception:
            return {"message": response.text}

    def get_workorder_ids(
        self,
        siteid: str,
        page_size: int,
    ) -> List[Dict[str, Any]]:
        """
        Lecture légère depuis mxwo pour obtenir les workorderid.
        """
        url = f"{MAXIMO_BASE_URL.rstrip('/')}/oslc/os/mxwo"

        params = {
            "lean": "1",
            "oslc.pageSize": page_size,
            "oslc.where": f'siteid="{siteid}"',
            "oslc.select": (
                "wonum,siteid,workorderid,description,assetnum,location"
            ),
        }

        response = self.client.get(
            url,
            params=params,
            headers={"Accept": "application/json"},
        )

        if response.status_code >= 400:
            raise RuntimeError(
                f"Erreur GET mxwo HTTP {response.status_code}: {response.text}"
            )

        data = response.json()
        return _get_members(data)

    def get_plan_from_mxwo_by_wonum(
        self,
        wonum: str,
        siteid: str,
    ) -> Optional[Dict[str, Any]]:
        """
        mxwo retourne généralement woactivity et wpmaterial.
        """
        if not wonum:
            return None

        url = f"{MAXIMO_BASE_URL.rstrip('/')}/oslc/os/mxwo"

        params = {
            "lean": "1",
            "oslc.pageSize": 1,
            "oslc.where": f'wonum="{wonum}" and siteid="{siteid}"',
            "oslc.select": (
                "href,wonum,workorderid,description,siteid,assetnum,location,"
                "woactivity{href,taskid,description,status,labhrs},"
                "wpmaterial{taskid,itemnum,description,itemqty,quantity,qty,location,barcode},"
                "wplabor{taskid,laborcode,description,labhrs,regularhrs,laborhrs,quantity}"
            ),
        }

        response = self.client.get(
            url,
            params=params,
            headers={"Accept": "application/json"},
        )

        if response.status_code >= 400:
            raise RuntimeError(
                f"Erreur GET mxwo wonum={wonum} HTTP {response.status_code}: {response.text}"
            )

        data = response.json()
        members = _get_members(data)

        if not members:
            return None

        return members[0]

    def get_plan_by_workorderid(
        self,
        workorderid: Any,
    ) -> Optional[Dict[str, Any]]:
        """
        SM1120/{workorderid} retourne chez toi wplabor.
        Exemple confirmé :
        /maximo/oslc/os/SM1120/148688?lean=1
        """
        if not workorderid:
            return None

        url = f"{MAXIMO_BASE_URL.rstrip('/')}/oslc/os/{MAXIMO_PLAN_OS}/{workorderid}"

        params = {
            "lean": "1",
            "oslc.select": (
                "href,wonum,workorderid,description,siteid,assetnum,location,"
                "woactivity{href,taskid,description,status,labhrs},"
                "wplabor{laborcode,laborhrs,quantity,wplaborid,wplaboruid,siteid,displaywonum,wonum},"
                "wpmaterial{description,quantity,itemnum,location,barcode}"
            ),
        }

        response = self.client.get(
            url,
            params=params,
            headers={"Accept": "application/json"},
        )

        if response.status_code == 404:
            return None

        if response.status_code >= 400:
            raise RuntimeError(
                f"Erreur GET {MAXIMO_PLAN_OS}/{workorderid} "
                f"HTTP {response.status_code}: {response.text}"
            )

        return response.json()

    def close(self):
        self.client.close()


def _merge_plan_data(
    wo_ref: Dict[str, Any],
    wo_mxwo: Optional[Dict[str, Any]],
    wo_sm1120: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Combine les infos :
    - mxwo : woactivity + wpmaterial
    - SM1120 : wplabor
    """
    merged: Dict[str, Any] = {
        **(wo_ref or {}),
        **(wo_mxwo or {}),
        **(wo_sm1120 or {}),
    }

    if wo_mxwo:
        if wo_mxwo.get("woactivity"):
            merged["woactivity"] = wo_mxwo.get("woactivity")

        if wo_mxwo.get("wpmaterial"):
            merged["wpmaterial"] = wo_mxwo.get("wpmaterial")

    if wo_sm1120:
        if wo_sm1120.get("wplabor"):
            merged["wplabor"] = wo_sm1120.get("wplabor")

        # Sécurité si SM1120 expose un jour aussi ces collections.
        if not merged.get("woactivity") and wo_sm1120.get("woactivity"):
            merged["woactivity"] = wo_sm1120.get("woactivity")

        if not merged.get("wpmaterial") and wo_sm1120.get("wpmaterial"):
            merged["wpmaterial"] = wo_sm1120.get("wpmaterial")

    return merged


def sync_maximo_planned_resources(
    siteid: Optional[str] = None,
    page_size: int = 20,
) -> Dict[str, Any]:
    db = _db()
    client = MaximoPlanClient()

    final_siteid = siteid or MAXIMO_SITEID

    try:
        print("SYNC MAXIMO PLANS - start")
        print("SYNC MAXIMO PLANS - siteid:", final_siteid)
        print("SYNC MAXIMO PLANS - page_size:", page_size)

        client.login()
        print("SYNC MAXIMO PLANS - login ok")

        wo_refs = client.get_workorder_ids(
            siteid=final_siteid,
            page_size=page_size,
        )

        print("SYNC MAXIMO PLANS - mxwo read:", len(wo_refs))

        activity_ops: List[UpdateOne] = []
        material_ops: List[UpdateOne] = []
        labor_ops: List[UpdateOne] = []

        workorders_read = 0
        workorders_plan_read = 0
        activity_count = 0
        material_count = 0
        labor_count = 0
        errors: List[Dict[str, Any]] = []

        for index, wo_ref in enumerate(wo_refs, start=1):
            workorders_read += 1

            workorderid = wo_ref.get("workorderid")
            wonum_ref = _clean(wo_ref.get("wonum"))

            print(
                f"SYNC MAXIMO PLANS - {index}/{len(wo_refs)} "
                f"wonum={wonum_ref} workorderid={workorderid}"
            )

            wo_mxwo = None
            wo_sm1120 = None

            try:
                wo_mxwo = client.get_plan_from_mxwo_by_wonum(
                    wonum=wonum_ref,
                    siteid=final_siteid,
                )
            except Exception as exc:
                errors.append(
                    {
                        "wonum": wonum_ref,
                        "workorderid": workorderid,
                        "source": "mxwo",
                        "error": str(exc),
                    }
                )

            try:
                wo_sm1120 = client.get_plan_by_workorderid(workorderid)
            except Exception as exc:
                errors.append(
                    {
                        "wonum": wonum_ref,
                        "workorderid": workorderid,
                        "source": MAXIMO_PLAN_OS,
                        "error": str(exc),
                    }
                )

            if not wo_mxwo and not wo_sm1120:
                continue

            workorders_plan_read += 1

            wo = _merge_plan_data(
                wo_ref=wo_ref,
                wo_mxwo=wo_mxwo,
                wo_sm1120=wo_sm1120,
            )

            print(
                "PLAN COUNTS:",
                wonum_ref,
                "activities=", len(_to_array(wo.get("woactivity"))),
                "materials=", len(_to_array(wo.get("wpmaterial"))),
                "labor=", len(_to_array(wo.get("wplabor"))),
            )

            wonum = _clean(wo.get("wonum") or wo_ref.get("wonum"))
            wo_description = _clean(
                wo.get("description") or wo_ref.get("description")
            )
            wo_siteid = _clean(
                wo.get("siteid") or wo_ref.get("siteid") or final_siteid
            )
            assetnum = _clean(wo.get("assetnum") or wo_ref.get("assetnum"))
            location = _clean(wo.get("location") or wo_ref.get("location"))

            base_search = _search_text(
                wonum,
                wo_description,
                wo_siteid,
                assetnum,
                location,
            )

            for activity in _to_array(wo.get("woactivity")):
                if not isinstance(activity, dict):
                    continue

                taskid = _clean(activity.get("taskid"))
                description = _clean(activity.get("description"))
                status = _clean(activity.get("status") or "WAPPR")
                labhrs = _to_float(activity.get("labhrs"), 0.0)
                href = _clean(activity.get("href"))

                if not description:
                    continue

                activity_count += 1

                doc = {
                    "wonum": wonum,
                    "workorderid": workorderid,
                    "siteid": wo_siteid,
                    "assetnum": assetnum,
                    "wo_location": location,
                    "wo_description": wo_description,
                    "taskid": taskid,
                    "description": description,
                    "status": status,
                    "labhrs": labhrs,
                    "href": href,
                    "search_text": _search_text(
                        base_search,
                        taskid,
                        description,
                        status,
                        labhrs,
                    ),
                    "source": "maximo_woactivity",
                    "synced_at": datetime.now(timezone.utc),
                    "raw": activity,
                }

                activity_ops.append(
                    UpdateOne(
                        {
                            "wonum": wonum,
                            "siteid": wo_siteid,
                            "taskid": taskid,
                            "description": description,
                        },
                        {"$set": doc},
                        upsert=True,
                    )
                )

            for material in _to_array(wo.get("wpmaterial")):
                if not isinstance(material, dict):
                    continue

                itemnum = _clean(material.get("itemnum"))
                description = _clean(material.get("description"))
                mat_location = _clean(material.get("location"))
                barcode = _clean(material.get("barcode"))

                quantity = _to_float(
                    material.get("quantity")
                    or material.get("itemqty")
                    or material.get("qty"),
                    1.0,
                )

                taskid = _clean(material.get("taskid"))

                if not itemnum and not description:
                    continue

                material_count += 1

                doc = {
                    "wonum": wonum,
                    "workorderid": workorderid,
                    "siteid": wo_siteid,
                    "assetnum": assetnum,
                    "wo_location": location,
                    "wo_description": wo_description,
                    "taskid": taskid,
                    "itemnum": itemnum,
                    "description": description,
                    "quantity": quantity,
                    "location": mat_location,
                    "barcode": barcode,
                    "search_text": _search_text(
                        base_search,
                        taskid,
                        itemnum,
                        description,
                        mat_location,
                        barcode,
                    ),
                    "source": "maximo_wpmaterial",
                    "synced_at": datetime.now(timezone.utc),
                    "raw": material,
                }

                material_ops.append(
                    UpdateOne(
                        {
                            "wonum": wonum,
                            "siteid": wo_siteid,
                            "taskid": taskid,
                            "itemnum": itemnum,
                            "description": description,
                            "barcode": barcode,
                        },
                        {"$set": doc},
                        upsert=True,
                    )
                )

            for labor in _to_array(wo.get("wplabor")):
                if not isinstance(labor, dict):
                    continue

                laborcode = _clean(labor.get("laborcode"))
                laborhrs = _to_float(
                    labor.get("laborhrs")
                    or labor.get("labhrs")
                    or labor.get("regularhrs"),
                    0.0,
                )
                quantity = _to_float(labor.get("quantity"), 1.0)
                wplaborid = labor.get("wplaborid")
                wplaboruid = labor.get("wplaboruid")
                taskid = _clean(labor.get("taskid"))
                labor_siteid = _clean(labor.get("siteid") or wo_siteid)

                if not laborcode:
                    continue

                labor_count += 1

                doc = {
                    "wonum": wonum,
                    "workorderid": workorderid,
                    "siteid": labor_siteid,
                    "assetnum": assetnum,
                    "wo_location": location,
                    "wo_description": wo_description,
                    "taskid": taskid,
                    "laborcode": laborcode,
                    "laborhrs": laborhrs,
                    "quantity": quantity,
                    "wplaborid": wplaborid,
                    "wplaboruid": wplaboruid,
                    "search_text": _search_text(
                        base_search,
                        taskid,
                        laborcode,
                        laborhrs,
                        quantity,
                    ),
                    "source": "maximo_wplabor",
                    "synced_at": datetime.now(timezone.utc),
                    "raw": labor,
                }

                labor_ops.append(
                    UpdateOne(
                        {
                            "wonum": wonum,
                            "siteid": labor_siteid,
                            "laborcode": laborcode,
                            "wplaborid": wplaborid,
                            "wplaboruid": wplaboruid,
                        },
                        {"$set": doc},
                        upsert=True,
                    )
                )

        if activity_ops:
            db.maximo_woactivity_examples.bulk_write(activity_ops)

        if material_ops:
            db.maximo_wpmaterial_examples.bulk_write(material_ops)

        if labor_ops:
            db.maximo_wplabor_examples.bulk_write(labor_ops)

        db.maximo_woactivity_examples.create_index("search_text")
        db.maximo_woactivity_examples.create_index("taskid")
        db.maximo_woactivity_examples.create_index("siteid")
        db.maximo_woactivity_examples.create_index("assetnum")

        db.maximo_wpmaterial_examples.create_index("search_text")
        db.maximo_wpmaterial_examples.create_index("itemnum")
        db.maximo_wpmaterial_examples.create_index("siteid")
        db.maximo_wpmaterial_examples.create_index("assetnum")

        db.maximo_wplabor_examples.create_index("search_text")
        db.maximo_wplabor_examples.create_index("laborcode")
        db.maximo_wplabor_examples.create_index("siteid")
        db.maximo_wplabor_examples.create_index("assetnum")

        return {
            "success": True,
            "source": {
                "activities_materials": "mxwo",
                "labor": MAXIMO_PLAN_OS,
            },
            "siteid": final_siteid,
            "workorders_read": workorders_read,
            "workorders_plan_read": workorders_plan_read,
            "activities_found": activity_count,
            "materials_found": material_count,
            "labor_found": labor_count,
            "activities_upserted_or_updated": len(activity_ops),
            "materials_upserted_or_updated": len(material_ops),
            "labor_upserted_or_updated": len(labor_ops),
            "errors": errors[:20],
            "collections": [
                "maximo_woactivity_examples",
                "maximo_wpmaterial_examples",
                "maximo_wplabor_examples",
            ],
        }

    finally:
        client.close()