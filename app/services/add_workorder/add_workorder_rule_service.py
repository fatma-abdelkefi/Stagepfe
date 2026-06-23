from typing import Dict, List, Optional


def normalize_text(text: str) -> str:
    return (text or "").lower().strip()


def detect_worktype(text: str) -> str:
    value = normalize_text(text)

    preventive_keywords = [
        "préventive",
        "preventive",
        "préventif",
        "preventif",
        "pm",
        "planifier",
        "planning",
        "inspection périodique",
        "controle periodique",
        "contrôle périodique",
        "maintenance planifiée",
        "maintenance planifiee",
    ]

    emergency_keywords = [
        "urgence",
        "urgent",
        "critique",
        "danger",
        "arrêt production",
        "arret production",
        "sécurité",
        "securite",
        "incendie",
        "fumée",
        "fumee",
    ]

    corrective_keywords = [
        "panne",
        "fuite",
        "bruit",
        "vibration",
        "surchauffe",
        "bloqué",
        "bloque",
        "cassé",
        "casse",
        "défaillance",
        "defaillance",
        "ne fonctionne pas",
        "problème",
        "probleme",
    ]

    if any(keyword in value for keyword in preventive_keywords):
        return "PM"

    if any(keyword in value for keyword in emergency_keywords):
        return "EM"

    if any(keyword in value for keyword in corrective_keywords):
        return "CM"

    return "CM"


def detect_priority(text: str) -> int:
    value = normalize_text(text)

    priority_1_keywords = [
        "urgent",
        "urgence",
        "critique",
        "arrêt production",
        "arret production",
        "danger",
        "risque sécurité",
        "risque securite",
        "incendie",
        "fumée",
        "fumee",
        "brûlé",
        "brule",
        "grosse fuite",
        "fuite importante",
        "explosion",
    ]

    priority_2_keywords = [
        "fuite",
        "surchauffe",
        "vibration importante",
        "bruit anormal",
        "ne fonctionne pas",
        "panne",
        "bloqué",
        "bloque",
    ]

    priority_3_keywords = [
        "inspection",
        "contrôle",
        "controle",
        "vérifier",
        "verifier",
        "maintenance",
        "planifier",
    ]

    if any(keyword in value for keyword in priority_1_keywords):
        return 1

    if any(keyword in value for keyword in priority_2_keywords):
        return 2

    if any(keyword in value for keyword in priority_3_keywords):
        return 3

    return 3


def detect_classification(text: str) -> str:
    value = normalize_text(text)

    if any(keyword in value for keyword in ["fuite", "huile", "convoyeur", "pompe", "vibration", "bruit", "roulement", "joint"]):
        return "MECHANICAL"

    if any(keyword in value for keyword in ["électrique", "electrique", "moteur", "court circuit", "surchauffe", "brûlé", "brule"]):
        return "ELECTRICAL"

    if any(keyword in value for keyword in ["capteur", "automate", "signal", "plc", "instrument"]):
        return "INSTRUMENTATION"

    return "GENERAL"
def build_description(text: str, asset: Optional[Dict] = None) -> str:
    clean_text = (text or "").strip()

    asset_label = ""
    if asset:
        assetnum = asset.get("assetnum")
        description = asset.get("description") or asset.get("asset_description")
        if assetnum:
            asset_label = f" sur équipement {assetnum}"
        elif description:
            asset_label = f" sur {description}"

    if not clean_text:
        return f"Nouvelle intervention{asset_label}"

    if len(clean_text) <= 80:
        return f"Intervention{asset_label} - {clean_text}"

    return f"Intervention{asset_label} - {clean_text[:77]}..."


def build_long_description(text: str, asset: Optional[Dict] = None) -> str:
    parts: List[str] = []

    if text:
        parts.append(f"Demande technicien : {text.strip()}")
    else:
        parts.append("Demande technicien : nouvelle intervention à compléter.")

    if asset:
        assetnum = asset.get("assetnum")
        description = asset.get("description") or asset.get("asset_description")
        location = asset.get("location")

        if assetnum or description:
            parts.append(f"Équipement identifié : {assetnum or ''} {description or ''}".strip())

        if location:
            parts.append(f"Emplacement : {location}")

    parts.append("Suggestion générée par IA. Le technicien doit vérifier/modifier avant création dans Maximo.")

    return "\n".join(parts)


def suggest_activities(text: str) -> List[str]:
    value = normalize_text(text)
    activities: List[str] = []

    if "fuite" in value:
        activities.extend(
            [
                "Identifier l'origine de la fuite",
                "Contrôler les joints et raccords",
                "Nettoyer la zone concernée",
            ]
        )

    if "vibration" in value:
        activities.extend(
            [
                "Mesurer le niveau de vibration",
                "Vérifier l'alignement",
                "Contrôler les roulements",
            ]
        )

    if "bruit" in value:
        activities.extend(
            [
                "Inspecter la source du bruit",
                "Contrôler les roulements",
                "Vérifier les pièces mécaniques mobiles",
            ]
        )

    if "surchauffe" in value or "brûlé" in value or "brule" in value:
        activities.extend(
            [
                "Contrôler la température de l'équipement",
                "Vérifier l'alimentation électrique",
                "Inspecter les câbles et connexions",
            ]
        )

    if "préventive" in value or "preventive" in value or "planifier" in value:
        activities.extend(
            [
                "Effectuer une inspection visuelle",
                "Contrôler l'état général de l'équipement",
                "Renseigner les observations dans le worklog",
            ]
        )

    if "capteur" in value or "sensor" in value or "signal" in value:
        activities.extend(
            [
                "Vérifier le signal du capteur",
                "Contrôler le câblage instrumentation",
                "Tester la lecture de mesure",
            ]
        )

    if not activities:
        activities = [
            "Inspecter l'équipement",
            "Diagnostiquer le problème signalé",
            "Proposer l'action corrective nécessaire",
        ]

    return list(dict.fromkeys(activities))


def suggest_materials(text: str) -> List[str]:
    value = normalize_text(text)
    materials: List[str] = []

    if "fuite" in value:
        materials.extend(
            [
                "Joint d'étanchéité",
                "Produit absorbant",
            ]
        )

    if "huile" in value:
        materials.append("Huile industrielle")

    if "roulement" in value or "bruit" in value or "vibration" in value:
        materials.append("Roulement")

    if "surchauffe" in value or "brûlé" in value or "brule" in value:
        materials.extend(
            [
                "Câble électrique",
                "Connecteur électrique",
            ]
        )

    if "capteur" in value or "sensor" in value:
        materials.append("Capteur de remplacement si nécessaire")

    return list(dict.fromkeys(materials))


def suggest_labor(text: str, classification: str) -> List[Dict]:
    priority = detect_priority(text)

    hours = 2.0
    if priority == 1:
        hours = 3.0
    elif priority == 3:
        hours = 1.5

    if classification == "ELECTRICAL":
        craft = "ELECTRICIAN"
    elif classification == "MECHANICAL":
        craft = "MECHANIC"
    elif classification == "INSTRUMENTATION":
        craft = "INSTRUMENT"
    else:
        craft = "TECHNICIAN"

    return [
        {
            "craft": craft,
            "hours": hours,
        }
    ]


def suggest_safety_risks(text: str) -> List[str]:
    value = normalize_text(text)
    risks: List[str] = []

    if "fuite" in value or "huile" in value:
        risks.extend(
            [
                "Risque de glissade",
                "Nettoyage de la zone nécessaire",
            ]
        )

    if "moteur" in value or "électrique" in value or "electrique" in value or "surchauffe" in value:
        risks.extend(
            [
                "Consignation électrique nécessaire",
                "Risque électrique",
            ]
        )

    if "brûlé" in value or "brule" in value or "fumée" in value or "fumee" in value or "incendie" in value:
        risks.extend(
            [
                "Risque d'incendie",
                "Contrôle immédiat recommandé",
            ]
        )

    if "vibration" in value or "convoyeur" in value or "pompe" in value:
        risks.append("Risque lié aux équipements rotatifs")

    return list(dict.fromkeys(risks))