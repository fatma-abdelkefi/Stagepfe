from typing import Any, Dict, List, Optional

from pymongo import MongoClient

from app.core.config import MONGO_URI, MONGO_DB, MONGO_COLLECTION


MAXIMO_HIERARCHY_COLLECTION = "maximo_failure_hierarchy"


def normalize_code(value: Any) -> str:
    return str(value or "").strip().upper()


def get_db():
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")
    return client[MONGO_DB]


def extract_failure_from_doc(doc: dict) -> dict:
    failure = doc.get("failure") if isinstance(doc.get("failure"), dict) else {}

    return {
        "failure_class": normalize_code(
            doc.get("failure_class")
            or doc.get("failurecode")
            or failure.get("failure_class")
            or failure.get("failurecode")
        ),
        "problem": normalize_code(
            doc.get("problem")
            or doc.get("problemcode")
            or failure.get("problem")
            or failure.get("problemcode")
        ),
        "cause": normalize_code(
            doc.get("cause")
            or doc.get("causecode")
            or failure.get("cause")
            or failure.get("causecode")
        ),
        "remedy": normalize_code(
            doc.get("remedy")
            or doc.get("remedycode")
            or failure.get("remedy")
            or failure.get("remedycode")
        ),
        "source": doc.get("source") or "",
        "example_hash": doc.get("example_hash") or "",
    }


def is_complete_failure(row: dict) -> bool:
    return bool(
        row.get("failure_class")
        and row.get("problem")
        and row.get("cause")
        and row.get("remedy")
    )


def load_hierarchy_rows() -> List[dict]:
    """
    Priorité 1 : vraie hiérarchie Maximo exportée dans maximo_failure_hierarchy.
    Priorité 2 : fallback vers les exemples validés MongoDB.
    """

    db = get_db()
    rows: List[dict] = []

    # 1) Source officielle si disponible
    if MAXIMO_HIERARCHY_COLLECTION in db.list_collection_names():
        docs = list(db[MAXIMO_HIERARCHY_COLLECTION].find({}))

        for doc in docs:
            row = extract_failure_from_doc(doc)
            if is_complete_failure(row):
                row["hierarchy_source"] = "maximo_failure_hierarchy"
                rows.append(row)

    if rows:
        return rows

    # 2) Fallback : exemples validés
    docs = list(
        db[MONGO_COLLECTION].find(
            {
                "$or": [
                    {"task": "failure_reporting"},
                    {"failure_class": {"$exists": True, "$ne": ""}},
                    {"failurecode": {"$exists": True, "$ne": ""}},
                    {"failure.failure_class": {"$exists": True, "$ne": ""}},
                    {"failure.failurecode": {"$exists": True, "$ne": ""}},
                ]
            }
        )
    )

    for doc in docs:
        row = extract_failure_from_doc(doc)

        if is_complete_failure(row):
            row["hierarchy_source"] = "validated_training_samples"
            rows.append(row)

    return rows


def row_key(row: dict) -> tuple:
    return (
        normalize_code(row.get("failure_class")),
        normalize_code(row.get("problem")),
        normalize_code(row.get("cause")),
        normalize_code(row.get("remedy")),
    )


def unique_rows(rows: List[dict]) -> List[dict]:
    seen = {}

    for row in rows:
        key = row_key(row)

        if key not in seen:
            seen[key] = {
                **row,
                "count": 1,
            }
        else:
            seen[key]["count"] += 1

    return list(seen.values())


def validate_exact_failure(failure: dict, rows: List[dict]) -> Optional[dict]:
    target = row_key(failure)

    for row in rows:
        if row_key(row) == target:
            return row

    return None


def score_row(predicted: dict, row: dict) -> int:
    score = 0

    if normalize_code(predicted.get("failure_class")) == normalize_code(row.get("failure_class")):
        score += 5

    if normalize_code(predicted.get("problem")) == normalize_code(row.get("problem")):
        score += 4

    if normalize_code(predicted.get("cause")) == normalize_code(row.get("cause")):
        score += 3

    if normalize_code(predicted.get("remedy")) == normalize_code(row.get("remedy")):
        score += 2

    return score


def find_best_hierarchy_match(predicted: dict, rows: List[dict]) -> Optional[dict]:
    rows = unique_rows(rows)

    if not rows:
        return None

    predicted_class = normalize_code(predicted.get("failure_class"))

    class_rows = [
        row for row in rows
        if normalize_code(row.get("failure_class")) == predicted_class
    ]

    candidates = class_rows if class_rows else rows

    best_row = None
    best_score = -1

    for row in candidates:
        score = score_row(predicted, row)

        # Favoriser les combinaisons fréquentes.
        final_score = score * 1000 + int(row.get("count", 1))

        if final_score > best_score:
            best_score = final_score
            best_row = row

    return best_row


def resolve_failure_hierarchy(failure: Dict[str, Any]) -> Dict[str, Any]:
    """
    Corrige automatiquement une prédiction ML pour retourner une combinaison
    hiérarchique connue.

    Important :
    - Le technicien garde toujours le droit de modifier dans l'UI.
    - Ce resolver ne sauvegarde rien dans Maximo.
    """

    predicted = {
        "failure_class": normalize_code(failure.get("failure_class")),
        "problem": normalize_code(failure.get("problem")),
        "cause": normalize_code(failure.get("cause")),
        "remedy": normalize_code(failure.get("remedy")),
    }

    rows = load_hierarchy_rows()

    if not rows:
        return {
            "success": True,
            "tool": "resolve_failure_hierarchy",
            "is_valid": False,
            "auto_corrected": False,
            "confidence_level": "LOW",
            "warnings": [
                "Aucune hiérarchie Failure Reporting disponible. Exporter la hiérarchie Maximo est recommandé."
            ],
            "failure": predicted,
        }

    exact = validate_exact_failure(predicted, rows)

    if exact:
        return {
            "success": True,
            "tool": "resolve_failure_hierarchy",
            "is_valid": True,
            "auto_corrected": False,
            "confidence_level": "HIGH",
            "warnings": [],
            "matched_source": exact.get("hierarchy_source"),
            "matched_example_hash": exact.get("example_hash"),
            "failure": predicted,
        }

    best = find_best_hierarchy_match(predicted, rows)

    if not best:
        return {
            "success": True,
            "tool": "resolve_failure_hierarchy",
            "is_valid": False,
            "auto_corrected": False,
            "confidence_level": "LOW",
            "warnings": [
                "Aucune combinaison proche trouvée dans la hiérarchie."
            ],
            "failure": predicted,
        }

    corrected = {
        "failure_class": normalize_code(best.get("failure_class")),
        "problem": normalize_code(best.get("problem")),
        "cause": normalize_code(best.get("cause")),
        "remedy": normalize_code(best.get("remedy")),
    }

    return {
        "success": True,
        "tool": "resolve_failure_hierarchy",
        "is_valid": True,
        "auto_corrected": True,
        "confidence_level": "MEDIUM",
        "warnings": [
            "La prédiction ML a été corrigée automatiquement selon la hiérarchie Failure Reporting."
        ],
        "matched_source": best.get("hierarchy_source"),
        "matched_example_hash": best.get("example_hash"),
        "failure_before_correction": predicted,
        "failure": corrected,
    }