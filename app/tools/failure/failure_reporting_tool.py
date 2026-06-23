from pathlib import Path
from typing import Any, Dict, Optional

import joblib
from pymongo import MongoClient
from sklearn.metrics.pairwise import cosine_similarity

from app.core.config import MONGO_URI, MONGO_DB, MONGO_COLLECTION
from app.tools.failure.failure_hierarchy_resolver_tool import resolve_failure_hierarchy


BASE_DIR = Path(__file__).resolve().parents[2]
from pathlib import Path

def find_failure_model_path() -> Path:
    current = Path(__file__).resolve()

    candidates = [
        current.parents[2] / "data" / "models" / "failure_model.joblib",
        current.parents[3] / "app" / "data" / "models" / "failure_model.joblib",
        current.parents[3] / "data" / "models" / "failure_model.joblib",
    ]

    for path in candidates:
        if path.exists():
            return path

    return candidates[0]


MODEL_PATH = find_failure_model_path()

_failure_model = None

SIMILARITY_STRONG_THRESHOLD = 0.75
SIMILARITY_MEDIUM_THRESHOLD = 0.60
ML_CONFIDENCE_THRESHOLD = 0.60


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


def normalize_code(value: Any) -> Optional[str]:
    text = str(value or "").strip().upper()
    return text or None


def normalize_list(value: Any) -> list[str]:
    if not value:
        return []

    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]

    return [str(value).strip()]


def dedupe_parts(parts: list[Any]) -> list[str]:
    seen = set()
    cleaned = []

    for part in parts:
        text = str(part or "").strip()

        if not text:
            continue

        key = normalize_text(text)

        if key in seen:
            continue

        seen.add(key)
        cleaned.append(text)

    return cleaned


def build_failure_input_text(
    text: str = "",
    description: str = "",
    long_description: str = "",
    worklog: Any = None,
    activities: Any = None,
    actual_materials: Any = None,
    actual_labor: Any = None,
    assetnum: str = "",
    asset_description: str = "",
    location: str = "",
    location_description: str = "",
    **kwargs,
) -> str:
    context = kwargs.get("context") if isinstance(kwargs.get("context"), dict) else {}

    context_texts = [
        context.get("description", ""),
        context.get("long_description", ""),
        context.get("description_longdescription", ""),
        context.get("longdescription", ""),
        context.get("assetnum", ""),
        context.get("location", ""),
    ]

    text_normalized = normalize_text(text)

    text_already_contains_context = all(
        normalize_text(value) in text_normalized
        for value in context_texts
        if str(value or "").strip()
    )

    if text_already_contains_context:
        parts = [text]
    else:
        parts = [
            text,
            description,
            long_description,
            assetnum,
            asset_description,
            location,
            location_description,
        ]

    parts += normalize_list(worklog)
    parts += normalize_list(activities)
    parts += normalize_list(actual_materials)
    parts += normalize_list(actual_labor)

    parts += [
        context.get("description", ""),
        context.get("long_description", ""),
        context.get("description_longdescription", ""),
        context.get("longdescription", ""),
        context.get("details", ""),

        context.get("assetnum", ""),
        context.get("asset", ""),
        context.get("asset_description", ""),
        context.get("assetDescription", ""),
        context.get("assetdesc", ""),

        context.get("location", ""),
        context.get("location_description", ""),
        context.get("locationDescription", ""),
        context.get("locationdesc", ""),

        context.get("worktype", ""),
        context.get("status", ""),
        context.get("priority", ""),
        context.get("wopriority", ""),
    ]

    parts += normalize_list(context.get("worklog"))
    parts += normalize_list(context.get("workLogs"))
    parts += normalize_list(context.get("activities"))
    parts += normalize_list(context.get("woactivity"))
    parts += normalize_list(context.get("actual_materials"))
    parts += normalize_list(context.get("actualMaterials"))
    parts += normalize_list(context.get("actual_labor"))
    parts += normalize_list(context.get("actualLabor"))
    parts += normalize_list(context.get("materials"))
    parts += normalize_list(context.get("labor"))

    return " ".join(dedupe_parts(parts))


def mongo_collection():
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")
    return client[MONGO_DB][MONGO_COLLECTION]


def load_failure_model():
    global _failure_model

    if _failure_model is not None:
        return _failure_model

    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Failure model not found at: {MODEL_PATH}")

    _failure_model = joblib.load(MODEL_PATH)
    return _failure_model


def empty_failure_response(error: str) -> Dict[str, Any]:
    return {
        "success": False,
        "tool": "predict_failure_reporting",
        "result": {
            "failure_class": None,
            "problem": None,
            "cause": None,
            "remedy": None,
            "confidence": None,
            "validation_required": True,
        },
        "error": error,
    }


def list_to_text(value: Any) -> str:
    if not value:
        return ""

    if isinstance(value, list):
        parts = []

        for item in value:
            if isinstance(item, dict):
                parts.extend(str(v) for v in item.values() if str(v).strip())
            else:
                parts.append(str(item))

        return " ".join(parts)

    if isinstance(value, dict):
        return " ".join(str(v) for v in value.values() if str(v).strip())

    return str(value or "")


def example_text(doc: dict) -> str:
    metadata = doc.get("metadata") if isinstance(doc.get("metadata"), dict) else {}

    parts = [
        doc.get("text", ""),
        doc.get("description", ""),
        doc.get("long_description", ""),
        doc.get("description_longdescription", ""),
        doc.get("longdescription", ""),
        doc.get("details", ""),

        doc.get("assetnum", ""),
        doc.get("asset_description", ""),
        doc.get("assetDescription", ""),
        doc.get("assetdesc", ""),

        doc.get("location", ""),
        doc.get("location_description", ""),
        doc.get("locationDescription", ""),
        doc.get("locationdesc", ""),

        doc.get("worktype", ""),
        doc.get("status", ""),
        doc.get("priority", ""),

        list_to_text(doc.get("worklog") or metadata.get("worklog")),
        list_to_text(doc.get("workLogs") or metadata.get("workLogs")),
        list_to_text(doc.get("activities") or metadata.get("activities")),
        list_to_text(doc.get("woactivity") or metadata.get("woactivity")),
        list_to_text(doc.get("actual_materials") or metadata.get("actual_materials")),
        list_to_text(doc.get("actualMaterials") or metadata.get("actualMaterials")),
        list_to_text(doc.get("actual_labor") or metadata.get("actual_labor")),
        list_to_text(doc.get("actualLabor") or metadata.get("actualLabor")),
    ]

    return normalize_text(" ".join(str(part) for part in parts if str(part).strip()))


def get_failure_labels(doc: dict) -> dict:
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
    }


def load_valid_failure_examples(limit: int = 5000) -> list[dict]:
    col = mongo_collection()

    query = {
        "$or": [
            {"task": "failure_reporting"},
            {"failure_class": {"$exists": True, "$ne": ""}},
            {"failurecode": {"$exists": True, "$ne": ""}},
            {"failure.failure_class": {"$exists": True, "$ne": ""}},
            {"failure.failurecode": {"$exists": True, "$ne": ""}},
        ]
    }

    docs = list(col.find(query).limit(limit))
    examples = []

    for doc in docs:
        labels = get_failure_labels(doc)
        text = example_text(doc)

        if (
            text
            and labels.get("failure_class")
            and labels.get("problem")
            and labels.get("cause")
            and labels.get("remedy")
        ):
            examples.append(
                {
                    "text": text,
                    "labels": labels,
                    "source": doc.get("source"),
                    "example_hash": doc.get("example_hash"),
                    "wonum": doc.get("wonum"),
                }
            )

    return examples


def prediction_to_list(prediction: Any) -> list:
    if prediction is None:
        return []

    if isinstance(prediction, dict):
        return []

    if isinstance(prediction, (list, tuple)):
        return list(prediction)

    if hasattr(prediction, "tolist"):
        value = prediction.tolist()

        if isinstance(value, list):
            return value

        return [value]

    return [prediction]


def normalize_prediction_output(prediction: Any) -> Dict[str, Any]:
    if isinstance(prediction, dict):
        return {
            "failure_class": normalize_code(
                prediction.get("failure_class") or prediction.get("failurecode")
            ),
            "problem": normalize_code(
                prediction.get("problem") or prediction.get("problemcode")
            ),
            "cause": normalize_code(
                prediction.get("cause") or prediction.get("causecode")
            ),
            "remedy": normalize_code(
                prediction.get("remedy") or prediction.get("remedycode")
            ),
            "confidence": prediction.get("confidence"),
        }

    values = prediction_to_list(prediction)

    if len(values) >= 4:
        return {
            "failure_class": normalize_code(values[0]),
            "problem": normalize_code(values[1]),
            "cause": normalize_code(values[2]),
            "remedy": normalize_code(values[3]),
            "confidence": None,
        }

    return {
        "failure_class": None,
        "problem": None,
        "cause": None,
        "remedy": None,
        "confidence": None,
    }


def extract_confidence(model: Any, cleaned_text: str) -> Optional[float]:
    if not hasattr(model, "predict_proba"):
        return None

    try:
        probabilities = model.predict_proba([cleaned_text])

        if isinstance(probabilities, list):
            max_values = []

            for proba in probabilities:
                try:
                    max_values.append(float(max(proba[0])))
                except Exception:
                    pass

            if not max_values:
                return None

            return min(max_values)

        return float(max(probabilities[0]))

    except Exception:
        return None


def get_model_from_loaded(loaded: Any):
    if isinstance(loaded, dict) and "model" in loaded:
        return loaded["model"]

    return loaded


def get_tfidf_vectorizer(model: Any):
    if hasattr(model, "named_steps"):
        return model.named_steps.get("tfidf")

    return None


def retrieve_similar_failure(cleaned_text: str, model: Any) -> Optional[dict]:
    vectorizer = get_tfidf_vectorizer(model)

    if vectorizer is None:
        return None

    examples = load_valid_failure_examples()

    if not examples:
        return None

    example_texts = [item["text"] for item in examples]

    try:
        input_vector = vectorizer.transform([cleaned_text])
        example_vectors = vectorizer.transform(example_texts)

        scores = cosine_similarity(input_vector, example_vectors)[0]

        best_index = int(scores.argmax())
        best_score = float(scores[best_index])
        best_example = examples[best_index]

        if best_score < SIMILARITY_MEDIUM_THRESHOLD:
            return {
                "matched": False,
                "best_similarity": best_score,
                "best_example": best_example,
            }

        return {
            "matched": True,
            "best_similarity": best_score,
            "best_example": best_example,
        }

    except Exception:
        return None


def predict_with_model(model: Any, cleaned_text: str) -> Dict[str, Any]:
    prediction = model.predict([cleaned_text])[0]
    result = normalize_prediction_output(prediction)

    confidence = extract_confidence(model, cleaned_text)

    if confidence is not None:
        result["confidence"] = confidence

    return result


def resolve_result_failure(raw_failure: dict) -> tuple[dict, dict]:
    resolved = resolve_failure_hierarchy(raw_failure)
    resolved_failure = resolved.get("failure") or raw_failure
    return resolved_failure, resolved


def build_success_result(
    failure: dict,
    confidence: Optional[float],
    prediction_source: str,
    cleaned_text: str,
    similar_examples: list,
    hierarchy_validation: dict,
) -> Dict[str, Any]:
    return {
        "success": True,
        "tool": "predict_failure_reporting",
        "result": {
            "failure_class": failure.get("failure_class"),
            "problem": failure.get("problem"),
            "cause": failure.get("cause"),
            "remedy": failure.get("remedy"),

            # Gardé pour debug/backend, pas forcément affiché mobile.
            "confidence": confidence,

            # Toujours true parce que tu veux que le technicien vérifie.
            "validation_required": True,

            "prediction_source": prediction_source,
            "input_used": cleaned_text,
            "mongodb_used": True,
            "mongodb_similar_examples_count": len(similar_examples),
            "mongodb_similar_examples": similar_examples,

            "hierarchy_resolved": hierarchy_validation.get("is_valid"),
            "auto_corrected": hierarchy_validation.get("auto_corrected"),
            "hierarchy_validation": hierarchy_validation,
        },
    }


def predict_failure_reporting(
    text: Optional[str] = None,
    description: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    raw_text = build_failure_input_text(
        text=text or kwargs.get("request") or kwargs.get("message") or "",
        description=description or kwargs.get("description") or "",
        long_description=(
            kwargs.get("long_description")
            or kwargs.get("longdescription")
            or kwargs.get("description_longdescription")
            or ""
        ),
        worklog=kwargs.get("worklog") or kwargs.get("workLogs"),
        activities=kwargs.get("activities") or kwargs.get("woactivity"),
        actual_materials=(
            kwargs.get("actual_materials")
            or kwargs.get("actualMaterials")
            or kwargs.get("materials")
        ),
        actual_labor=(
            kwargs.get("actual_labor")
            or kwargs.get("actualLabor")
            or kwargs.get("labor")
        ),
        assetnum=kwargs.get("assetnum") or kwargs.get("asset") or "",
        asset_description=(
            kwargs.get("asset_description")
            or kwargs.get("assetDescription")
            or kwargs.get("assetdesc")
            or ""
        ),
        location=kwargs.get("location") or "",
        location_description=(
            kwargs.get("location_description")
            or kwargs.get("locationDescription")
            or kwargs.get("locationdesc")
            or ""
        ),
        context=kwargs.get("context"),
    )

    if not raw_text or not str(raw_text).strip():
        return empty_failure_response("Description failure vide.")

    cleaned_text = normalize_text(raw_text)

    try:
        loaded = load_failure_model()
        model = get_model_from_loaded(loaded)

        retrieval = retrieve_similar_failure(cleaned_text, model)

        # 1) Similarité MongoDB
        if retrieval and retrieval.get("matched"):
            best_similarity = retrieval["best_similarity"]
            best_example = retrieval["best_example"]
            labels = best_example["labels"]

            raw_failure = {
                "failure_class": labels.get("failure_class"),
                "problem": labels.get("problem"),
                "cause": labels.get("cause"),
                "remedy": labels.get("remedy"),
            }

            resolved_failure, hierarchy_validation = resolve_result_failure(raw_failure)

            similar_examples = [
                {
                    "text": best_example.get("text"),
                    "failure_class": resolved_failure.get("failure_class"),
                    "problem": resolved_failure.get("problem"),
                    "cause": resolved_failure.get("cause"),
                    "remedy": resolved_failure.get("remedy"),
                    "source": best_example.get("source"),
                    "example_hash": best_example.get("example_hash"),
                    "similarity": best_similarity,
                }
            ]

            if best_similarity >= SIMILARITY_STRONG_THRESHOLD:
                confidence = min(0.99, max(0.85, best_similarity))

                return build_success_result(
                    failure=resolved_failure,
                    confidence=confidence,
                    prediction_source="mongodb_strong_similarity",
                    cleaned_text=cleaned_text,
                    similar_examples=similar_examples,
                    hierarchy_validation=hierarchy_validation,
                )

            if best_similarity >= SIMILARITY_MEDIUM_THRESHOLD:
                confidence = min(0.84, max(0.60, best_similarity))

                return build_success_result(
                    failure=resolved_failure,
                    confidence=confidence,
                    prediction_source="mongodb_medium_similarity",
                    cleaned_text=cleaned_text,
                    similar_examples=similar_examples,
                    hierarchy_validation=hierarchy_validation,
                )

        # 2) Modèle ML
        ml_result = predict_with_model(model, cleaned_text)
        confidence = ml_result.get("confidence")

        raw_failure = {
            "failure_class": ml_result.get("failure_class"),
            "problem": ml_result.get("problem"),
            "cause": ml_result.get("cause"),
            "remedy": ml_result.get("remedy"),
        }

        resolved_failure, hierarchy_validation = resolve_result_failure(raw_failure)

        return build_success_result(
            failure=resolved_failure,
            confidence=confidence,
            prediction_source="ml_model",
            cleaned_text=cleaned_text,
            similar_examples=[],
            hierarchy_validation=hierarchy_validation,
        )

    except Exception as e:
        return empty_failure_response(str(e))