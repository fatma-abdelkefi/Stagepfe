import asyncio
import inspect
import threading
from typing import Any, Callable, Dict


# =========================================================
# Standard MCP tools
# =========================================================

from app.tools.material_tool import suggest_planned_material
from app.tools.labor_tool import suggest_planned_labor, estimate_labor_hours
from app.tools.activity_tool import generate_activity_steps
from app.tools.document_tool import summarize_document
from app.tools.related_workorder.followup_workorder_tool import suggest_related_workorder
from app.tools.safety_tool import check_safety_risks
from app.tools.priority_tool import suggest_priority
from app.tools.worklog_tool import generate_worklog


# =========================================================
# Add Work Order tools
# =========================================================

try:
    from app.tools.add_workorder.add_workorder_tool import add_workorder_tool
except Exception as exc:
    ADD_WORKORDER_IMPORT_ERROR = str(exc)

    async def add_workorder_tool(**kwargs) -> dict:
        return {
            "success": False,
            "tool": "add_workorder",
            "error": f"add_workorder_tool import error: {ADD_WORKORDER_IMPORT_ERROR}",
        }


try:
    from app.tools.add_workorder.add_workorder_ml_tool import add_workorder_ml_tool
except Exception as e:
    def add_workorder_ml_tool(**kwargs) -> dict:
        return {
            "success": False,
            "tool": "add_workorder_ml",
            "error": f"add_workorder_ml_tool import error: {str(e)}",
        }


try:
    from app.tools.add_workorder.add_workorder_validation_tool import validate_add_workorder_tool
except Exception:
    def validate_add_workorder_tool(workorder: dict | None = None, **kwargs) -> dict:
        workorder = workorder or kwargs.get("workorder") or {}

        required_fields = [
            "description",
            "worktype",
            "priority",
        ]

        missing_fields = [
            field for field in required_fields
            if not workorder.get(field)
        ]

        return {
            "success": True,
            "tool": "validate_add_workorder",
            "is_valid": len(missing_fields) == 0,
            "missing_fields": missing_fields,
            "message": (
                "Work Order prêt pour révision."
                if not missing_fields
                else "Certains champs obligatoires sont manquants."
            ),
        }


try:
    from app.tools.add_workorder.add_workorder_options_tool import add_workorder_options_tool
except Exception:
    def add_workorder_options_tool(**kwargs) -> dict:
        return {
            "success": True,
            "tool": "add_workorder_options",
            "options": {
                "worktype": [
                    {"value": "CM", "label": "Corrective Maintenance"},
                    {"value": "PM", "label": "Preventive Maintenance"},
                    {"value": "EM", "label": "Emergency Maintenance"},
                ],
                "priority": [
                    {"value": 1, "label": "Urgent / Critique"},
                    {"value": 2, "label": "Haute"},
                    {"value": 3, "label": "Normale"},
                    {"value": 4, "label": "Basse"},
                ],
                "classification": [
                    {"value": "MECHANICAL", "label": "Mécanique"},
                    {"value": "ELECTRICAL", "label": "Électrique"},
                    {"value": "INSTRUMENTATION", "label": "Instrumentation"},
                    {"value": "GENERAL", "label": "Général"},
                ],
            },
        }


# =========================================================
# Failure Reporting tools
# =========================================================

from app.tools.failure.failure_reporting_tool import predict_failure_reporting
from app.tools.failure.failure_validation_tool import validate_failure_hierarchy
from app.tools.failure.failure_hierarchy_resolver_tool import resolve_failure_hierarchy


# =========================================================
# Optional hierarchy options tool
# =========================================================

try:
    from app.tools.failure.failure_hierarchy_options_tool import get_failure_hierarchy_options
except Exception:
    get_failure_hierarchy_options = None


# =========================================================
# Optional Worklog analysis tools
# =========================================================

try:
    from app.tools.worklog_analysis_tool import validate_worklog
except Exception:
    def validate_worklog(text: str = "", context: dict | None = None, **kwargs) -> dict:
        return {
            "success": True,
            "tool": "validate_worklog",
            "result": {
                "is_valid": True,
                "missing_fields": [],
                "warnings": [
                    "validate_worklog fallback utilisé : fonction originale absente dans worklog_analysis_tool.py."
                ],
                "text": text,
            },
        }


try:
    from app.tools.worklog_analysis_tool import extract_worklog_entities
except Exception:
    def extract_worklog_entities(text: str = "", context: dict | None = None, **kwargs) -> dict:
        return {
            "success": True,
            "tool": "extract_worklog_entities",
            "result": {
                "assets": [],
                "locations": [],
                "actions": [],
                "materials": [],
                "labor": [],
                "warnings": [
                    "extract_worklog_entities fallback utilisé : fonction originale absente dans worklog_analysis_tool.py."
                ],
                "text": text,
            },
        }


# =========================================================
# Async helper
# =========================================================

def run_async_safely(coro):
    """
    Exécute un tool async depuis un orchestrateur sync.

    Cas normal dans FastAPI sync/threadpool :
    - pas de event loop actif => asyncio.run()

    Cas où un event loop existe déjà :
    - on lance une petite boucle dans un thread séparé.
    """

    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)

    result_container: dict[str, Any] = {}
    error_container: dict[str, Exception] = {}

    def runner():
        try:
            result_container["result"] = asyncio.run(coro)
        except Exception as exc:
            error_container["error"] = exc

    thread = threading.Thread(target=runner)
    thread.start()
    thread.join()

    if "error" in error_container:
        raise error_container["error"]

    return result_container.get("result")


# =========================================================
# MCP registry
# =========================================================

MCP_TOOLS: Dict[str, Callable[..., Any]] = {
    # Standard tools
    "suggest_planned_material": suggest_planned_material,
    "suggest_planned_labor": suggest_planned_labor,
    "estimate_labor_hours": estimate_labor_hours,
    "generate_activity_steps": generate_activity_steps,
    "summarize_document": summarize_document,
    "suggest_related_workorder": suggest_related_workorder,
    "check_safety_risks": check_safety_risks,
    "suggest_priority": suggest_priority,
    "generate_worklog": generate_worklog,
    "validate_worklog": validate_worklog,
    "extract_worklog_entities": extract_worklog_entities,

    # Failure Reporting
    "predict_failure_reporting": predict_failure_reporting,
    "validate_failure_hierarchy": validate_failure_hierarchy,
    "resolve_failure_hierarchy": resolve_failure_hierarchy,

    # Add Work Order
    "add_workorder": add_workorder_tool,
    "add_workorder_ml": add_workorder_ml_tool,
    "validate_add_workorder": validate_add_workorder_tool,
    "add_workorder_options": add_workorder_options_tool,
}


if get_failure_hierarchy_options is not None:
    MCP_TOOLS["get_failure_hierarchy_options"] = get_failure_hierarchy_options


# =========================================================
# Public MCP functions
# =========================================================

def list_mcp_tools() -> dict:
    return {
        "success": True,
        "tools": list(MCP_TOOLS.keys()),
    }


def call_mcp_tool(tool_name: str, arguments: dict | None = None) -> dict:
    arguments = arguments or {}

    if not tool_name:
        return {
            "success": False,
            "tool": None,
            "error": "tool_name is required",
        }

    if tool_name not in MCP_TOOLS:
        return {
            "success": False,
            "tool": tool_name,
            "error": f"Unknown MCP tool: {tool_name}",
        }

    tool_function = MCP_TOOLS[tool_name]

    try:
        result = tool_function(**arguments)

        if inspect.iscoroutine(result):
            result = run_async_safely(result)

        if isinstance(result, dict):
            if "success" not in result:
                result["success"] = True

            if "tool" not in result:
                result["tool"] = tool_name

            return result

        return {
            "success": True,
            "tool": tool_name,
            "result": result,
        }

    except Exception as e:
        return {
            "success": False,
            "tool": tool_name,
            "error": str(e),
        }