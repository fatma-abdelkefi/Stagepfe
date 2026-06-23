import os
from typing import Dict, Optional

import joblib


MODEL_PATH = os.path.join(
    "app",
    "data",
    "models",
    "add_workorder_model_mongo.joblib",
)

_model = None


def load_model():
    global _model

    if _model is not None:
        return _model

    if not os.path.exists(MODEL_PATH):
        return None

    _model = joblib.load(MODEL_PATH)
    return _model


def predict_add_workorder_with_ml(text: str, context: Optional[Dict] = None) -> Dict:
    model = load_model()

    if model is None:
        return {}

    context = context or {}

    enriched_text = text or ""

    if context.get("assetnum"):
        enriched_text += f" assetnum {context.get('assetnum')}"

    if context.get("location"):
        enriched_text += f" location {context.get('location')}"

    if context.get("description"):
        enriched_text += f" description {context.get('description')}"

    prediction = model.predict([enriched_text])[0]

    if isinstance(prediction, dict):
        return prediction

    if isinstance(prediction, (list, tuple)):
        result = {}

        if len(prediction) > 0:
            result["worktype"] = prediction[0]

        if len(prediction) > 1:
            try:
                result["priority"] = int(prediction[1])
            except Exception:
                result["priority"] = prediction[1]

        if len(prediction) > 2:
            result["classification"] = prediction[2]

        return result

    return {}