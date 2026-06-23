from datetime import datetime, timezone
from hashlib import sha256
from typing import Any

from pymongo import MongoClient, ASCENDING

from app.core.config import MONGO_URI, MONGO_DB, MONGO_COLLECTION


def safe(value: Any) -> str:
    return "" if value is None else str(value).strip()


def get_collection():
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")

    col = client[MONGO_DB][MONGO_COLLECTION]

    try:
        col.drop_index("example_hash_1")
    except Exception:
        pass

    col.create_index(
        [("example_hash", ASCENDING)],
        unique=True,
        partialFilterExpression={
            "example_hash": {
                "$exists": True,
                "$type": "string",
            }
        },
    )

    col.create_index([("record_type", ASCENDING)])
    col.create_index([("labels.intent", ASCENDING)])

    return col
def normalize_text(value: Any) -> str:
    return " ".join(safe(value).lower().split())


def make_related_wo_hash(payload: dict) -> str:
    raw = "|".join(
        [
            normalize_text(payload.get("text")),
            str(bool(payload.get("needed"))).lower(),
            safe(payload.get("assetnum")).upper(),
            safe(payload.get("location")).upper(),
            normalize_text(payload.get("description")),
        ]
    )

    return sha256(raw.encode("utf-8")).hexdigest()


def add_related_workorder_example(payload: dict) -> dict:
    col = get_collection()

    example_hash = make_related_wo_hash(payload)

    existing = col.find_one({"example_hash": example_hash})
    if existing:
        return {
            "inserted": False,
            "message": "Related workorder example already exists.",
            "example_hash": example_hash,
        }

    now = datetime.now(timezone.utc)

    text = safe(payload.get("text"))
    needed = bool(payload.get("needed"))
    wonum = safe(payload.get("wonum"))
    siteid = safe(payload.get("siteid")) or "BEDFORD"
    description = safe(payload.get("description"))
    details = safe(payload.get("details"))
    assetnum = safe(payload.get("assetnum"))
    asset_description = safe(payload.get("asset_description"))
    location = safe(payload.get("location"))
    reason = safe(payload.get("reason"))

    doc = {
        "record_type": "validated_related_workorder_example",
        "source": "mobile_validation",
        "is_synthetic": False,
        "example_hash": example_hash,

        "wonum": f"RWO-VALIDATED-{example_hash[:8]}",
        "original_wonum": wonum,
        "siteid": siteid,
        "description": description,
        "longdescription": details,
        "location": location,
        "assetnum": assetnum,

        "asset": {
            "assetnum": assetnum,
            "description": asset_description,
            "location": location,
            "siteid": siteid,
        },

        "labels": {
            "intent": "related_workorder",
            "related_workorder_needed": needed,
            "assetnum": assetnum,
            "location": location,
        },

        "related_workorder": {
            "needed": needed,
            "description": description,
            "details": details,
            "assetnum": assetnum,
            "asset_description": asset_description,
            "location": location,
            "reason": reason,
        },

        "ml_training": {
            "related_workorder_ready": True,
            "task": "related_workorder_prediction",
            "input_text": text,
            "target": {
                "needed": needed,
                "assetnum": assetnum,
                "location": location,
            },
            "updated_at": now,
        },

        "search_text": " ".join(
            [
                text,
                description,
                details,
                assetnum,
                asset_description,
                location,
                reason,
            ]
        ).strip(),

        "created_at": now,
        "updated_at": now,
    }

    col.insert_one(doc)

    return {
        "inserted": True,
        "message": "Validated related workorder example added.",
        "example_hash": example_hash,
    }