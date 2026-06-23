import random
import sys
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT_DIR))

from pymongo import MongoClient

from app.core.config import MONGO_COLLECTION, MONGO_DB, MONGO_URI

TARGET_RELATED_WO_EXAMPLES = 3185
random.seed(42)


def safe(value):
    return "" if value is None else str(value).strip()


def make_hash(text, needed, assetnum, index):
    raw = f"{text.lower()}|{needed}|{assetnum.upper()}|{index}"
    return sha256(raw.encode("utf-8")).hexdigest()


POSITIVE_TEMPLATES = [
    "Créer un work order lié pour contrôler {asset_desc}, vibration anormale détectée.",
    "Créer un OT lié pour inspecter {asset_desc}, fuite d’huile signalée.",
    "WO lié recommandé pour vérifier {asset_desc}, bruit anormal constaté.",
    "Inspection complémentaire nécessaire sur {asset_desc}, échauffement observé.",
    "Contrôle séparé demandé sur {asset_desc}, anomalie mécanique possible.",
    "Générer un work order lié pour {asset_desc}, risque de panne secondaire.",
    "Demande de suivi sur {asset_desc}, vibration et bruit inhabituel.",
    "Créer une intervention liée pour vérifier l’état de {asset_desc}.",
    "Défaut possible détecté sur {asset_desc}, inspection liée nécessaire.",
    "Contrôler {asset_desc} avec un WO lié suite à une fuite ou vibration.",
]

NEGATIVE_TEMPLATES = [
    "Aucune anomalie détectée après intervention sur {asset_desc}.",
    "Contrôle final effectué, équipement {asset_desc} fonctionne normalement.",
    "Nettoyage terminé sur {asset_desc}, aucun WO lié nécessaire.",
    "Intervention clôturée, pas de défaut supplémentaire sur {asset_desc}.",
    "Après vérification, {asset_desc} est stable et ne nécessite pas de suivi.",
    "Test final OK sur {asset_desc}, pas de work order lié à créer.",
    "Maintenance terminée sur {asset_desc}, aucun symptôme critique observé.",
    "Inspection terminée, fonctionnement normal de {asset_desc}.",
    "Aucune action complémentaire requise pour {asset_desc}.",
    "Le contrôle de {asset_desc} ne montre pas de panne associée.",
]


def main():
    client = MongoClient(MONGO_URI)
    col = client[MONGO_DB][MONGO_COLLECTION]

    existing_count = col.count_documents({
        "labels.intent": "related_workorder"
    })

    print("Existing related_workorder examples:", existing_count)

    if existing_count >= TARGET_RELATED_WO_EXAMPLES:
        print("Target already reached.")
        return

    needed_to_insert = TARGET_RELATED_WO_EXAMPLES - existing_count

    real_docs = list(
        col.find(
            {
                "$or": [
                    {"record_type": "workorder"},
                    {"source": "maximo"},
                    {"asset.assetnum": {"$exists": True, "$ne": ""}},
                    {"assetnum": {"$exists": True, "$ne": ""}},
                ]
            },
            {
                "_id": 0,
                "wonum": 1,
                "siteid": 1,
                "description": 1,
                "search_text": 1,
                "assetnum": 1,
                "asset.assetnum": 1,
                "asset.description": 1,
                "location": 1,
            },
        )
    )

    if not real_docs:
        print("No source workorders found.")
        return

    inserted = 0
    skipped = 0
    now = datetime.now(timezone.utc)

    index = 0

    while inserted < needed_to_insert:
        doc = real_docs[index % len(real_docs)]
        asset = doc.get("asset") or {}

        assetnum = safe(asset.get("assetnum") or doc.get("assetnum"))
        asset_desc = safe(asset.get("description") or doc.get("description") or assetnum)
        location = safe(doc.get("location"))
        siteid = safe(doc.get("siteid")) or "BEDFORD"
        original_wonum = safe(doc.get("wonum"))

        if not assetnum:
            skipped += 1
            index += 1
            continue

        needed = inserted % 2 == 0

        template = random.choice(POSITIVE_TEMPLATES if needed else NEGATIVE_TEMPLATES)
        text = template.format(asset_desc=asset_desc)

        example_hash = make_hash(text, needed, assetnum, index)

        if col.find_one({"example_hash": example_hash}):
            skipped += 1
            index += 1
            continue

        description = f"Inspection complémentaire {asset_desc}" if needed else ""
        details = (
            "Inspection nécessaire pour identifier la cause racine, vérifier l’état mécanique "
            "et planifier une action corrective."
            if needed
            else ""
        )

        doc_to_insert = {
            "record_type": "generated_related_workorder",
            "source": "synthetic_related_workorder_generator_target_3185",
            "is_synthetic": True,
            "example_hash": example_hash,

            "wonum": f"RWO-GEN-{example_hash[:8]}",
            "original_wonum": original_wonum,
            "siteid": siteid,

            "description": description,
            "longdescription": details,
            "location": location,
            "assetnum": assetnum,

            "asset": {
                "assetnum": assetnum,
                "description": asset_desc,
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
                "assetnum": assetnum if needed else "",
                "asset_description": asset_desc if needed else "",
                "location": location,
                "reason": "Generated related workorder training example",
            },

            "ml_training": {
                "related_workorder_ready": True,
                "task": "related_workorder_prediction",
                "input_text": text,
                "target": {
                    "needed": needed,
                    "assetnum": assetnum if needed else "",
                    "location": location,
                },
                "updated_at": now,
            },

            "search_text": " ".join([
                text,
                assetnum,
                asset_desc,
                location,
            ]).strip(),

            "created_at": now,
            "updated_at": now,
        }

        col.insert_one(doc_to_insert)

        inserted += 1
        index += 1

        if inserted % 500 == 0:
            print("Inserted so far:", inserted)

    final_count = col.count_documents({
        "labels.intent": "related_workorder"
    })

    print("Related WO generation completed.")
    print("Inserted:", inserted)
    print("Skipped :", skipped)
    print("Final related_workorder count:", final_count)


if __name__ == "__main__":
    main()