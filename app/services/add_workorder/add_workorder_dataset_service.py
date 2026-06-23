import os
import re
from typing import Dict, Optional

from pymongo import MongoClient


MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "smartech_ai")


def get_database():
    client = MongoClient(MONGO_URI)
    return client[MONGO_DB_NAME]


def extract_assetnum_from_text(text: str) -> Optional[str]:
    if not text:
        return None

    upper_text = text.upper()

    patterns = [
        r"\b[A-Z]{1,5}\d{2,10}\b",
        r"\b\d{3,10}\b",
    ]

    for pattern in patterns:
        match = re.search(pattern, upper_text)
        if match:
            return match.group(0)

    return None


def clean_mongo_document(document: Optional[Dict]) -> Optional[Dict]:
    if not document:
        return None

    document["_id"] = str(document.get("_id"))
    return document


def find_asset_by_assetnum(assetnum: str) -> Optional[Dict]:
    if not assetnum:
        return None

    db = get_database()

    possible_collections = [
        "maximo_assets",
        "assets",
        "asset",
        "maximo_asset_dataset",
    ]

    for collection_name in possible_collections:
        if collection_name not in db.list_collection_names():
            continue

        collection = db[collection_name]

        query = {
            "$or": [
                {"assetnum": assetnum},
                {"assetnum": assetnum.upper()},
                {"assetnum": assetnum.lower()},
            ]
        }

        result = collection.find_one(query)
        if result:
            return clean_mongo_document(result)

    return None


def find_asset_by_keywords(text: str) -> Optional[Dict]:
    if not text:
        return None

    db = get_database()

    possible_collections = [
        "maximo_assets",
        "assets",
        "asset",
        "maximo_asset_dataset",
    ]

    lower_text = text.lower()
    keywords = []

    if "pompe" in lower_text or "pump" in lower_text:
        keywords.extend(["pompe", "pump", "centrifugal"])

    if "moteur" in lower_text or "motor" in lower_text:
        keywords.extend(["moteur", "motor"])

    if "convoyeur" in lower_text or "conveyor" in lower_text:
        keywords.extend(["convoyeur", "conveyor"])

    if "capteur" in lower_text or "sensor" in lower_text:
        keywords.extend(["capteur", "sensor"])

    if not keywords:
        return None

    regex = "|".join(keywords)

    for collection_name in possible_collections:
        if collection_name not in db.list_collection_names():
            continue

        collection = db[collection_name]

        result = collection.find_one(
            {
                "$or": [
                    {"description": {"$regex": regex, "$options": "i"}},
                    {"asset_description": {"$regex": regex, "$options": "i"}},
                    {"assetnum": {"$regex": regex, "$options": "i"}},
                    {"location": {"$regex": regex, "$options": "i"}},
                ]
            }
        )

        if result:
            return clean_mongo_document(result)

    return None


def find_validated_add_workorder_example(text: str) -> Optional[Dict]:
    if not text:
        return None

    db = get_database()
    collection_name = "validated_add_workorder_examples"

    if collection_name not in db.list_collection_names():
        return None

    collection = db[collection_name]

    important_words = [
        word for word in re.findall(r"\w+", text.lower())
        if len(word) >= 4
    ]

    if not important_words:
        return None

    regex = "|".join(important_words[:8])

    result = collection.find_one(
        {
            "$or": [
                {"text": {"$regex": regex, "$options": "i"}},
                {"description": {"$regex": regex, "$options": "i"}},
                {"long_description": {"$regex": regex, "$options": "i"}},
            ]
        }
    )

    if result:
        return clean_mongo_document(result)

    return None


def find_best_asset(text: str, context: Optional[Dict] = None) -> Optional[Dict]:
    context = context or {}

    context_assetnum = context.get("assetnum")
    if context_assetnum:
        asset = find_asset_by_assetnum(str(context_assetnum))
        if asset:
            return asset

    assetnum = extract_assetnum_from_text(text)
    if assetnum:
        asset = find_asset_by_assetnum(assetnum)
        if asset:
            return asset

    return find_asset_by_keywords(text)