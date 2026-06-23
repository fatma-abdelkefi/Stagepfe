from typing import Dict, Optional


def add_workorder_options_tool(payload: Optional[Dict] = None) -> Dict:
    return {
        "success": True,
        "tool": "add_workorder_options",
        "options": {
            "worktype": [
                {"value": "CM", "label": "Maintenance corrective"},
                {"value": "PM", "label": "Maintenance préventive"},
                {"value": "EM", "label": "Maintenance urgente"},
            ],
            "priority": [
                {"value": 1, "label": "Urgent / Critique"},
                {"value": 2, "label": "Haute priorité"},
                {"value": 3, "label": "Priorité normale"},
                {"value": 4, "label": "Basse priorité"},
            ],
        },
    }   