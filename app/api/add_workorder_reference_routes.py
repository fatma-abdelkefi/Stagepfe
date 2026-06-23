from typing import Any, Dict, List

from fastapi import APIRouter, Query
from pymongo import MongoClient

from app.core.config import MONGO_DB_NAME, MONGO_URI

router = APIRouter(prefix="/add-workorder/reference", tags=["Add WorkOrder Reference"])


def _db():
    client = MongoClient(MONGO_URI)
    return client[MONGO_DB_NAME]


def _normalize(value: Any) -> str:
    return str(value or "").strip()


@router.get("/priorities")
def get_priorities(q: str = Query(default="")) -> Dict[str, List[Dict[str, Any]]]:
    items = [
        {"value": 1, "label": "1 - Urgent / Critique"},
        {"value": 2, "label": "2 - Haute"},
        {"value": 3, "label": "3 - Normale"},
        {"value": 4, "label": "4 - Basse"},
    ]

    query = q.strip().lower()

    if query:
        items = [
            item
            for item in items
            if query in str(item["value"]).lower()
            or query in item["label"].lower()
        ]

    return {"items": items}


@router.get("/worktypes")
def get_worktypes(q: str = Query(default="")) -> Dict[str, List[Dict[str, Any]]]:
    items = [
        {"value": "CM", "label": "CM - Maintenance corrective"},
        {"value": "PM", "label": "PM - Maintenance préventive"},
        {"value": "EM", "label": "EM - Maintenance urgente"},
    ]

    query = q.strip().lower()

    if query:
        items = [
            item
            for item in items
            if query in item["value"].lower()
            or query in item["label"].lower()
        ]

    return {"items": items}


@router.get("/materials")
def get_materials(
    q: str = Query(default=""),
    limit: int = Query(default=20),
) -> Dict[str, List[Dict[str, Any]]]:
    db = _db()

    query = q.strip()

    mongo_query: Dict[str, Any] = {}

    if query:
        mongo_query = {
            "$or": [
                {"itemnum": {"$regex": query, "$options": "i"}},
                {"description": {"$regex": query, "$options": "i"}},
                {"search_text": {"$regex": query, "$options": "i"}},
            ]
        }

    docs = list(
        db.maximo_wpmaterial_examples.find(mongo_query)
        .limit(limit)
    )

    seen = set()
    items: List[Dict[str, Any]] = []

    for doc in docs:
        itemnum = _normalize(doc.get("itemnum"))
        description = _normalize(doc.get("description"))
        location = _normalize(doc.get("location"))

        key = (itemnum, description, location)

        if key in seen:
            continue

        seen.add(key)

        items.append(
            {
                "itemnum": itemnum,
                "description": description,
                "quantity": doc.get("quantity") or 1,
                "location": location,
            }
        )

    return {"items": items}


@router.get("/labor")
def get_labor(
    q: str = Query(default=""),
    limit: int = Query(default=20),
) -> Dict[str, List[Dict[str, Any]]]:
    db = _db()

    query = q.strip()

    mongo_query: Dict[str, Any] = {}

    if query:
        mongo_query = {
            "$or": [
                {"laborcode": {"$regex": query, "$options": "i"}},
                {"search_text": {"$regex": query, "$options": "i"}},
            ]
        }

    docs = list(
        db.maximo_wplabor_examples.find(mongo_query)
        .limit(limit)
    )

    seen = set()
    items: List[Dict[str, Any]] = []

    for doc in docs:
        laborcode = _normalize(doc.get("laborcode"))

        if not laborcode:
            continue

        if laborcode in seen:
            continue

        seen.add(laborcode)

        items.append(
            {
                "laborcode": laborcode,
                "laborhrs": doc.get("laborhrs") or 1,
                "quantity": doc.get("quantity") or 1,
            }
        )

    return {"items": items}