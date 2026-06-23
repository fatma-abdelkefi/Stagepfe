from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class PlannedLabor(BaseModel):
    craft: Optional[str] = None
    hours: Optional[float] = None


class AddWorkOrderSuggestion(BaseModel):
    description: Optional[str] = None
    long_description: Optional[str] = None

    assetnum: Optional[str] = None
    asset_description: Optional[str] = None
    location: Optional[str] = None
    siteid: Optional[str] = None

    status: Optional[str] = "WAPPR"
    priority: Optional[int] = None
    worktype: Optional[str] = None
    reportedby: Optional[str] = None

    scheduled_start: Optional[str] = None
    scheduled_finish: Optional[str] = None
    target_start: Optional[str] = None
    target_finish: Optional[str] = None

    activities: List[str] = Field(default_factory=list)
    planned_materials: List[str] = Field(default_factory=list)
    planned_labor: List[PlannedLabor] = Field(default_factory=list)

    source: str = "rules_mongodb_ml"
    ml_prediction_used: bool = False
    needs_review: bool = True
    auto_save: bool = False


class AddWorkOrderToolResult(BaseModel):
    success: bool = True
    intent: str = "add_workorder"
    message: Optional[str] = None
    ui_data: Dict[str, Any]