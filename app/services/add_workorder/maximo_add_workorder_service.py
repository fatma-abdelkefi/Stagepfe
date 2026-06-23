import base64
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import (
    MAXIMO_BASE_URL,
    MAXIMO_PASSWORD,
    MAXIMO_SITEID,
    MAXIMO_USERNAME,
)


MAXIMO_ADD_WO_OS = "mxwo"


def _make_maxauth(username: str, password: str) -> str:
    raw = f"{username}:{password}".encode("utf-8")
    return base64.b64encode(raw).decode("utf-8")


def _clean(value: Any) -> str:
    return str(value or "").strip()


def _to_number(value: Any, default: float = 0.0) -> float:
    if value is None or value == "":
        return default

    try:
        return float(str(value).replace(",", "."))
    except Exception:
        return default


def _to_long(value: Any, default: int = 1) -> int:
    if value is None or value == "":
        return default

    try:
        return int(float(str(value).replace(",", ".")))
    except Exception:
        return default


def _to_priority(value: Any) -> Optional[int]:
    if value is None or value == "":
        return None

    try:
        return int(float(str(value).replace(",", ".")))
    except Exception:
        return None


def _to_maximo_datetime(value: Any) -> str:
    text = _clean(value)

    if not text:
        return ""

    if "T" in text:
        return text

    formats = [
        "%d/%m/%Y %H:%M",
        "%d/%m/%Y %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d %H:%M:%S",
    ]

    for fmt in formats:
        try:
            dt = datetime.strptime(text, fmt)
            return dt.strftime("%Y-%m-%dT%H:%M:%S")
        except Exception:
            pass

    return ""
def _not_empty_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    return {
        key: value
        for key, value in data.items()
        if value is not None and value != "" and value != []
    }


def _force_quantity_long(value: Any) -> Any:
    if isinstance(value, list):
        return [_force_quantity_long(item) for item in value]

    if isinstance(value, dict):
        clean_dict: Dict[str, Any] = {}

        for key, item_value in value.items():
            if str(key).lower() == "quantity":
                clean_dict[key] = _to_long(item_value, 1)
            else:
                clean_dict[key] = _force_quantity_long(item_value)

        return clean_dict

    return value


def _normalize_maximo_url(url: Optional[str]) -> Optional[str]:
    if not url:
        return None

    clean_url = str(url).strip()

    if "/maximo" in clean_url:
        suffix = clean_url.split("/maximo", 1)[1]
        return f"{MAXIMO_BASE_URL.rstrip('/')}{suffix}"

    return clean_url


def _add_lean(url: str) -> str:
    if "lean=" in url:
        return url

    separator = "&" if "?" in url else "?"
    return f"{url}{separator}lean=1"


def _map_parent_workorder(workorder: Dict[str, Any]) -> Dict[str, Any]:
    reportedby = _clean(workorder.get("reportedby") or MAXIMO_USERNAME)
    owner = _clean(workorder.get("owner") or reportedby or MAXIMO_USERNAME).upper()

    scheduled_start = _to_maximo_datetime(
        workorder.get("scheduled_start")
        or workorder.get("scheduledStart")
        or workorder.get("schedstart")
    )

    scheduled_finish = _to_maximo_datetime(
        workorder.get("scheduled_finish")
        or workorder.get("scheduledFinish")
        or workorder.get("schedfinish")
    )

    payload = {
        "description": _clean(workorder.get("description")),
        "description_longdescription": _clean(
            workorder.get("long_description")
            or workorder.get("description_longdescription")
        ),
        "siteid": _clean(workorder.get("siteid") or MAXIMO_SITEID),
        "assetnum": _clean(workorder.get("assetnum")),
        "location": _clean(workorder.get("location")),
        "reportedby": reportedby,
        "owner": owner,
        "worktype": _clean(workorder.get("worktype")),
        "priority": _to_priority(workorder.get("priority")),

        # IMPORTANT : vrais champs Maximo affichés dans WOTRACK
        "schedstart": scheduled_start,
        "schedfinish": scheduled_finish,

        "status": _clean(workorder.get("status") or "WAPPR"),
    }

    return _not_empty_dict(payload)
def _map_activities(workorder: Dict[str, Any]) -> List[Dict[str, Any]]:
    result: List[Dict[str, Any]] = []

    for index, item in enumerate(workorder.get("activities") or [], start=1):
        if isinstance(item, str):
            description = _clean(item)
            taskid = str(index * 10)
        else:
            description = _clean(item.get("description"))
            taskid = _clean(item.get("taskid")) or str(index * 10)

        if not description:
            continue

        result.append(
            _not_empty_dict(
                {
                    "taskid": taskid,
                    "description": description,
                    "status": "WAPPR",
                }
            )
        )

    return result


def _map_materials(workorder: Dict[str, Any]) -> List[Dict[str, Any]]:
    result: List[Dict[str, Any]] = []

    for item in workorder.get("planned_materials") or []:
        if isinstance(item, str):
            continue

        if not isinstance(item, dict):
            continue

        itemnum = _clean(item.get("itemnum"))
        description = _clean(item.get("description"))
        location = _clean(item.get("location"))
        quantity = _to_long(item.get("quantity"), 1)

        if not itemnum:
            print(
                "SKIP WPMATERIAL WITHOUT ITEMNUM:",
                {
                    "description": description,
                    "quantity": quantity,
                    "location": location,
                },
            )
            continue

        if not location:
            print(
                "SKIP WPMATERIAL WITHOUT LOCATION:",
                {
                    "itemnum": itemnum,
                    "description": description,
                    "quantity": quantity,
                },
            )
            continue

        mapped = {
            "itemnum": itemnum,
            "description": description,
            "quantity": quantity,
            "location": location,
        }

        result.append(_not_empty_dict(mapped))

    return result


def _is_invalid_laborcode(value: Any) -> bool:
    code = _clean(value).upper()

    if not code:
        return True

    invalid = {
        "MECHANIC",
        "MECHANICS",
        "MECANICIEN",
        "MÉCANICIEN",
        "ELECTRICIAN",
        "ELECTRICIEN",
        "TECHNICIEN",
        "TECHNICIAN",
        "LABOR",
    }

    return code in invalid


def _map_labor(workorder: Dict[str, Any]) -> List[Dict[str, Any]]:
    result: List[Dict[str, Any]] = []

    for item in workorder.get("planned_labor") or []:
        if not isinstance(item, dict):
            continue

        laborcode = _clean(item.get("laborcode"))

        if _is_invalid_laborcode(laborcode):
            print(
                "SKIP WPLABOR INVALID LABORCODE:",
                {
                    "laborcode": laborcode,
                    "craft": item.get("craft"),
                    "laborhrs": item.get("laborhrs"),
                    "quantity": item.get("quantity"),
                },
            )
            continue

        result.append(
            _not_empty_dict(
                {
                    "laborcode": laborcode,
                    "laborhrs": _to_number(
                        item.get("laborhrs") or item.get("hours"),
                        1.0,
                    ),
                    "quantity": _to_long(item.get("quantity"), 1),
                }
            )
        )

    return result


class MaximoAddWorkOrderClient:
    def __init__(self):
        if not MAXIMO_USERNAME or not MAXIMO_PASSWORD:
            raise RuntimeError(
                "MAXIMO_USERNAME et MAXIMO_PASSWORD sont obligatoires dans .env"
            )

        self.client = httpx.Client(timeout=90.0, follow_redirects=True)
        self.maxauth = _make_maxauth(MAXIMO_USERNAME, MAXIMO_PASSWORD)

    def headers(self) -> Dict[str, str]:
        return {
            "MAXAUTH": self.maxauth,
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    def login(self) -> None:
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

    def create_parent(self, workorder: Dict[str, Any]) -> Dict[str, Any]:
        url = f"{MAXIMO_BASE_URL.rstrip('/')}/oslc/os/{MAXIMO_ADD_WO_OS}"

        payload = _map_parent_workorder(workorder)

        print("MAXIMO CREATE WO PAYLOAD:", payload)

        if not payload.get("description"):
            raise RuntimeError("La description est obligatoire.")

        response = self.client.post(
            url,
            params={"lean": "1"},
            headers=self.headers(),
            json=payload,
        )

        if response.status_code >= 400:
            raise RuntimeError(
                f"Erreur création Work Order Maximo HTTP {response.status_code}: {response.text}"
            )

        try:
            data = response.json()
        except Exception:
            data = {}

        href = (
            data.get("href")
            or response.headers.get("location")
            or response.headers.get("Location")
        )

        href = _normalize_maximo_url(href)

        full_data = self.read_created_workorder(href)

        wonum = (
            full_data.get("wonum")
            or data.get("wonum")
            or workorder.get("wonum")
        )

        siteid = (
            full_data.get("siteid")
            or data.get("siteid")
            or payload.get("siteid")
        )

        workorderid = (
            full_data.get("workorderid")
            or data.get("workorderid")
        )

        status = (
            full_data.get("status")
            or data.get("status")
            or payload.get("status")
            or "WAPPR"
        )

        return {
            "data": full_data or data,
            "href": href,
            "wonum": wonum,
            "siteid": siteid,
            "workorderid": workorderid,
            "status": status,
            "owner": full_data.get("owner") or payload.get("owner"),
        }

    def read_created_workorder(self, href: Optional[str]) -> Dict[str, Any]:
        href = _normalize_maximo_url(href)

        if not href:
            return {}

        url = _add_lean(href)

        response = self.client.get(
            url,
            headers={
                "Accept": "application/json",
                "MAXAUTH": self.maxauth,
            },
            params={
                "oslc.select": (
                    "href,wonum,workorderid,description,status,siteid,"
                    "assetnum,location,reportedby,owner,worktype,priority,"
                    "schedstart,schedfinish,scheduledstart,scheduledfinish,"
                    "woactivity{href,taskid,description,status,labhrs},"
                    "wpmaterial{itemnum,description,quantity,location},"
                    "wplabor{laborcode,laborhrs,quantity,wplaborid}"
                )
            },
        )

        if response.status_code >= 400:
            print(
                "READ CREATED WO ERROR:",
                response.status_code,
                response.text,
            )
            return {}

        try:
            return response.json()
        except Exception:
            return {}

    def patch_plans(self, href: Optional[str], workorder: Dict[str, Any]) -> None:
        href = _normalize_maximo_url(href)

        if not href:
            return

        activities = _map_activities(workorder)
        materials = _map_materials(workorder)
        labor = _map_labor(workorder)

        patch_payload = _not_empty_dict(
            {
                "woactivity": activities,
                "wpmaterial": materials,
                "wplabor": labor,
            }
        )

        if not patch_payload:
            return

        patch_payload = _force_quantity_long(patch_payload)

        print("MAXIMO PATCH PLANS PAYLOAD:", patch_payload)

        url = _add_lean(href)

        response = self.client.patch(
            url,
            headers=self.headers(),
            json=patch_payload,
        )

        if response.status_code < 400:
            return

        print("MAXIMO PATCH ERROR:", response.status_code, response.text)

        response2 = self.client.post(
            url,
            headers={
                **self.headers(),
                "x-method-override": "PATCH",
            },
            json=patch_payload,
        )

        if response2.status_code < 400:
            return

        print("MAXIMO POST PATCH ERROR:", response2.status_code, response2.text)

        raise RuntimeError(
            "Work Order créé, mais erreur ajout planning "
            f"HTTP {response2.status_code}: {response2.text}"
        )

    def close(self) -> None:
        self.client.close()


def create_workorder_in_maximo(workorder: Dict[str, Any]) -> Dict[str, Any]:
    client = MaximoAddWorkOrderClient()

    try:
        client.login()

        created = client.create_parent(workorder)

        client.patch_plans(created.get("href"), workorder)

        final_data = client.read_created_workorder(created.get("href"))

        wonum = (
            final_data.get("wonum")
            or created.get("wonum")
        )

        siteid = (
            final_data.get("siteid")
            or created.get("siteid")
            or workorder.get("siteid")
            or MAXIMO_SITEID
        )

        status = (
            final_data.get("status")
            or created.get("status")
            or workorder.get("status")
            or "WAPPR"
        )

        workorderid = (
            final_data.get("workorderid")
            or created.get("workorderid")
        )

        href = _normalize_maximo_url(created.get("href"))

        owner = (
            final_data.get("owner")
            or created.get("owner")
            or _clean(workorder.get("owner") or workorder.get("reportedby") or MAXIMO_USERNAME).upper()
        )

        return {
            "success": True,
            "message": "Work Order créé dans Maximo.",
            "wonum": wonum,
            "siteid": siteid,
            "workorderid": workorderid,
            "href": href,
            "owner": owner,
            "workorder": {
                **workorder,
                "wonum": wonum,
                "siteid": siteid,
                "status": status,
                "workorderid": workorderid,
                "href": href,
                "owner": owner,
                "scheduled_start": (
                    final_data.get("schedstart")
                    or final_data.get("scheduledstart")
                    or workorder.get("scheduled_start")
                ),
                "scheduled_finish": (
                    final_data.get("schedfinish")
                    or final_data.get("scheduledfinish")
                    or workorder.get("scheduled_finish")
                ),

                "schedstart": final_data.get("schedstart"),
                "schedfinish": final_data.get("schedfinish"),
                        },
            "raw": final_data,
        }

    finally:
        client.close()