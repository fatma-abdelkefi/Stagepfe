from pathlib import Path
from typing import Any
import re
import unicodedata

import joblib


RELATED_WO_MODEL_PATH = Path("data/models/related_workorder_model_mongo.joblib")
RELATED_WO_ASSET_MODEL_PATH = Path("data/models/related_workorder_asset_model_mongo.joblib")

_needed_model = None
_asset_model = None


MIN_TEXT_LENGTH = 8

NEEDED_CONFIDENCE_THRESHOLD = 0.65
POSSIBLE_CONFIDENCE_THRESHOLD = 0.45
ASSET_CONFIDENCE_THRESHOLD = 0.60


NEGATIVE_PATTERNS = [
    "aucun bruit",
    "aucun bruit detecte",
    "aucun bruit anormal",
    "aucun probleme",
    "aucune anomalie",
    "aucun defaut",
    "rien a signaler",
    "fonctionne normalement",
    "fonctionnement normal",
    "pas de probleme",
    "pas d'anomalie",
    "pas de defaut",
    "pas necessaire",
    "aucune intervention",
    "controle effectue",
    "inspection terminee",
    "tout est normal",
    "equipement fonctionne normalement",
    "apres intervention aucun bruit",
]


POSITIVE_PATTERNS = [
    "bruit",
    "bruit anormal",
    "fuite",
    "huile",
    "fuite huile",
    "fuite d'huile",
    "vibration",
    "vibration anormale",
    "surchauffe",
    "chauffe",
    "bloque",
    "blocage",
    "arrete",
    "courroie",
    "pression faible",
    "baisse de pression",
    "odeur de brule",
    "casse",
    "defaut",
    "probleme",
    "anomalie",
    "roulement",
    "moteur",
    "pompe",
    "convoyeur",
]


def remove_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value)
    return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")


def normalize_text(text: str) -> str:
    value = str(text or "").lower().strip()
    value = remove_accents(value)

    replacements = {
        "’": "'",
        "‘": "'",
        "´": "'",
        "`": "'",
        "qu'on voyeur": "convoyeur",
        "con voyeur": "convoyeur",
        "con voyer": "convoyeur",
        "convoyer": "convoyeur",
        "con voyageur": "convoyeur",
        "conveyor": "convoyeur",
        "fuite de huile": "fuite huile",
        "fuite d huile": "fuite huile",
        "fuite d'huile": "fuite huile",
        "fouille d oeil": "fuite huile",
        "fouille d'oeil": "fuite huile",
        "photo huile": "fuite huile",
        "photoine": "fuite huile",
        "photoïne": "fuite huile",
        "bruit normal": "bruit anormal",
        "bruit normale": "bruit anormal",
        "vibration normal": "vibration anormale",
        "vibration normale": "vibration anormale",
        "annormale": "anormale",
    }

    for old, new in replacements.items():
        value = value.replace(old, new)

    value = re.sub(r"[^a-z0-9\s\-_/']", " ", value)
    value = re.sub(r"\s+", " ", value)

    return value.strip()


def extract_assetnum_from_text(text: str) -> str:
    """
    Détecte un asset écrit explicitement dans la phrase.
    Exemples :
    - bruit dans cs11430  => CS11430
    - probleme sur 12610 => 12610
    - vibration sur conv-100 => CONV-100
    """
    value = str(text or "").upper()

    match = re.search(r"\b[A-Z]{1,8}[-]?\d{2,10}\b|\b\d{4,10}\b", value)

    if match:
        return match.group(0)

    return ""


def has_negative_meaning(text: str) -> bool:
    clean_text = normalize_text(text)
    return any(normalize_text(pattern) in clean_text for pattern in NEGATIVE_PATTERNS)


def has_positive_meaning(text: str) -> bool:
    clean_text = normalize_text(text)
    return any(normalize_text(pattern) in clean_text for pattern in POSITIVE_PATTERNS)


def load_needed_model():
    global _needed_model

    if _needed_model is None:
        if not RELATED_WO_MODEL_PATH.exists():
            return None

        _needed_model = joblib.load(RELATED_WO_MODEL_PATH)

    return _needed_model


def load_asset_model():
    global _asset_model

    if _asset_model is None:
        if not RELATED_WO_ASSET_MODEL_PATH.exists():
            return None

        _asset_model = joblib.load(RELATED_WO_ASSET_MODEL_PATH)

    return _asset_model


def to_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value

    text = str(value).strip().lower()

    if text in ["true", "1", "yes", "oui", "needed"]:
        return True

    if text in ["false", "0", "no", "non", "not_needed"]:
        return False

    return bool(value)


def predict_with_confidence(model: Any, text: str) -> dict:
    prediction = model.predict([text])[0]

    confidence = 0.0
    top_predictions = []

    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba([text])[0]
        classes = model.classes_

        pairs = sorted(
            zip(classes, probabilities),
            key=lambda item: item[1],
            reverse=True,
        )

        if pairs:
            confidence = float(pairs[0][1])

        top_predictions = [
            {
                "value": bool(value) if isinstance(value, bool) else str(value),
                "confidence": float(score),
            }
            for value, score in pairs[:5]
        ]

    return {
        "value": bool(prediction) if isinstance(prediction, bool) else str(prediction),
        "confidence": confidence,
        "top_predictions": top_predictions,
    }


def build_related_wo_decision(text: str) -> dict:
    original_text = str(text or "").strip()
    clean_text = normalize_text(original_text)
    explicit_assetnum = extract_assetnum_from_text(original_text)

    result = {
        "status": "unknown",
        "model_available": False,
        "needed": None,
        "confidence": 0.0,
        "assetnum": "",
        "asset_confidence": 0.0,
        "asset_candidates": [],
        "message": "",
        "action": "manual",
        "can_create": False,
        "needs_clarification": False,
        "needed_prediction": None,
        "asset_prediction": None,
    }

    if len(clean_text) < MIN_TEXT_LENGTH:
        result.update(
            {
                "status": "insufficient_text",
                "needed": None,
                "message": "Veuillez préciser le problème ou l’équipement concerné.",
                "action": "ask_more_details",
                "can_create": False,
                "needs_clarification": True,
            }
        )
        return result

    # Priorité absolue : phrases négatives
    if has_negative_meaning(clean_text):
        result.update(
            {
                "status": "not_needed",
                "needed": False,
                "confidence": 1.0,
                "message": "Aucun ordre de travail lié n’est nécessaire.",
                "action": "no_creation",
                "can_create": False,
                "needs_clarification": False,
            }
        )
        return result

    needed_model = load_needed_model()
    asset_model = load_asset_model()

    if needed_model is None and asset_model is None:
        if has_positive_meaning(clean_text):
            result.update(
                {
                    "status": "possible",
                    "model_available": False,
                    "needed": True,
                    "confidence": 0.45,
                    "assetnum": explicit_assetnum,
                    "asset_confidence": 1.0 if explicit_assetnum else 0.0,
                    "message": "Un ordre de travail lié semble possible, mais le modèle IA est indisponible. Veuillez vérifier manuellement.",
                    "action": "confirm_needed",
                    "can_create": False,
                    "needs_clarification": True,
                }
            )
            return result

        result.update(
            {
                "status": "model_unavailable",
                "message": "Service IA indisponible. Vous pouvez continuer en mode manuel.",
                "action": "manual",
                "can_create": False,
            }
        )
        return result

    result["model_available"] = True

    if needed_model is not None:
        needed_prediction = predict_with_confidence(needed_model, clean_text)

        result["needed_prediction"] = needed_prediction
        result["needed"] = to_bool(needed_prediction["value"])
        result["confidence"] = float(needed_prediction["confidence"])

    if explicit_assetnum:
        result["assetnum"] = explicit_assetnum
        result["asset_confidence"] = 1.0
        result["asset_candidates"] = [
            {
                "value": explicit_assetnum,
                "confidence": 1.0,
            }
        ]
    elif asset_model is not None:
        asset_prediction = predict_with_confidence(asset_model, clean_text)

        result["asset_prediction"] = asset_prediction
        result["assetnum"] = str(asset_prediction["value"] or "")
        result["asset_confidence"] = float(asset_prediction["confidence"])
        result["asset_candidates"] = asset_prediction.get("top_predictions", [])

    needed = result["needed"]
    confidence = float(result["confidence"])
    assetnum = str(result["assetnum"] or "").strip()
    asset_confidence = float(result["asset_confidence"])

    if needed is False and confidence >= NEEDED_CONFIDENCE_THRESHOLD:
        result.update(
            {
                "status": "not_needed",
                "message": "Aucun ordre de travail lié n’est nécessaire.",
                "action": "no_creation",
                "can_create": False,
                "needs_clarification": False,
            }
        )
        return result

    if needed is False and confidence < NEEDED_CONFIDENCE_THRESHOLD:
        if has_positive_meaning(clean_text):
            result.update(
                {
                    "status": "possible",
                    "needed": True,
                    "message": "Une intervention complémentaire semble possible. Veuillez confirmer.",
                    "action": "confirm_needed",
                    "can_create": False,
                    "needs_clarification": True,
                }
            )
            return result

        result.update(
            {
                "status": "not_needed",
                "needed": False,
                "message": "Aucun ordre de travail lié n’est nécessaire.",
                "action": "no_creation",
                "can_create": False,
                "needs_clarification": False,
            }
        )
        return result

    if needed is True and confidence < POSSIBLE_CONFIDENCE_THRESHOLD:
        result.update(
            {
                "status": "possible",
                "message": "Le besoin d’un ordre de travail lié est incertain. Veuillez confirmer.",
                "action": "confirm_needed",
                "can_create": False,
                "needs_clarification": True,
            }
        )
        return result

    if needed is True:
        if not assetnum:
            result.update(
                {
                    "status": "asset_not_found",
                    "message": "Aucun asset fiable n’a été détecté. Veuillez saisir l’asset manuellement.",
                    "action": "ask_asset",
                    "can_create": False,
                    "needs_clarification": True,
                }
            )
            return result

        if asset_confidence < ASSET_CONFIDENCE_THRESHOLD:
            result.update(
                {
                    "status": "asset_ambiguous",
                    "message": "Asset non confirmé. Veuillez choisir l’asset concerné.",
                    "action": "choose_asset",
                    "can_create": False,
                    "needs_clarification": True,
                }
            )
            return result

        result.update(
            {
                "status": "needed",
                "message": "Un ordre de travail lié est recommandé.",
                "action": "fill_form",
                "can_create": True,
                "needs_clarification": False,
            }
        )
        return result

    result.update(
        {
            "status": "partial",
            "message": "Résultat partiel. Veuillez vérifier et compléter les champs.",
            "action": "complete_form",
            "can_create": False,
            "needs_clarification": True,
        }
    )

    return result


def predict_related_workorder_ml(text: str) -> dict:
    try:
        return build_related_wo_decision(text)
    except Exception as exc:
        return {
            "status": "error",
            "model_available": False,
            "needed": None,
            "confidence": 0.0,
            "assetnum": "",
            "asset_confidence": 0.0,
            "asset_candidates": [],
            "message": f"Erreur IA : {str(exc)}",
            "action": "manual",
            "can_create": False,
            "needs_clarification": False,
            "needed_prediction": None,
            "asset_prediction": None,
        }