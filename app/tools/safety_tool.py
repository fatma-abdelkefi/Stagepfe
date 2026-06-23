def check_safety_risks(text: str) -> dict:
    lower = text.lower()

    risks = []
    ppe = []
    checklist = []

    if "pression" in lower:
        risks.append("risque lié à la pression")
        ppe.append("lunettes de protection")
        checklist.append("Dépressuriser le circuit avant intervention")

    if "électrique" in lower or "électricité" in lower:
        risks.append("risque électrique")
        ppe.append("gants isolants")
        checklist.append("Couper et consigner l’alimentation électrique")

    if "surchauffe" in lower or "chaud" in lower:
        risks.append("risque thermique")
        ppe.append("gants thermiques")
        checklist.append("Attendre le refroidissement de l’équipement")

    if "fuite" in lower:
        risks.append("risque de fuite")
        ppe.append("gants de sécurité")
        checklist.append("Isoler la source de fuite")

    if not checklist:
        checklist.append("Vérifier les conditions de sécurité avant intervention")

    return {
        "risks": risks,
        "ppe": list(set(ppe)),
        "checklist": checklist,
    }