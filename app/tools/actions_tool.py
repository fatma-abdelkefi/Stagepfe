def suggest_actions(text: str, failure: dict) -> list[str]:
    lower = text.lower()
    actions = []

    if "pression" in lower or failure.get("problem") == "LOWPRES":
        actions.extend([
            "Vérifier le filtre",
            "Contrôler le tuyau d’aspiration",
            "Mesurer la pression d’entrée et de sortie",
            "Nettoyer les conduites si nécessaire",
        ])

    if "bruit" in lower or "vibration" in lower:
        actions.extend([
            "Contrôler les roulements",
            "Vérifier l’alignement",
            "Inspecter les fixations",
            "Contrôler la lubrification",
        ])

    if "fuite" in lower:
        actions.extend([
            "Identifier la source de fuite",
            "Vérifier les joints",
            "Remplacer les composants défectueux",
        ])

    if not actions:
        actions.extend([
            "Analyser les symptômes",
            "Vérifier l’état général de l’équipement",
            "Consulter l’historique des interventions",
            "Tester l’équipement après intervention",
        ])

    return actions