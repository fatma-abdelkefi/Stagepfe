def extract_worklog_entities(text: str) -> dict:
    lower = text.lower()

    equipment = []
    symptoms = []
    causes = []
    actions = []

    if "pompe" in lower:
        equipment.append("pompe")
    if "moteur" in lower:
        equipment.append("moteur")
    if "capteur" in lower:
        equipment.append("capteur")
    if "convoyeur" in lower:
        equipment.append("convoyeur")

    if "pression" in lower:
        symptoms.append("faible pression")
    if "bruit" in lower:
        symptoms.append("bruit anormal")
    if "vibration" in lower:
        symptoms.append("vibration")
    if "fuite" in lower:
        symptoms.append("fuite")
    if "surchauffe" in lower:
        symptoms.append("surchauffe")

    if "bouché" in lower or "obstrué" in lower:
        causes.append("obstruction")
    if "roulement" in lower:
        causes.append("roulement usé")
    if "joint" in lower:
        causes.append("joint défectueux")
    if "câble" in lower or "cable" in lower:
        causes.append("problème de câble")

    if "nettoy" in lower:
        actions.append("nettoyage")
    if "remplac" in lower:
        actions.append("remplacement")
    if "répar" in lower or "repar" in lower:
        actions.append("réparation")
    if "vérifi" in lower or "verifi" in lower:
        actions.append("vérification")

    return {
        "equipment": equipment,
        "symptoms": symptoms,
        "possible_causes": causes,
        "actions_done": actions,
    }