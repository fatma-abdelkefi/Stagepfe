import traceback

from fastapi import APIRouter, Query

from app.services.add_workorder.maximo_plan_sync_service import (
    sync_maximo_planned_resources,
)

router = APIRouter(prefix="/maximo/plans", tags=["Maximo Plans"])


@router.post("/sync")
def sync_plans(
    siteid: str = Query(default="BEDFORD"),
    page_size: int = Query(default=500),
):
    try:
        return sync_maximo_planned_resources(
            siteid=siteid,
            page_size=page_size,
        )
    except Exception as exc:
        return {
            "success": False,
            "error": str(exc),
            "traceback": traceback.format_exc(),
        }