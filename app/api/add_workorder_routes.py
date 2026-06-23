from typing import Any, Dict
import traceback

from fastapi import APIRouter, HTTPException, Request

from app.services.add_workorder.maximo_add_workorder_service import (
    create_workorder_in_maximo,
)

router = APIRouter(prefix="/add-workorder", tags=["Add WorkOrder"])


@router.post("/create")
async def create_add_workorder(request: Request) -> Dict[str, Any]:
    try:
        payload = await request.json()

        print("ADD WORKORDER CREATE PAYLOAD:", payload)

        if not isinstance(payload, dict):
            raise HTTPException(
                status_code=400,
                detail="Le body JSON doit être un objet.",
            )

        workorder = payload.get("workorder") or payload

        if not isinstance(workorder, dict):
            raise HTTPException(
                status_code=400,
                detail="Le payload doit contenir un objet workorder.",
            )

        description = str(workorder.get("description") or "").strip()

        if not description:
            raise HTTPException(
                status_code=400,
                detail="La description est obligatoire.",
            )

        return create_workorder_in_maximo(workorder)

    except HTTPException:
        raise

    except Exception as exc:
        print("ADD WORKORDER CREATE ERROR:", str(exc))
        print(traceback.format_exc())

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )