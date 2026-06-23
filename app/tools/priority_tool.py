def detect_urgency(text: str) -> str:
    lower = text.lower()

    high_words = [
        "arrêt production",
        "production arrêtée",
        "danger",
        "urgence",
        "critique",
        "incendie",
        "sécurité",
        "fuite importante",
    ]

    medium_words = [
        "pression",
        "fuite",
        "surchauffe",
        "vibration",
        "bruit anormal",
        "bloqué",
    ]

    if any(word in lower for word in high_words):
        return "HIGH"

    if any(word in lower for word in medium_words):
        return "MEDIUM"

    return "LOW"


def suggest_priority(text: str) -> dict:
    urgency = detect_urgency(text)

    if urgency == "HIGH":
        return {
            "priority": 1,
            "urgency": "HIGH",
            "reason": "Intervention critique avec impact possible sur la production ou la sécurité.",
        }

    if urgency == "MEDIUM":
        return {
            "priority": 2,
            "urgency": "MEDIUM",
            "reason": "Anomalie importante nécessitant une intervention rapide.",
        }

    return {
        "priority": 3,
        "urgency": "LOW",
        "reason": "Intervention normale sans signe critique détecté.",
    }