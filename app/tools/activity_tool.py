def generate_activity_steps(text: str, failure: dict | None = None) -> list[str]:
    lower = text.lower()
    failure = failure or {}

    steps = [
        "Sécuriser la zone d’intervention.",
        "Identifier l’équipement concerné.",
        "Analyser les symptômes signalés.",
    ]

    if "pression" in lower or failure.get("problem") == "LOWPRES":
        steps.extend([
            "Contrôler le filtre.",
            "Vérifier le tuyau d’aspiration.",
            "Mesurer la pression d’entrée et de sortie.",
            "Nettoyer les conduites si nécessaire.",
        ])

    if "bruit" in lower or "vibration" in lower:
        steps.extend([
            "Contrôler les roulements.",
            "Vérifier l’alignement.",
            "Contrôler la lubrification.",
        ])

    if "fuite" in lower:
        steps.extend([
            "Identifier la source de fuite.",
            "Vérifier les joints.",
            "Remplacer les composants défectueux si nécessaire.",
        ])

    steps.extend([
        "Tester l’équipement après intervention.",
        "Renseigner le worklog dans Maximo.",
        "Valider ou corriger les codes failure reporting proposés.",
    ])

    return steps