import hashlib
from datetime import datetime
from typing import Any, Dict, Optional

from pymongo import MongoClient, ASCENDING

from app.core.config import MONGO_URI, MONGO_DB, MONGO_COLLECTION


def normalize_text(value: Any) -> str:
    return (
        str(value or "")
        .strip()
        .lower()
        .replace("œ", "oe")
        .replace("’", "'")
        .replace("é", "e")
        .replace("è", "e")
        .replace("ê", "e")
        .replace("ë", "e")
        .replace("à", "a")
        .replace("â", "a")
        .replace("ù", "u")
        .replace("û", "u")
        .replace("î", "i")
        .replace("ï", "i")
        .replace("ô", "o")
        .replace("ç", "c")
    )


def get_collection():
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")

    col = client[MONGO_DB][MONGO_COLLECTION]

    existing_indexes = col.index_information()

    if "example_hash_1" not in existing_indexes:
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

    if "task_1" not in existing_indexes:
        col.create_index([("task", ASCENDING)])

    if "source_1" not in existing_indexes:
        col.create_index([("source", ASCENDING)])

    if "created_at_1" not in existing_indexes:
        col.create_index([("created_at", ASCENDING)])

    return col
def build_failure_example_hash(
    text: str,
    failure_class: str,
    problem: str,
    cause: str,
    remedy: str,
) -> str:
    raw = "|".join(
        [
            normalize_text(text),
            normalize_text(failure_class),
            normalize_text(problem),
            normalize_text(cause),
            normalize_text(remedy),
        ]
    )

    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def normalize_failure_example(payload: Dict[str, Any]) -> Dict[str, Any]:
    text = (
        payload.get("text")
        or payload.get("description")
        or payload.get("request")
        or ""
    )

    failure = payload.get("failure") if isinstance(payload.get("failure"), dict) else {}

    failure_class = (
        payload.get("failure_class")
        or payload.get("failurecode")
        or failure.get("failure_class")
        or failure.get("failurecode")
        or ""
    )

    problem = (
        payload.get("problem")
        or payload.get("problemcode")
        or failure.get("problem")
        or failure.get("problemcode")
        or ""
    )

    cause = payload.get("cause") or failure.get("cause") or ""
    remedy = payload.get("remedy") or failure.get("remedy") or ""

    return {
        "text": str(text or "").strip(),
        "failure_class": str(failure_class or "").strip(),
        "problem": str(problem or "").strip(),
        "cause": str(cause or "").strip(),
        "remedy": str(remedy or "").strip(),
        "assetnum": payload.get("assetnum") or "",
        "location": payload.get("location") or "",
        "siteid": payload.get("siteid") or "BEDFORD",
        "wonum": payload.get("wonum") or "",
        "description": payload.get("description") or text or "",
        "details": payload.get("details") or "",
        "asset_description": payload.get("asset_description") or "",
        "metadata": payload.get("metadata") or {},
    }


def add_failure_reporting_example(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Ajoute un exemple Failure Reporting confirmé dans MongoDB sans doublon.
    Utiliser cette fonction après validation/correction par l'utilisateur.
    """

    example = normalize_failure_example(payload)

    required_fields = ["text", "failure_class", "problem", "cause", "remedy"]

    missing = [
        field
        for field in required_fields
        if not example.get(field) or not str(example.get(field)).strip()
    ]

    if missing:
        return {
            "success": False,
            "inserted": False,
            "duplicate": False,
            "error": f"Missing required fields: {missing}",
        }

    example_hash = build_failure_example_hash(
        text=example["text"],
        failure_class=example["failure_class"],
        problem=example["problem"],
        cause=example["cause"],
        remedy=example["remedy"],
    )

    col = get_collection()

    existing = col.find_one({"example_hash": example_hash})

    if existing:
        return {
            "success": True,
            "inserted": False,
            "duplicate": True,
            "message": "Example already exists in MongoDB.",
            "example_hash": example_hash,
            "id": str(existing.get("_id")),
        }

    document = {
        "task": "failure_reporting",
        "source": payload.get("source") or "mobile_confirmed_failure",
        "example_hash": example_hash,
        "text": example["text"],
        "description": example["description"],
        "details": example["details"],
        "assetnum": example["assetnum"],
        "asset_description": example["asset_description"],
        "location": example["location"],
        "siteid": example["siteid"],
        "wonum": example["wonum"],
        "failure": {
            "failure_class": example["failure_class"],
            "problem": example["problem"],
            "cause": example["cause"],
            "remedy": example["remedy"],
        },
        "failure_class": example["failure_class"],
        "problem": example["problem"],
        "cause": example["cause"],
        "remedy": example["remedy"],
        "metadata": example["metadata"],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    result = col.insert_one(document)

    return {
        "success": True,
        "inserted": True,
        "duplicate": False,
        "message": "Failure Reporting example inserted in MongoDB.",
        "example_hash": example_hash,
        "id": str(result.inserted_id),
    }


def find_similar_failure_examples(text: str, limit: int = 5) -> list[dict]:
    """
    Recherche simple MongoDB pour savoir si des exemples similaires existent.
    Cette fonction sert pendant la prédiction pour enrichir/debugger.
    """

    clean = normalize_text(text)

    if not clean:
        return []

    keywords = [
        word
        for word in clean.split()
        if len(word) >= 4
    ][:8]

    query = {
        "task": "failure_reporting",
    }

    if keywords:
        query["$or"] = [
            {"text": {"$regex": kw, "$options": "i"}}
            for kw in keywords
        ]

    col = get_collection()

    docs = list(
        col.find(query)
        .sort("created_at", -1)
        .limit(limit)
    )

    results = []

    for doc in docs:
        results.append(
            {
                "text": doc.get("text"),
                "failure_class": doc.get("failure_class")
                or (doc.get("failure") or {}).get("failure_class"),
                "problem": doc.get("problem")
                or (doc.get("failure") or {}).get("problem"),
                "cause": doc.get("cause")
                or (doc.get("failure") or {}).get("cause"),
                "remedy": doc.get("remedy")
                or (doc.get("failure") or {}).get("remedy"),
                "source": doc.get("source"),
                "example_hash": doc.get("example_hash"),
            }
        )

    return results