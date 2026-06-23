from typing import Any, Dict, Optional

from app.services.add_workorder.add_workorder_predictor_service import (
    predict_add_workorder_with_ml,
)


def add_workorder_ml_tool(
    text: str = "",
    context: Optional[Dict[str, Any]] = None,
    **kwargs,
) -> Dict[str, Any]:
    context = context or {}

    payload = kwargs.get("payload")
    if isinstance(payload, dict):
        text = payload.get("text", text)
        context = payload.get("context", context) or context

    prediction = predict_add_workorder_with_ml(
        text=text,
        context=context,
    )

    return {
        "success": True,
        "tool": "add_workorder_ml",
        "intent": "add_workorder_ml",
        "result": prediction,
        "prediction": prediction,
    }