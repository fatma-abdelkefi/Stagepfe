from typing import Any, Optional
from pydantic import BaseModel


class AssistantRequest(BaseModel):
    wonum: Optional[str] = None
    siteid: Optional[str] = None
    text: str


class ChatRequest(BaseModel):
    question: str
    context: Optional[dict[str, Any]] = None


class LLMRequest(BaseModel):
    request: Optional[str] = None
    text: Optional[str] = None
    context: Optional[dict[str, Any]] = None

    def get_user_text(self) -> str:
        return (self.request or self.text or "").strip()


class AddRelatedWorkOrderExampleRequest(BaseModel):
    text: str
    needed: bool = True
    wonum: Optional[str] = ""
    siteid: Optional[str] = "BEDFORD"
    description: Optional[str] = ""
    details: Optional[str] = ""
    assetnum: Optional[str] = ""
    asset_description: Optional[str] = ""
    location: Optional[str] = ""
    reason: Optional[str] = ""
    metadata: Optional[dict[str, Any]] = None


class AddFailureReportingExampleRequest(BaseModel):
    text: str
    failure_class: str
    problem: str
    cause: str
    remedy: str

    wonum: Optional[str] = ""
    siteid: Optional[str] = "BEDFORD"
    description: Optional[str] = ""
    details: Optional[str] = ""
    assetnum: Optional[str] = ""
    asset_description: Optional[str] = ""
    location: Optional[str] = ""
    source: Optional[str] = "mobile_confirmed_failure"
    metadata: Optional[dict[str, Any]] = None