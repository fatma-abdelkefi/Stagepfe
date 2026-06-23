from typing import Dict, List


REQUIRED_FIELDS = [
    "description",
    "worktype",
    "priority",
]


def validate_add_workorder_tool(payload: Dict) -> Dict:
    workorder = payload.get("workorder", {}) or {}

    missing_fields: List[str] = []

    for field in REQUIRED_FIELDS:
        if not workorder.get(field):
            missing_fields.append(field)

    is_valid = len(missing_fields) == 0

    return {
        "success": True,
        "is_valid": is_valid,
        "missing_fields": missing_fields,
        "message": (
            "Work Order prêt pour révision."
            if is_valid
            else "Certains champs obligatoires sont manquants."
        ),
    }