import re
from typing import Any, Dict, List, Optional

from pymongo import MongoClient

from app.core.config import MONGO_DB_NAME, MONGO_URI


def _db():
    client = MongoClient(MONGO_URI)
    return client[MONGO_DB_NAME]


def _normalize_text(text: Any) -> str:
    return (
        str(text or "")
        .lower()
        .replace("é", "e")
        .replace("è", "e")
        .replace("ê", "e")
        .replace("ë", "e")
        .replace("à", "a")
        .replace("ç", "c")
        .replace("ù", "u")
        .strip()
    )


def _regex(value: str) -> Dict[str, Any]:
    return {
        "$regex": re.escape(_normalize_text(value)),
        "$options": "i",
    }


def _translate_activity(description: str) -> str:
    text = str(description or "").strip()

    translations = {
        "Check pump operation.": "Contrôler le fonctionnement de la pompe.",
        "Check pump float switch.": "Contrôler le flotteur de la pompe.",
        "Check housing for leaks.": "Vérifier l’absence de fuite au niveau du corps de pompe.",
        "Replace mechanical seal.": "Remplacer le joint mécanique.",
        "Check for leaks.": "Vérifier l’absence de fuite.",
        "Check pump operation": "Contrôler le fonctionnement de la pompe.",
        "Replace impeller, shaft, seal and housing.": "Remplacer la roue, l’arbre, le joint et le corps de pompe.",
        "Inspect gear reducer unit. Check gear box oil.": "Inspecter le réducteur et contrôler l’huile du boîtier.",
    }

    if text in translations:
        return translations[text]

    replacements = [
        ("Check", "Contrôler"),
        ("Inspect", "Inspecter"),
        ("Replace", "Remplacer"),
        ("pump", "pompe"),
        ("Pump", "Pompe"),
        ("operation", "fonctionnement"),
        ("float switch", "flotteur"),
        ("housing", "corps"),
        ("leaks", "fuites"),
        ("leak", "fuite"),
        ("mechanical seal", "joint mécanique"),
        ("seal", "joint"),
        ("bearing", "roulement"),
        ("shaft", "arbre"),
        ("impeller", "roue"),
        ("oil", "huile"),
    ]

    result = text
    for source, target in replacements:
        result = result.replace(source, target)

    return result


def _translate_material(description: str) -> str:
    text = str(description or "").strip()

    translations = {
        "Seal, Mechanical, Self Aligning- 1 In ID":
            "Joint mécanique auto-alignant - diamètre intérieur 1 po",
        "Housing- Centrifugal Pump":
            "Corps de pompe centrifuge",
        "Tubing, Copper- 15/16 In ID X .030 In Wall":
            "Tube en cuivre - diamètre intérieur 15/16 po x épaisseur 0,030 po",
        "Shaft- 1 Inch Dia":
            "Arbre - diamètre 1 po",
    }

    if text in translations:
        return translations[text]

    replacements = [
        ("Seal", "Joint"),
        ("Mechanical", "mécanique"),
        ("Self Aligning", "auto-alignant"),
        ("Housing", "Corps"),
        ("Centrifugal Pump", "pompe centrifuge"),
        ("Pump", "pompe"),
        ("Tubing", "Tube"),
        ("Copper", "cuivre"),
        ("Shaft", "Arbre"),
        ("Bearing", "Roulement"),
        ("In ID", "po diamètre intérieur"),
        ("In Wall", "po épaisseur"),
        ("Dia", "diamètre"),
    ]

    result = text
    for source, target in replacements:
        result = result.replace(source, target)

    return result


def _keywords_for_problem(text: str, asset: Optional[Dict] = None) -> List[str]:
    value = _normalize_text(text)
    asset_text = _normalize_text(
        f"{(asset or {}).get('description', '')} "
        f"{(asset or {}).get('asset_description', '')}"
    )

    keywords: List[str] = []

    if "fuite" in value or "huile" in value:
        keywords.extend(["fuite", "leak", "seal", "joint", "gasket", "oil"])

    if "vibration" in value or "vibre" in value:
        keywords.extend(["vibration", "bearing", "roulement", "alignment", "shaft", "pump"])

    if "bruit" in value:
        keywords.extend(["noise", "bruit", "bearing", "roulement", "lubrication"])

    if "surchauffe" in value or "chauffe" in value:
        keywords.extend(["temperature", "heat", "thermal", "fan", "sensor"])

    if "pompe" in value or "pump" in asset_text:
        keywords.extend(["pump", "pompe", "seal", "bearing", "impeller", "shaft", "housing"])

    if "moteur" in value or "motor" in asset_text:
        keywords.extend(["motor", "moteur", "bearing", "shaft"])

    if not keywords:
        keywords.extend(["check", "inspect", "maintenance"])

    unique: List[str] = []
    for keyword in keywords:
        if keyword not in unique:
            unique.append(keyword)

    return unique


def _score_doc(doc: Dict[str, Any], keywords: List[str], text: str) -> int:
    search_text = _normalize_text(doc.get("search_text"))
    description = _normalize_text(doc.get("description"))
    text_value = _normalize_text(text)

    score = 0

    for keyword in keywords:
        key = _normalize_text(keyword)

        if key and key in search_text:
            score += 2

        if key and key in description:
            score += 4

    if doc.get("assetnum") and _normalize_text(doc.get("assetnum")) in text_value:
        score += 5

    if doc.get("wo_location") and _normalize_text(doc.get("wo_location")) in text_value:
        score += 2

    return score


def find_planned_activity_suggestions(
    text: str,
    asset: Optional[Dict] = None,
    context: Optional[Dict] = None,
    limit: int = 4,
) -> List[Dict[str, Any]]:
    context = context or {}
    db = _db()

    keywords = _keywords_for_problem(text, asset)
    or_query = [{"search_text": _regex(keyword)} for keyword in keywords]

    query: Dict[str, Any] = {}
    if or_query:
        query["$or"] = or_query

    siteid = context.get("siteid") or (asset or {}).get("siteid")
    if siteid:
        query["siteid"] = siteid

    docs = list(db.maximo_woactivity_examples.find(query).limit(300))

    if not docs and siteid:
        query.pop("siteid", None)
        docs = list(db.maximo_woactivity_examples.find(query).limit(300))

    docs.sort(key=lambda doc: _score_doc(doc, keywords, text), reverse=True)

    result: List[Dict[str, Any]] = []
    seen = set()

    for doc in docs:
        description_original = str(doc.get("description") or "").strip()
        description_fr = _translate_activity(description_original)
        taskid = str(doc.get("taskid") or "").strip()

        if not description_fr:
            continue

        key = description_fr.lower()
        if key in seen:
            continue

        seen.add(key)

        result.append(
            {
                "taskid": taskid,
                "description": description_fr,
                "status": "WAPPR",
                "source": "mongodb_maximo_woactivity_examples",
                "original_description": description_original,
                "original_status": doc.get("status"),
            }
        )

        if len(result) >= limit:
            break

    return result


def find_planned_material_suggestions(
    text: str,
    asset: Optional[Dict] = None,
    context: Optional[Dict] = None,
    limit: int = 3,
) -> List[Dict[str, Any]]:
    context = context or {}
    db = _db()

    keywords = _keywords_for_problem(text, asset)
    or_query = [{"search_text": _regex(keyword)} for keyword in keywords]

    query: Dict[str, Any] = {}
    if or_query:
        query["$or"] = or_query

    siteid = context.get("siteid") or (asset or {}).get("siteid")
    if siteid:
        query["siteid"] = siteid

    docs = list(db.maximo_wpmaterial_examples.find(query).limit(300))

    if not docs and siteid:
        query.pop("siteid", None)
        docs = list(db.maximo_wpmaterial_examples.find(query).limit(300))

    docs.sort(key=lambda doc: _score_doc(doc, keywords, text), reverse=True)

    result: List[Dict[str, Any]] = []
    seen = set()

    for doc in docs:
        itemnum = str(doc.get("itemnum") or "").strip()
        description_original = str(doc.get("description") or "").strip()
        description_fr = _translate_material(description_original)
        location = str(doc.get("location") or "").strip()

        if not itemnum and not description_fr:
            continue

        key = (itemnum, description_fr)

        if key in seen:
            continue

        seen.add(key)

        result.append(
            {
                "itemnum": itemnum,
                "description": description_fr,
                "quantity": doc.get("quantity") or 1,
                "location": location,
                "source": "mongodb_maximo_wpmaterial_examples",
                "original_description": description_original,
            }
        )

        if len(result) >= limit:
            break

    return result


def find_planned_labor_suggestions(
    text: str,
    asset: Optional[Dict] = None,
    context: Optional[Dict] = None,
    limit: int = 1,
) -> List[Dict[str, Any]]:
    context = context or {}
    db = _db()

    siteid = context.get("siteid") or (asset or {}).get("siteid")

    query: Dict[str, Any] = {}
    if siteid:
        query["siteid"] = siteid

    docs = list(db.maximo_wplabor_examples.find(query).limit(300))

    if not docs and siteid:
        docs = list(db.maximo_wplabor_examples.find({}).limit(300))

    keywords = _keywords_for_problem(text, asset)
    docs.sort(key=lambda doc: _score_doc(doc, keywords, text), reverse=True)

    result: List[Dict[str, Any]] = []
    seen = set()

    for doc in docs:
        laborcode = str(doc.get("laborcode") or "").strip()

        if not laborcode:
            continue

        if laborcode in seen:
            continue

        seen.add(laborcode)

        result.append(
            {
                "laborcode": laborcode,
                "laborhrs": doc.get("laborhrs") or 1,
                "quantity": doc.get("quantity") or 1,
                "wplaborid": doc.get("wplaborid"),
                "source": "mongodb_maximo_wplabor_examples",
            }
        )

        if len(result) >= limit:
            break

    return result