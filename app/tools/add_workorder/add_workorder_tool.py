from typing import Any, Dict, Optional

from app.services.add_workorder.add_workorder_service import suggest_add_workorder


async def add_workorder_tool(
    text: str = "",
    context: Optional[Dict[str, Any]] = None,
    **kwargs,
) -> Dict[str, Any]:
    context = context or {}

    payload = kwargs.get("payload")
    if isinstance(payload, dict):
        text = payload.get("text", text)
        context = payload.get("context", context) or context

    workorder = await suggest_add_workorder(
        text=text,
        context=context,
    )

    return {
        "success": True,
        "tool": "add_workorder",
        "intent": "add_workorder",
        "message": (
            "Suggestion de Work Order générée. "
            "Le technicien doit vérifier/modifier avant création dans Maximo."
        ),
        "result": {
            "workorder": workorder,
        },
        "ui_data": {
            "workorder": workorder,
        },
    }