import re
from difflib import SequenceMatcher
from typing import Any

from pymongo import MongoClient

from app.core.config import MONGO_URI, MONGO_DB, MONGO_COLLECTION


_client = None
_assets_cache = None


def safe(value: Any) -> str:
    return "" if value is None else str(value).strip()


def normalize_text(value: Any) -> str:
    text = safe(value).lower()

    replacements = {
        "é": "e",
        "è": "e",
        "ê": "e",
        "à": "a",
        "ç": "c",
        "ù": "u",
        "î": "i",
        "ô": "o",
        "’": "'",
        "œ": "oe",
        "conveyor": "convoyeur",
        "convoyer": "convoyeur",
        "con voyageur": "convoyeur",
        "qu'on voyeur": "convoyeur",
        "fouille douille": "fuite huile",
        "fouille d'oeil": "fuite huile",
        "fuite d'huile": "fuite huile",
        "fuite d huile": "fuite huile",
        "fuite de huile": "fuite huile",
        "annormale": "anormale",
        "anormal": "anormale",
        "convoyer": "convoyeur",
        "con voyer": "convoyeur",
        "anorme": "anormale",
        "anormee": "anormale",
        "anormalee": "anormale",
        "fouille de huile": "fuite huile",
        "fouille huile": "fuite huile",
    }

    for old, new in replacements.items():
        text = text.replace(old, new)

    text = re.sub(r"[^a-z0-9\s\-_/#]", " ", text)
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def get_collection():
    global _client

    if _client is None:
        _client = MongoClient(MONGO_URI)

    return _client[MONGO_DB][MONGO_COLLECTION]


def get_all_assets(force: bool = False) -> list[dict]:
    global _assets_cache

    if _assets_cache is not None and not force:
        return _assets_cache

    col = get_collection()

    pipeline = [
        {
            "$match": {
                "$or": [
                    {"assetnum": {"$exists": True, "$ne": ""}},
                    {"asset.assetnum": {"$exists": True, "$ne": ""}},
                    {"related_workorder.assetnum": {"$exists": True, "$ne": ""}},
                ]
            }
        },
        {
            "$project": {
                "assetnum": {
                    "$ifNull": [
                        "$asset.assetnum",
                        {
                            "$ifNull": [
                                "$related_workorder.assetnum",
                                "$assetnum",
                            ]
                        },
                    ]
                },
                "description": {
                    "$ifNull": [
                        "$asset.description",
                        {
                            "$ifNull": [
                                "$related_workorder.asset_description",
                                "$description",
                            ]
                        },
                    ]
                },
                "location": {
                    "$ifNull": [
                        "$related_workorder.location",
                        "$location",
                    ]
                },
                "siteid": "$siteid",
            }
        },
        {
            "$group": {
                "_id": "$assetnum",
                "assetnum": {"$first": "$assetnum"},
                "description": {"$first": "$description"},
                "location": {"$first": "$location"},
                "siteid": {"$first": "$siteid"},
                "samples_count": {"$sum": 1},
            }
        },
        {"$sort": {"samples_count": -1}},
        {"$project": {"_id": 0}},
    ]

    _assets_cache = list(col.aggregate(pipeline))
    return _assets_cache


def contains_any(text: str, words: list[str]) -> bool:
    return any(word in text for word in words)


def similarity(a: str, b: str) -> float:
    a = normalize_text(a)
    b = normalize_text(b)

    if not a or not b:
        return 0.0

    return SequenceMatcher(None, a, b).ratio()


def detect_keywords(text: str) -> list[str]:
    n = normalize_text(text)
    keywords = []

    rules = {
        "convoyeur": ["convoyeur", "conveyor"],
        "moteur": ["moteur", "motor", "drive"],
        "pompe": ["pompe", "pump"],
        "generateur": ["generateur", "generator"],
        "climatiseur": ["climatiseur", "air conditioner", "ac"],
        "roulement": ["roulement", "bearing"],
        "reducteur": ["reducteur", "gearbox"],
        "fuite": ["fuite", "huile", "lubrification"],
        "vibration": ["vibration", "vibre"],
        "bruit": ["bruit", "noise"],
    }

    for label, values in rules.items():
        if contains_any(n, values):
            keywords.append(label)

    return keywords


def score_asset(asset: dict, text: str) -> int:
    n = normalize_text(text)

    assetnum = normalize_text(asset.get("assetnum"))
    description = normalize_text(asset.get("description"))
    location = normalize_text(asset.get("location"))

    haystack = f"{assetnum} {description} {location}"

    score = 0

    system_number = detect_system_number(text)

    if system_number == "1":
        if any(x in haystack for x in ["#1", "system 1", "systeme 1"]):
            score += 40
        if any(x in haystack for x in ["#2", "system 2", "systeme 2"]):
            score -= 40

    if system_number == "2":
        if any(x in haystack for x in ["#2", "system 2", "systeme 2"]):
            score += 40
        if any(x in haystack for x in ["#1", "system 1", "systeme 1"]):
            score -= 40

    keywords = detect_keywords(n)

    for kw in keywords:
        if kw == "convoyeur" and contains_any(haystack, ["convoyeur", "conveyor"]):
            score += 20

        if kw == "moteur" and contains_any(haystack, ["moteur", "motor", "drive"]):
            score += 18

        if kw == "pompe" and contains_any(haystack, ["pompe", "pump"]):
            score += 18

        if kw == "generateur" and contains_any(haystack, ["generateur", "generator"]):
            score += 18

        if kw == "climatiseur" and contains_any(haystack, ["climatiseur", "air conditioner", "ac"]):
            score += 18

        if kw == "roulement" and contains_any(haystack, ["roulement", "bearing"]):
            score += 12

        if kw == "reducteur" and contains_any(haystack, ["reducteur", "gearbox"]):
            score += 12

        if kw == "fuite" and contains_any(
            haystack,
            ["huile", "lub", "moteur", "motor", "pompe", "pump"],
        ):
            score += 6

        if kw == "vibration" and contains_any(
            haystack,
            ["moteur", "motor", "drive", "pompe", "pump", "convoyeur", "conveyor"],
        ):
            score += 6

        if kw == "bruit" and contains_any(
            haystack,
            ["moteur", "motor", "drive", "pompe", "pump", "roulement", "bearing"],
        ):
            score += 6

    if "convoyeur" in n and not contains_any(haystack, ["convoyeur", "conveyor"]):
        score -= 25

    if "moteur" in n and not contains_any(haystack, ["moteur", "motor", "drive"]):
        score -= 15

    if "pompe" in n and not contains_any(haystack, ["pompe", "pump"]):
        score -= 20

    for token in n.split():
        if len(token) >= 4 and token in haystack:
            score += 2

    score += int(similarity(n, haystack) * 8)

    return score
def detect_system_number(text: str) -> str:
    n = normalize_text(text)
    

    if any(x in n for x in ["numero 1", "num 1", "systeme 1", "system 1", "#1"]):
        return "1"

    if any(x in n for x in ["numero 2", "num 2", "systeme 2", "system 2", "#2"]):
        return "2"

    return ""


def match_assets_from_mongodb(text: str, limit: int = 5, min_score: int = 10) -> list[dict]:
    assets = get_all_assets()

    scored = []

    for asset in assets:
        score = score_asset(asset, text)

        if score >= min_score:
            scored.append(
                {
                    "assetnum": safe(asset.get("assetnum")),
                    "description": safe(asset.get("description")),
                    "location": safe(asset.get("location")),
                    "siteid": safe(asset.get("siteid")),
                    "source": "mongodb_assets",
                    "score": score,
                }
            )

    scored.sort(key=lambda x: x["score"], reverse=True)

    return scored[:limit]