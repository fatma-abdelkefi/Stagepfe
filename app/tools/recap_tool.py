def generate_intervention_recap(text: str, failure: dict, priority: dict) -> dict:
    return {
        "short_summary": text[:180] + "..." if len(text) > 180 else text,
        "failure_summary": (
            f"Classe: {failure.get('failure_class')}, "
            f"Problème: {failure.get('problem')}, "
            f"Cause: {failure.get('cause')}, "
            f"Remède: {failure.get('remedy')}"
        ),
        "priority_summary": (
            f"Priorité {priority.get('priority')} - {priority.get('urgency')}"
        ),
    }