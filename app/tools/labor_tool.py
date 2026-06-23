def suggest_labor(text: str, failure: dict, priority: dict) -> dict:
    lower = text.lower()

    skills = []
    estimated_hours = 1.0

    if failure.get("failure_class") == "PUMPS" or "pompe" in lower:
        skills.append("Technicien mécanique")
        estimated_hours = 2.0

    if failure.get("failure_class") == "MOTORS" or "moteur" in lower:
        skills.append("Technicien électromécanique")
        estimated_hours = 2.5

    if "électrique" in lower or "capteur" in lower:
        skills.append("Technicien électrique")
        estimated_hours = 1.5

    if priority.get("priority") == 1:
        estimated_hours += 0.5

    if not skills:
        skills.append("Technicien maintenance générale")

    return {
        "required_skills": list(set(skills)),
        "estimated_hours": estimated_hours,
        "labor_count": 1 if estimated_hours <= 2 else 2,
        "reason": "Estimation basée sur le texte, la classe de panne et la priorité.",
    }
def estimate_labor_hours(text: str, failure: dict, priority: dict | None = None) -> dict:
    lower = text.lower()
    hours = 1.0

    if "pompe" in lower or failure.get("failure_class") == "PUMPS":
        hours = 2.0

    if "moteur" in lower or failure.get("failure_class") == "MOTORS":
        hours = 2.5

    if "fuite" in lower:
        hours += 0.5

    if priority and priority.get("priority") == 1:
        hours += 0.5

    return {
        "estimated_hours": hours,
        "confidence": "MEDIUM",
        "reason": "Estimation basée sur le texte, la classe de panne et la priorité.",
    }


def suggest_planned_labor(text: str, failure: dict) -> list[dict]:
    lower = text.lower()
    labor = []

    if "pompe" in lower or failure.get("failure_class") == "PUMPS":
        labor.append({
            "craft": "MECH",
            "description": "Technicien mécanique",
            "planned_hours": 2.0,
            "reason": "Intervention mécanique sur pompe.",
        })

    if "moteur" in lower or failure.get("failure_class") == "MOTORS":
        labor.append({
            "craft": "ELECT",
            "description": "Technicien électromécanique",
            "planned_hours": 2.5,
            "reason": "Intervention sur moteur.",
        })

    if not labor:
        labor.append({
            "craft": "MAINT",
            "description": "Technicien maintenance générale",
            "planned_hours": 1.0,
            "reason": "Intervention générale.",
        })

    return labor