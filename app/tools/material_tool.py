def suggest_materials(text: str, failure: dict) -> list[dict]:
    lower = text.lower()
    materials = []

    problem = failure.get("problem")
    cause = failure.get("cause")
    remedy = failure.get("remedy")

    if "pression" in lower or problem == "LOWPRES":
        materials.extend([
            {
                "itemnum": "FILTER",
                "description": "Filtre pompe",
                "quantity": 1,
                "reason": "Faible pression pouvant être liée à un filtre bouché.",
            },
            {
                "itemnum": "SEAL",
                "description": "Joint d’étanchéité",
                "quantity": 1,
                "reason": "Contrôle d’étanchéité recommandé.",
            },
        ])

    if "fuite" in lower or cause == "SEAL":
        materials.append({
            "itemnum": "SEAL",
            "description": "Joint d’étanchéité",
            "quantity": 1,
            "reason": "Présence de fuite ou défaut d’étanchéité.",
        })

    if "roulement" in lower or cause == "BEARING":
        materials.append({
            "itemnum": "BEARING",
            "description": "Roulement moteur",
            "quantity": 1,
            "reason": "Bruit ou vibration pouvant indiquer une usure de roulement.",
        })

    if remedy in ["REPLSENSOR", "REPLACE"]:
        materials.append({
            "itemnum": "SENSOR",
            "description": "Capteur de remplacement",
            "quantity": 1,
            "reason": "Remplacement composant recommandé.",
        })

    unique = {}
    for material in materials:
        unique[material["itemnum"]] = material

    return list(unique.values())


def estimate_material_need(materials: list[dict]) -> dict:
    return {
        "count": len(materials),
        "materials": materials,
        "has_materials": len(materials) > 0,
    }
def suggest_planned_material(text: str, failure: dict) -> list[dict]:
    lower = text.lower()
    materials = []

    if "pompe" in lower or failure.get("failure_class") == "PUMPS":
        materials.append({
            "itemnum": "FILTER",
            "description": "Filtre pompe",
            "quantity": 1,
            "type": "planned",
            "reason": "Matériel recommandé pour intervention sur pompe.",
        })

    if "fuite" in lower or failure.get("problem") == "LEAK":
        materials.append({
            "itemnum": "SEAL",
            "description": "Joint d’étanchéité",
            "quantity": 1,
            "type": "planned",
            "reason": "Matériel recommandé en cas de fuite.",
        })

    if "moteur" in lower or failure.get("failure_class") == "MOTORS":
        materials.append({
            "itemnum": "BEARING",
            "description": "Roulement moteur",
            "quantity": 1,
            "type": "planned",
            "reason": "Matériel recommandé pour problème mécanique moteur.",
        })

    return materials