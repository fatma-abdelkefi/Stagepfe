import re
from difflib import SequenceMatcher
from typing import Any

try:
    from app.tools.related_workorder.related_workorder_ml_tool import predict_related_workorder_ml
except Exception:
    predict_related_workorder_ml = None

from app.tools.related_workorder.mongo_asset_matcher_tool import match_assets_from_mongodb


def safe(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def normalize_text(value: Any) -> str:
    text = safe(value).lower()

    replacements = {
        "œ": "oe",
        "’": "'",
        "‘": "'",
        "´": "'",
        "`": "'",
        "é": "e",
        "è": "e",
        "ê": "e",
        "ë": "e",
        "à": "a",
        "â": "a",
        "ù": "u",
        "û": "u",
        "î": "i",
        "ï": "i",
        "ô": "o",
        "ö": "o",
        "ç": "c",
        "qu'on voyeur": "convoyeur",
        "con voyeur": "convoyeur",
        "convoyer": "convoyeur",
        "con voyageur": "convoyeur",
        "conveyor": "convoyeur",
        "fouille d'oeil": "fuite huile",
        "fouille d oeil": "fuite huile",
        "fuite de huile": "fuite huile",
        "fuite d huile": "fuite huile",
        "fuite d'huile": "fuite huile",
        "annormale": "anormale",
        "anormal": "anormale",
        "vibration normale": "vibration anormale",
        "vibration normal": "vibration anormale",
    }

    for old, new in replacements.items():
        text = text.replace(old, new)

    text = re.sub(r"[^a-z0-9\s\-_/']", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def clean_speech_text(value: Any) -> str:
    text = safe(value)

    corrections = {
        "qu'on voyeur": "convoyeur",
        "con voyeur": "convoyeur",
        "convoyer": "convoyeur",
        "con voyageur": "convoyeur",
        "conveyor": "convoyeur",
        "fouille d'oeil": "fuite d’huile",
        "fouille d’œil": "fuite d’huile",
        "fouille d oeil": "fuite d’huile",
        "fuite de huile": "fuite d’huile",
        "fuite d huile": "fuite d’huile",
        "fuite huile": "fuite d’huile",
        "photo huile": "fuite d’huile",
        "photoine": "fuite d’huile",
        "photoïne": "fuite d’huile",
        "annormale": "anormale",
        "vibration anormal": "vibration anormale",
        "vibrations anormal": "vibration anormale",
        "vibration normale": "vibration anormale",
        "vibration normal": "vibration anormale",
        "bruit normal": "bruit anormal",
        "bruit normale": "bruit anormal",
        "moteur principale": "moteur principal",
        "pompe hydrolique": "pompe hydraulique",
        "roullement": "roulement",
        "convoyer": "convoyeur",
        "con voyer": "convoyeur",
        "anorme": "anormale",
        "anormee": "anormale",
        "anormalee": "anormale",
        "work orderly": "work order lié",
    }

    for wrong, right in corrections.items():
        text = re.sub(re.escape(wrong), right, text, flags=re.IGNORECASE)

    text = re.sub(r"\s+", " ", text)
    return text.strip()


def contains_any(text: str, keywords: list[str]) -> bool:
    return any(k in text for k in keywords)


def similarity(a: str, b: str) -> float:
    a = normalize_text(a)
    b = normalize_text(b)

    if not a or not b:
        return 0.0

    return SequenceMatcher(None, a, b).ratio()


def get_context_text(context: dict) -> str:
    parts = [
        context.get("description"),
        context.get("details"),
        context.get("worklog"),
        context.get("assetnum"),
        context.get("asset_description"),
        context.get("assetdescription"),
        context.get("location"),
        context.get("locationdescription"),
        context.get("worktype"),
    ]

    return " ".join(safe(p) for p in parts if p).strip()


def get_context_assets(context: dict) -> list[dict]:
    candidates: list[dict] = []

    current_assetnum = safe(context.get("assetnum"))
    current_desc = safe(
        context.get("asset_description")
        or context.get("assetdescription")
        or context.get("asset_desc")
    )
    current_location = safe(context.get("location"))

    if current_assetnum:
        candidates.append(
            {
                "assetnum": current_assetnum,
                "description": current_desc,
                "location": current_location,
                "siteid": safe(context.get("siteid")),
                "source": "current_asset",
            }
        )

    for key in [
        "related_assets",
        "relatedAssets",
        "children_assets",
        "child_assets",
        "asset_hierarchy",
        "assets",
        "maximo_assets",
    ]:
        items = context.get(key)

        if not isinstance(items, list):
            continue

        for item in items:
            if not isinstance(item, dict):
                continue

            assetnum = safe(item.get("assetnum") or item.get("asset") or item.get("id"))
            description = safe(
                item.get("description")
                or item.get("asset_description")
                or item.get("assetdescription")
                or item.get("name")
            )
            location = safe(item.get("location") or context.get("location"))
            siteid = safe(item.get("siteid") or context.get("siteid"))

            if assetnum:
                candidates.append(
                    {
                        "assetnum": assetnum,
                        "description": description,
                        "location": location,
                        "siteid": siteid,
                        "source": key,
                    }
                )

    unique = {}

    for asset in candidates:
        unique[asset["assetnum"]] = asset

    return list(unique.values())


def detect_symptoms(text: str) -> list[str]:
    n = normalize_text(text)
    symptoms = []

    if contains_any(n, ["fuite", "huile", "lubrification", "graissage"]):
        symptoms.append("fuite d’huile")

    if contains_any(n, ["vibration", "vibre", "secousse"]):
        symptoms.append("vibration anormale")

    if contains_any(n, ["bruit", "son anormal", "claquement", "grincement"]):
        symptoms.append("bruit anormal")

    if contains_any(n, ["surchauffe", "temperature", "chaud"]):
        symptoms.append("surchauffe possible")

    if contains_any(n, ["blocage", "bloque", "grippe"]):
        symptoms.append("blocage mécanique possible")

    return symptoms


def detect_asset_keywords(text: str) -> list[str]:
    n = normalize_text(text)

    rules = {
        "pompe": ["pompe", "pump"],
        "moteur": ["moteur", "motor"],
        "convoyeur": ["convoyeur", "conveyor"],
        "lubrification": ["huile", "lubrification", "graissage", "lubrication"],
        "roulement": ["roulement", "bearing"],
        "reducteur": ["reducteur", "gearbox"],
        "vanne": ["vanne", "valve"],
        "compresseur": ["compresseur", "compressor"],
        "filtre": ["filtre", "filter"],
        "tuyauterie": ["tuyau", "canalisation", "pipe", "piping"],
    }

    found = []

    for label, keywords in rules.items():
        if contains_any(n, keywords):
            found.append(label)

    return found


def score_asset(asset: dict, text: str) -> int:
    n = normalize_text(text)

    assetnum = normalize_text(asset.get("assetnum"))
    desc = normalize_text(asset.get("description"))
    location = normalize_text(asset.get("location"))
    source = safe(asset.get("source"))

    haystack = f"{assetnum} {desc} {location}"
    keywords = detect_asset_keywords(text)
    symptoms = detect_symptoms(text)

    score = 0

    for kw in keywords:
        if kw in haystack:
            score += 10

    if "fuite d’huile" in symptoms and contains_any(
        haystack,
        ["huile", "lub", "lubrification", "graissage", "moteur", "motor", "pompe", "pump"],
    ):
        score += 8

    # pénalité : si la voix parle de convoyeur mais l'asset n'est pas convoyeur
    if "convoyeur" in n and not contains_any(haystack, ["convoyeur", "conveyor"]):
        score -= 12

    # pénalité : si la voix parle de moteur mais l'asset n'est pas moteur
    if "moteur" in n and not contains_any(haystack, ["moteur", "motor", "drive"]):
        score -= 8

    if "vibration anormale" in symptoms and contains_any(
        haystack,
        ["pompe", "pump", "moteur", "motor", "roulement", "bearing", "reducteur", "convoyeur", "conveyor"],
    ):
        score += 8

    if "bruit anormal" in symptoms and contains_any(
        haystack,
        ["pompe", "pump", "moteur", "motor", "roulement", "bearing", "reducteur", "convoyeur", "conveyor"],
    ):
        score += 6

    if source == "current_asset":
        score += 2

    for token in n.split():
        if len(token) >= 4 and token in haystack:
            score += 1

    score += int(similarity(n, haystack) * 5)

    return score


def detect_best_assets(context: dict, text: str, max_results: int = 5) -> dict:
    context_assets = get_context_assets(context)
    scored = []

    # 1) Assets du contexte
    for asset in context_assets:
        score = score_asset(asset, text)
        scored.append({
            **asset,
            "score": score,
        })

    # 2) Assets MongoDB toujours utilisés aussi
    mongo_candidates = match_assets_from_mongodb(
        text=text,
        limit=max_results,
        min_score=10,
    )

    for asset in mongo_candidates:
        scored.append(asset)

    if not scored:
        return {
            "selected_assetnum": "",
            "selected_description": "",
            "selected_location": safe(context.get("location")),
            "confidence": "low",
            "strategy": "manual_selection_required",
            "reason": "Aucun asset compatible trouvé.",
            "candidates": [],
        }

    # supprimer doublons
    unique = {}
    for item in scored:
        assetnum = safe(item.get("assetnum"))
        if not assetnum:
            continue

        if assetnum not in unique or int(item.get("score") or 0) > int(unique[assetnum].get("score") or 0):
            unique[assetnum] = item

    filtered = [
        item for item in unique.values()
        if int(item.get("score") or 0) >= 10
    ]

    filtered.sort(key=lambda x: int(x.get("score") or 0), reverse=True)

    if not filtered:
        return {
            "selected_assetnum": "",
            "selected_description": "",
            "selected_location": safe(context.get("location")),
            "confidence": "low",
            "strategy": "manual_selection_required",
            "reason": "Aucun asset compatible avec la demande vocale.",
            "candidates": [],
        }

    filtered.sort(
    key=lambda x: (
        int(x.get("score") or 0),

        1 if "motor" in normalize_text(x.get("description")) else 0,
        1 if "drive" in normalize_text(x.get("description")) else 0,
        1 if "#2" in normalize_text(x.get("description")) else 0,
        1 if "#1" in normalize_text(x.get("description")) else 0,
    ),
    reverse=True,
)

    best = filtered[0]

    # éviter de choisir un conveyor générique
    best_desc = normalize_text(best.get("description"))

    if (
        "conveyor system" in best_desc
        and "motor" not in best_desc
        and len(filtered) > 1
    ):
        for item in filtered:
            desc = normalize_text(item.get("description"))

            if "motor" in desc or "drive" in desc:
                best = item
                break

    return {
        "selected_assetnum": safe(best.get("assetnum")),
        "selected_description": safe(best.get("description")),
        "selected_location": safe(best.get("location") or context.get("location")),
        "confidence": "high" if int(best.get("score") or 0) >= 45 else "medium",
        "strategy": safe(best.get("source")) or "mongodb_asset_match",
        "reason": "Asset proposé selon le texte vocal et le dataset MongoDB.",
        "candidates": filtered[:max_results],
    }


def should_create_related_workorder(text: str, force_related: bool = False) -> dict:
    n = normalize_text(text)

    negative = [
        "aucun defaut",
        "pas de defaut",
        "aucune anomalie",
        "rien a signaler",
        "remis en service",
        "nettoyage effectue",
        "pas de probleme",
    ]

    if any(x in n for x in negative):
        return {
            "needed": False,
            "score": 0,
            "signals": [],
            "confidence": "high",
        }

    strong = [
        "fuite",
        "huile",
        "vibration",
        "anormale",
        "bruit",
        "surchauffe",
        "blocage",
        "convoyeur",
        "moteur",
        "pompe",
        "roulement",
    ]

    medium = [
        "verifier",
        "controle",
        "inspection",
        "diagnostic",
        "constate",
        "observe",
        "work order lie",
        "ordre de travail lie",
    ]

    score = 0
    signals = []

    for s in strong:
        if s in n:
            score += 3
            signals.append(s)

    for s in medium:
        if s in n:
            score += 1
            signals.append(s)

    needed = score >= 3

    if force_related and score > 0:
        needed = True

    return {
        "needed": needed,
        "score": score,
        "signals": list(dict.fromkeys(signals)),
        "confidence": "high" if score >= 7 else "medium" if score >= 3 else "low",
    }
def sentence_case(text: str) -> str:
    text = safe(text)

    if not text:
        return ""

    return text[0].upper() + text[1:]


def build_description(text: str) -> str:
    n = normalize_text(text)
    symptoms = detect_symptoms(text)

    if "fuite d’huile" in symptoms and "moteur" in n:
        return "Inspection fuite d’huile moteur"

    if "fuite d’huile" in symptoms and "pompe" in n:
        return "Inspection fuite d’huile pompe"

    if "vibration anormale" in symptoms and "bruit anormal" in symptoms:
        return "Inspection vibration et bruit anormal"

    if "vibration anormale" in symptoms:
        return "Inspection vibration anormale équipement"

    if "bruit anormal" in symptoms:
        return "Diagnostic bruit anormal équipement"

    if "fuite d’huile" in symptoms:
        return "Inspection fuite d’huile équipement"

    return "Inspection complémentaire équipement"


def build_details(text: str, assetnum: str) -> str:
    symptoms = detect_symptoms(text)

    if symptoms:
        obs = ", ".join(symptoms)
        obs = sentence_case(f"{obs} constatée{'s' if len(symptoms) > 1 else ''}")
    else:
        obs = "Anomalie complémentaire constatée"

    target = assetnum or "l’équipement concerné"

    return (
        f"{obs} sur {target}.\n"
        "Inspection nécessaire pour identifier la cause racine, vérifier l’état mécanique "
        "et planifier l’action corrective."
    )


def get_ml_prediction(text: str) -> dict:
    if predict_related_workorder_ml is None:
        return {"model_available": False}

    try:
        return predict_related_workorder_ml(text)
    except Exception as e:
        return {
            "model_available": False,
            "error": str(e),
        }


def ml_asset_is_reliable(ml_result: dict) -> bool:
    asset_prediction = (ml_result or {}).get("asset_prediction") or {}
    confidence = float(asset_prediction.get("confidence") or 0)
    return confidence >= 0.45


def suggest_related_workorder(
    text: str = "",
    failure: dict | None = None,
    context: dict | None = None,
) -> dict:
    context = context or {}
    failure = failure or {}

    cleaned_text = clean_speech_text(text)

    user_text_only = cleaned_text

    combined_text = " ".join(
        part
        for part in [
            cleaned_text,
            get_context_text(context),
            safe(failure.get("failure_class")),
            safe(failure.get("problem")),
            safe(failure.get("cause")),
            safe(failure.get("remedy")),
        ]
        if part
    )

    force_related = (
        safe(context.get("force_intent")) == "related_workorder"
        or safe(context.get("intent")) == "related_workorder"
        or "work order lié" in cleaned_text.lower()
        or "work order lie" in normalize_text(cleaned_text)
    )

    # 1. Résultat ML prioritaire
    ml_result = get_ml_prediction(user_text_only)
    ml_status = safe(ml_result.get("status"))

    if ml_status == "not_needed":
        return {
            "status": "not_needed",
            "needed": False,
            "reason": ml_result.get("message") or "Aucun ordre de travail lié n’est nécessaire.",
            "message": ml_result.get("message") or "Aucun ordre de travail lié n’est nécessaire.",
            "suggested_description": "",
            "suggested_details": "",
            "suggested_assetnum": "",
            "suggested_asset_label": "",
            "suggested_asset_description": "",
            "suggested_location": safe(context.get("location")),
            "assetnum": "",
            "location": safe(context.get("location")),
            "asset_strategy": "not_required",
            "asset_reason": "",
            "asset_confidence": 0.0,
            "asset_confidence_label": "high",
            "asset_candidates": [],
            "confidence": 1.0,
            "confidence_label": "high",
            "signals": [],
            "cleaned_text": cleaned_text,
            "ml_result": ml_result,
            "can_create": False,
            "needs_clarification": False,
            "action": "no_creation",
        }

    if ml_status == "insufficient_text":
        return {
            "status": "insufficient_text",
            "needed": None,
            "reason": ml_result.get("message") or "Texte insuffisant.",
            "message": ml_result.get("message") or "Veuillez préciser le problème ou l’équipement concerné.",
            "suggested_description": "",
            "suggested_details": "",
            "suggested_assetnum": "",
            "suggested_asset_label": "",
            "suggested_asset_description": "",
            "suggested_location": safe(context.get("location")),
            "assetnum": "",
            "location": safe(context.get("location")),
            "asset_strategy": "manual_selection_required",
            "asset_reason": "",
            "asset_confidence": 0.0,
            "asset_confidence_label": "low",
            "asset_candidates": [],
            "confidence": 0.0,
            "confidence_label": "low",
            "signals": [],
            "cleaned_text": cleaned_text,
            "ml_result": ml_result,
            "can_create": False,
            "needs_clarification": True,
            "action": "ask_more_details",
        }

    if ml_status in ["model_unavailable", "error"]:
        return {
            "status": ml_status,
            "needed": None,
            "reason": ml_result.get("message") or "Service IA indisponible.",
            "message": ml_result.get("message") or "Service IA indisponible. Vous pouvez continuer en mode manuel.",
            "suggested_description": "",
            "suggested_details": "",
            "suggested_assetnum": "",
            "suggested_asset_label": "",
            "suggested_asset_description": "",
            "suggested_location": safe(context.get("location")),
            "assetnum": "",
            "location": safe(context.get("location")),
            "asset_strategy": "manual",
            "asset_reason": "",
            "asset_confidence": 0.0,
            "asset_confidence_label": "low",
            "asset_candidates": [],
            "confidence": 0.0,
            "confidence_label": "low",
            "signals": [],
            "cleaned_text": cleaned_text,
            "ml_result": ml_result,
            "can_create": False,
            "needs_clarification": False,
            "action": "manual",
        }

    # 2. Décision métier si ML ne bloque pas
    decision = should_create_related_workorder(
        user_text_only,
        force_related=force_related,
    )

    if ml_status == "possible":
        decision["needed"] = True
        decision["confidence"] = "medium"

    if ml_status in ["needed", "asset_ambiguous", "asset_not_found"]:
        decision["needed"] = True
        decision["confidence"] = "high"

    # 3. Matching asset
    asset_match = detect_best_assets(context, combined_text)
    asset_candidates = asset_match.get("candidates", []) or []

    if not decision["needed"]:
        return {
            "status": "not_needed",
            "needed": False,
            "reason": "Aucun signal suffisant ne justifie la création d’un work order lié.",
            "message": "Aucun ordre de travail lié n’est nécessaire.",
            "suggested_description": "",
            "suggested_details": "",
            "suggested_assetnum": "",
            "suggested_asset_label": "",
            "suggested_asset_description": "",
            "suggested_location": safe(context.get("location")),
            "assetnum": "",
            "location": safe(context.get("location")),
            "asset_strategy": "not_required",
            "asset_reason": "",
            "asset_confidence": 0.0,
            "asset_confidence_label": "low",
            "asset_candidates": asset_candidates,
            "confidence": 0.0,
            "confidence_label": decision["confidence"],
            "signals": decision["signals"],
            "cleaned_text": cleaned_text,
            "ml_result": ml_result,
            "can_create": False,
            "needs_clarification": False,
            "action": "no_creation",
        }

    assetnum = ""
    asset_description = ""
    asset_location = safe(context.get("location"))
    asset_confidence = 0.0
    asset_confidence_label = "low"
    asset_strategy = "manual_selection_required"
    asset_reason = "Asset à confirmer par le technicien."

    # 4. Priorité à l'asset explicite ou ML
    ml_assetnum = safe(ml_result.get("assetnum"))
    ml_asset_confidence = float(ml_result.get("asset_confidence") or 0.0)

    if ml_assetnum:
        assetnum = ml_assetnum
        asset_location = safe(context.get("location"))
        asset_confidence = ml_asset_confidence or 1.0
        asset_confidence_label = "high" if asset_confidence >= 0.60 else "medium"
        asset_strategy = "ml_or_explicit_asset"
        asset_reason = "Asset détecté depuis le texte ou proposé par le modèle ML."

    elif asset_match.get("confidence") in ["high", "medium"] and asset_match.get("selected_assetnum"):
        assetnum = safe(asset_match.get("selected_assetnum"))
        asset_description = safe(asset_match.get("selected_description"))
        asset_location = safe(asset_match.get("selected_location") or context.get("location"))
        asset_confidence_label = safe(asset_match.get("confidence"))
        asset_confidence = 0.85 if asset_confidence_label == "high" else 0.55
        asset_strategy = safe(asset_match.get("strategy"))
        asset_reason = safe(asset_match.get("reason"))

    # 5. Déterminer le status final
    status = "needed"
    action = "fill_form"
    can_create = True
    needs_clarification = False
    message = "Un ordre de travail lié est recommandé."

    if ml_status == "possible":
        status = "possible"
        action = "confirm_needed"
        can_create = False
        needs_clarification = True
        message = "Une intervention complémentaire semble possible. Veuillez confirmer."

    if not assetnum:
        status = "asset_not_found"
        action = "ask_asset"
        can_create = False
        needs_clarification = True
        message = "Aucun asset fiable n’a été détecté. Veuillez saisir l’asset manuellement."

    if assetnum and asset_confidence < 0.60:
        status = "asset_ambiguous"
        action = "choose_asset"
        can_create = False
        needs_clarification = True
        message = "Asset non confirmé. Veuillez choisir l’asset concerné."

    if ml_status == "asset_ambiguous":
        status = "asset_ambiguous"
        action = "choose_asset"
        can_create = False
        needs_clarification = True
        message = "Asset non confirmé. Veuillez choisir l’asset concerné."

    if ml_status == "asset_not_found":
        status = "asset_not_found"
        action = "ask_asset"
        can_create = False
        needs_clarification = True
        message = "Aucun asset fiable n’a été détecté. Veuillez saisir l’asset manuellement."

    # Si plusieurs candidats MongoDB, demander confirmation
    if asset_candidates and len(asset_candidates) > 1 and status == "needed":
        status = "asset_ambiguous"
        action = "choose_asset"
        can_create = False
        needs_clarification = True
        message = "Plusieurs assets compatibles ont été trouvés. Veuillez choisir l’asset concerné."

    details_target = assetnum if assetnum else "l’équipement concerné"

    return {
        "status": status,
        "needed": True,
        "reason": (
            "Un work order lié est recommandé car les symptômes détectés peuvent indiquer "
            "un défaut nécessitant une inspection séparée."
        ),
        "message": message,

        "suggested_description": build_description(combined_text),
        "suggested_details": build_details(combined_text, details_target),

        "suggested_assetnum": assetnum,
        "assetnum": assetnum,

        "suggested_asset_label": assetnum or "Sélection requise",
        "suggested_asset_description": asset_description,

        "suggested_location": asset_location,
        "location": asset_location,

        "asset_strategy": asset_strategy,
        "asset_reason": asset_reason,
        "asset_confidence": asset_confidence,
        "asset_confidence_label": asset_confidence_label,
        "asset_candidates": asset_candidates,

        "confidence": float(ml_result.get("confidence") or 0.0),
        "confidence_label": decision["confidence"],
        "signals": decision["signals"],
        "cleaned_text": cleaned_text,
        "ml_result": ml_result,

        "can_create": can_create,
        "needs_clarification": needs_clarification,
        "action": action,
    }
def suggest_followup_workorder(
    text: str = "",
    failure: dict | None = None,
    context: dict | None = None,
) -> dict:
    return suggest_related_workorder(text=text, failure=failure, context=context)