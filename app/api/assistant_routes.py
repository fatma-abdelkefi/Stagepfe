from fastapi import HTTPException, APIRouter, Query

from app.schemas.assistant_schema import (
    LLMRequest,
    AddRelatedWorkOrderExampleRequest,
    AddFailureReportingExampleRequest,
)

from app.services.maximo_dataset_service import (
    export_training_data_from_maximo,
    fetch_debug_workorder,
)

from app.services.mongo_training_service import add_related_workorder_example
from app.services.failure_training_service import add_failure_reporting_example

from app.mcp_server import list_mcp_tools, call_mcp_tool


router = APIRouter(prefix="/ai", tags=["AI Tools"])


@router.get("/health")
def ai_health():
    return {
        "success": True,
        "status": "ok",
        "service": "ai",
        "message": "Service IA disponible.",
    }


@router.get("/auth/check")
def ai_auth_check():
    """
    Vérifie que le service IA est disponible.
    Ce endpoint est utilisé par le bouton IA dans WorkOrdersScreen.
    """
    try:
        tools = list_mcp_tools()

        return {
            "success": True,
            "authenticated": True,
            "status": "connected",
            "service": "ai",
            "message": "Authentification IA réussie. Service IA connecté.",
            "tools_count": len(tools) if isinstance(tools, list) else None,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Service IA indisponible: {str(e)}",
        )


@router.post("/dataset/from-maximo")
def dataset_from_maximo(
    limit: int = Query(1000),
    load_collections: bool = Query(False),
):
    return export_training_data_from_maximo(
        limit=limit,
        load_collections=load_collections,
    )


@router.get("/dataset/debug-maximo")
def debug_maximo(wonum: str = Query("1209")):
    return fetch_debug_workorder(wonum)


@router.get("/mcp/tools")
def mcp_tools():
    return list_mcp_tools()


@router.post("/mcp/call")
def mcp_call(payload: dict):
    tool_name = payload.get("tool_name")
    arguments = payload.get("arguments", {})

    if not tool_name:
        raise HTTPException(status_code=400, detail="tool_name is required")

    return call_mcp_tool(
        tool_name=tool_name,
        arguments=arguments,
    )


@router.post("/llm/assistant")
def llm_ai_assistant(payload: LLMRequest):
    from app.services.llm_orchestrator_service import llm_assistant

    user_text = payload.get_user_text()

    if not user_text:
        raise HTTPException(
            status_code=400,
            detail="request or text is required",
        )

    return llm_assistant(
        user_request=user_text,
        context=payload.context or {},
    )


@router.post("/training/add-related-workorder-example")
def add_related_workorder_training_example(
    payload: AddRelatedWorkOrderExampleRequest,
):
    try:
        return add_related_workorder_example(payload.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/training/add-failure-reporting-example")
def add_failure_reporting_training_example(
    payload: AddFailureReportingExampleRequest,
):
    try:
        return add_failure_reporting_example(payload.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))