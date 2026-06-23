import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from pymongo import MongoClient


MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "smartech_ai")

SOURCE_COLLECTIONS = [
    "training_samples",
    "raw_workorders",
]

TARGET_COLLECTION = "validated_add_workorder_examples"


def get_db():
    client = MongoClient(MONGO_URI)
    return client[MONGO_DB_NAME]


def safe_text(value: Any) -> str:
    return str(value or "").strip()


def first_non_empty(*values: Any) -> Optional[str]:
    for value in values:
        text = safe_text(value)
        if text:
            return text
    return None


def get_nested(doc: Dict, path: str) -> Any:
    current = doc

    for part in path.split("."):
        if not isinstance(current, dict):
            return None
        current = current.get(part)

    return current


def list_to_text(value: Any) -> str:
    if not value:
        return ""

    parts: List[str] = []

    if isinstance(value, list):
        for item in value:
            if isinstance(item, dict):
                parts.extend(
                    [
                        item.get("description"),
                        item.get("long_description"),
                        item.get("description_longdescription"),
                        item.get("longdescription"),
                        item.get("logtext"),
                        item.get("itemdesc"),
                        item.get("craft"),
                        item.get("laborcode"),
                    ]
                )
            else:
                parts.append(str(item))

    elif isinstance(value, dict):
        for item in value.values():
            if isinstance(item, (dict, list)):
                parts.append(list_to_text(item))
            else:
                parts.append(str(item))

    else:
        parts.append(str(value))

    return " ".join(safe_text(part) for part in parts if safe_text(part))


def normalize_priority(value: Any, text: str = "") -> int:
    try:
        priority = int(value)
        if priority in [1, 2, 3, 4]:
            return priority
    except Exception:
        pass

    lowered = text.lower()

    if any(
        word in lowered
        for word in [
            "urgent",
            "urgence",
            "critique",
            "danger",
            "arret production",
            "arrêt production",
            "down",
            "stopped",
            "shutdown",
        ]
    ):
        return 1

    if any(
        word in lowered
        for word in [
            "panne",
            "fuite",
            "leak",
            "surchauffe",
            "overheat",
            "vibration",
            "bruit anormal",
            "noise",
            "fault",
            "failure",
        ]
    ):
        return 2

    return 3


def normalize_worktype(value: Any, text: str = "") -> str:
    worktype = safe_text(value).upper()
    lowered = text.lower()

    if worktype in {"CM", "PM", "EM"}:
        return worktype

    if any(
        word in lowered
        for word in [
            "preventive",
            "préventive",
            "preventif",
            "inspection",
            "walking inspection",
            "bi weekly",
            "weekly",
            "monthly",
            "planifier",
            "periodic",
            "periodique",
        ]
    ):
        return "PM"

    if any(
        word in lowered
        for word in [
            "urgent",
            "urgence",
            "critique",
            "danger",
            "arret production",
            "arrêt production",
            "emergency",
        ]
    ):
        return "EM"

    return "CM"


def normalize_classification(value: Any, text: str = "", asset_description: str = "") -> str:
    classification = safe_text(value).upper()

    if classification:
        return classification

    lowered = f"{text} {asset_description}".lower()

    if any(
        word in lowered
        for word in [
            "motor",
            "moteur",
            "electrique",
            "électrique",
            "electrical",
            "surchauffe",
            "overheat",
            "cable",
            "câble",
            "voltage",
        ]
    ):
        return "ELECTRICAL"

    if any(
        word in lowered
        for word in [
            "pump",
            "pompe",
            "track",
            "convoyeur",
            "conveyor",
            "bearing",
            "bruit",
            "noise",
            "vibration",
            "fuite",
            "leak",
            "roulement",
            "joint",
            "mechanical",
        ]
    ):
        return "MECHANICAL"

    if any(
        word in lowered
        for word in [
            "sensor",
            "capteur",
            "plc",
            "signal",
            "instrument",
            "temperature",
            "pressure",
        ]
    ):
        return "INSTRUMENTATION"

    return "GENERAL"


def extract_assetnum(doc: Dict) -> Optional[str]:
    return first_non_empty(
        doc.get("assetnum"),
        get_nested(doc, "asset.assetnum"),
        get_nested(doc, "workorder.assetnum"),
        get_nested(doc, "labels.assetnum"),
    )


def extract_asset_description(doc: Dict) -> Optional[str]:
    return first_non_empty(
        doc.get("asset_description"),
        doc.get("assetDescription"),
        doc.get("assetdesc"),
        get_nested(doc, "asset.description"),
        get_nested(doc, "asset.asset_description"),
        get_nested(doc, "workorder.asset_description"),
        get_nested(doc, "labels.asset_description"),
    )


def extract_location(doc: Dict) -> Optional[str]:
    return first_non_empty(
        doc.get("location"),
        doc.get("location_description"),
        doc.get("locationDescription"),
        get_nested(doc, "asset.location"),
        get_nested(doc, "workorder.location"),
        get_nested(doc, "labels.location"),
    )


def extract_text_fields(doc: Dict) -> List[str]:
    return [
        doc.get("text"),
        doc.get("description"),
        doc.get("long_description"),
        doc.get("description_longdescription"),
        doc.get("longdescription"),
        doc.get("search_text"),
        get_nested(doc, "nlp.raw_text"),
        get_nested(doc, "nlp.cleaned_text"),
        get_nested(doc, "nlp.normalized_text"),
        get_nested(doc, "workorder.description"),
        get_nested(doc, "workorder.long_description"),
        get_nested(doc, "workorder.longdescription"),
        get_nested(doc, "workorder.description_longdescription"),
        get_nested(doc, "labels.description"),
        get_nested(doc, "labels.long_description"),
        get_nested(doc, "asset.description"),
        get_nested(doc, "asset.assetnum"),
        doc.get("wonum"),
        doc.get("origid"),
        doc.get("siteid"),
        list_to_text(doc.get("worklog")),
        list_to_text(doc.get("workLogs")),
        list_to_text(doc.get("failure")),
        list_to_text(doc.get("safety")),
    ]


def build_text(doc: Dict) -> str:
    parts = extract_text_fields(doc)
    return " ".join(safe_text(part) for part in parts if safe_text(part)).strip()


def build_description(doc: Dict, text: str, assetnum: Optional[str], asset_description: Optional[str]) -> str:
    description = first_non_empty(
        doc.get("description"),
        get_nested(doc, "workorder.description"),
        get_nested(doc, "labels.description"),
        get_nested(doc, "nlp.raw_text"),
        get_nested(doc, "nlp.cleaned_text"),
    )

    if description:
        return description[:120]

    if assetnum and asset_description:
        return f"Intervention sur {assetnum} - {asset_description}"[:120]

    if assetnum:
        return f"Intervention sur équipement {assetnum}"[:120]

    return text[:120]


def build_long_description(doc: Dict, text: str, description: str) -> str:
    return (
        first_non_empty(
            doc.get("long_description"),
            doc.get("description_longdescription"),
            doc.get("longdescription"),
            get_nested(doc, "workorder.long_description"),
            get_nested(doc, "workorder.longdescription"),
            get_nested(doc, "workorder.description_longdescription"),
            get_nested(doc, "labels.long_description"),
            get_nested(doc, "nlp.raw_text"),
            text,
            description,
        )
        or description
    )


def is_useful_example(example: Dict) -> bool:
    text = safe_text(example.get("text"))
    assetnum = safe_text(example.get("assetnum"))
    asset_description = safe_text(example.get("asset_description"))
    location = safe_text(example.get("location"))
    description = safe_text(example.get("description"))

    if len(text) < 10 and len(description) < 10:
        return False

    if not assetnum and not asset_description and not location:
        return False

    return True


def convert_document_to_add_workorder_example(doc: Dict) -> Optional[Dict]:
    text = build_text(doc)

    if len(text) < 10:
        return None

    assetnum = extract_assetnum(doc)
    asset_description = extract_asset_description(doc)
    location = extract_location(doc)

    description = build_description(
        doc=doc,
        text=text,
        assetnum=assetnum,
        asset_description=asset_description,
    )

    long_description = build_long_description(
        doc=doc,
        text=text,
        description=description,
    )

    priority = normalize_priority(
        doc.get("priority")
        or doc.get("wopriority")
        or doc.get("reportedpriority")
        or get_nested(doc, "workorder.priority"),
        text,
    )

    worktype = normalize_worktype(
        doc.get("worktype") or get_nested(doc, "workorder.worktype"),
        text,
    )

    classification = normalize_classification(
        doc.get("classification")
        or doc.get("classstructureid")
        or get_nested(doc, "workorder.classification")
        or get_nested(doc, "labels.classification"),
        text,
        asset_description or "",
    )

    example = {
        "text": text,
        "description": description,
        "long_description": long_description,
        "assetnum": assetnum,
        "asset_description": asset_description,
        "location": location,
        "priority": priority,
        "worktype": worktype,
        "classification": classification,

        # Ces champs sont vides dans training_samples.
        # Ils restent générés par règles métier dans add_workorder_rule_service.py.
        "activities": [],
        "planned_materials": [],
        "planned_labor": [],
        "safety_risks": [],

        "source": "auto_filtered_from_training_samples",
        "source_wonum": doc.get("wonum"),
        "source_collection": doc.get("_source_collection"),
        "created_at": datetime.utcnow(),
    }

    if not is_useful_example(example):
        return None

    return example


def main():
    db = get_db()
    target = db[TARGET_COLLECTION]

    total_read = 0
    total_inserted = 0
    total_skipped = 0

    for source_name in SOURCE_COLLECTIONS:
        if source_name not in db.list_collection_names():
            print(f"Collection absente: {source_name}")
            continue

        source = db[source_name]

        for doc in source.find({}):
            total_read += 1

            doc["_source_collection"] = source_name
            example = convert_document_to_add_workorder_example(doc)

            if not example:
                total_skipped += 1
                continue

            exists = target.find_one(
                {
                    "text": example["text"],
                    "assetnum": example.get("assetnum"),
                }
            )

            if exists:
                total_skipped += 1
                continue

            target.insert_one(example)
            total_inserted += 1

    print(f"Base MongoDB: {MONGO_DB_NAME}")
    print(f"Collection cible: {TARGET_COLLECTION}")
    print(f"Documents lus: {total_read}")
    print(f"Exemples insérés: {total_inserted}")
    print(f"Exemples ignorés: {total_skipped}")
    print(f"Total dataset Add WO: {target.count_documents({})}")


if __name__ == "__main__":
    main()