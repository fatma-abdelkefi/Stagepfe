from pathlib import Path
from typing import Any

import joblib
import numpy as np

from app.core.config import RELATED_WO_MODEL_PATH, RELATED_WO_ASSET_MODEL_PATH

_needed_model = None
_asset_model = None


def safe(value: Any) -> str:
    return "" if value is None else str(value).strip()


def to_python_value(value: Any):
    if isinstance(value, (np.bool_, bool)):
        return bool(value)

    if isinstance(value, (np.integer, int)):
        return int(value)

    if isinstance(value, (np.floating, float)):
        return float(value)

    return str(value)


def load_needed_model():
    global _needed_model

    if _needed_model is None:
        path = Path(RELATED_WO_MODEL_PATH)
        if not path.exists():
            return None
        _needed_model = joblib.load(path)

    return _needed_model


def load_asset_model():
    global _asset_model

    if _asset_model is None:
        path = Path(RELATED_WO_ASSET_MODEL_PATH)
        if not path.exists():
            return None
        _asset_model = joblib.load(path)

    return _asset_model


def predict_with_proba(model, text: str):
    raw_value = model.predict([text])[0]
    value = to_python_value(raw_value)

    confidence = 0.0
    top_predictions = []

    if hasattr(model, "predict_proba"):
        probs = model.predict_proba([text])[0]
        classes = list(model.classes_)

        scored = sorted(
            [
                {
                    "value": to_python_value(cls),
                    "confidence": float(prob),
                }
                for cls, prob in zip(classes, probs)
            ],
            key=lambda x: x["confidence"],
            reverse=True,
        )

        top_predictions = scored[:3]
        confidence = float(scored[0]["confidence"]) if scored else 0.0

    return {
        "value": value,
        "confidence": confidence,
        "top_predictions": top_predictions,
    }


def predict_related_workorder_ml(text: str) -> dict:
    text = safe(text)

    if not text:
        return {
            "model_available": False,
            "needed": False,
            "confidence": 0.0,
            "assetnum": "",
            "needed_prediction": None,
            "asset_prediction": None,
        }

    needed_model = load_needed_model()
    asset_model = load_asset_model()

    needed_prediction = None
    asset_prediction = None

    needed = False
    confidence = 0.0
    assetnum = ""

    if needed_model is not None:
        needed_prediction = predict_with_proba(needed_model, text)
        needed = bool(needed_prediction["value"])
        confidence = float(needed_prediction["confidence"])

    if asset_model is not None:
        asset_prediction = predict_with_proba(asset_model, text)
        assetnum = safe(asset_prediction["value"])

    return {
        "model_available": needed_model is not None,
        "needed": bool(needed),
        "confidence": float(confidence),
        "assetnum": assetnum,
        "needed_prediction": needed_prediction,
        "asset_prediction": asset_prediction,
    }