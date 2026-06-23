from typing import Any, Dict, List, Optional
import re


try:
    from app.services.add_workorder.add_workorder_dataset_service import (
        find_validated_add_workorder_example,
    )
except Exception:
    find_validated_add_workorder_example = None


try:
    from app.services.add_workorder.add_workorder_predictor_service import (
        predict_add_workorder_with_ml,
    )
except Exception:
    predict_add_workorder_with_ml = None


try:
    from app.services.add_workorder.maximo_plan_dataset_service import (
        find_planned_activity_suggestions,
        find_planned_labor_suggestions,
        find_planned_material_suggestions,
    )
except Exception:
    find_planned_activity_suggestions = None
    find_planned_labor_suggestions = None
    find_planned_material_suggestions = None


def _clean(value: Any) -> str:
    return str(value or "").strip()


def _normalize(text: Any) -> str:
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


def _extract_assetnum(text: str, context: Optional[Dict[str, Any]] = None) -> str:
    context = context or {}

    if context.get("assetnum"):
        return _clean(context.get("assetnum")).upper()

    candidates = re.findall(
        r"\b[A-Z]{1,5}\d{2,8}\b|\b\d{4,8}\b",
        str(text).upper(),
    )

    for candidate in candidates:
        if candidate not in {"2024", "2025", "2026"}:
            return candidate

    return ""


def _infer_asset_description(assetnum: str) -> str:
    asset = _clean(assetnum).upper()

    if asset == "CS11430":
        return "BEDFORD CS Centrifugal Pump 100 GPM, 60 FT-HD"

    if asset == "12610":
        return "30 Hp Drive Motor- Conveyor System #1"

    return ""


def _infer_location(
    assetnum: str,
    text: str,
    context: Optional[Dict[str, Any]] = None,
) -> str:
    context = context or {}

    if context.get("location"):
        return _clean(context.get("location")).upper()

    asset = _clean(assetnum).upper()

    if asset in {"CS11430", "12610"}:
        return "SHIPPING"

    n = _normalize(text)

    if "shipping" in n:
        return "SHIPPING"

    return ""


def _infer_description(text: str, assetnum: str) -> str:
    clean_text = _clean(text)
    asset = _clean(assetnum).upper()
    n = _normalize(clean_text)

    if "fuite" in n and "vibration" in n:
        return f"Fuite d'huile et vibration anormale sur {asset}" if asset else "Fuite d'huile et vibration anormale"

    if "vibration" in n:
        return f"Vibration anormale sur {asset}" if asset else "Vibration anormale"

    if "fuite" in n:
        return f"Fuite d'huile sur {asset}" if asset else "Fuite d'huile"

    if clean_text:
        return clean_text[:80]

    return "Nouvel ordre de travail"


def _infer_worktype(text: str, context: Optional[Dict[str, Any]] = None) -> str:
    context = context or {}

    if context.get("worktype"):
        return _clean(context.get("worktype")).upper()

    return "CM"


def _infer_priority(text: str, context: Optional[Dict[str, Any]] = None) -> int:
    context = context or {}

    if context.get("priority") is not None:
        try:
            return int(float(str(context.get("priority"))))
        except Exception:
            pass

    n = _normalize(text)

    if any(word in n for word in ["urgent", "critique", "arret", "danger", "importante"]):
        return 1

    return 3


def _fallback_activities(text: str) -> List[Dict[str, Any]]:
    n = _normalize(text)

    if "fuite" in n and "vibration" in n:
        labels = [
            "Contrôler visuellement la fuite d'huile",
            "Mesurer le niveau de vibration",
            "Vérifier l'alignement de la pompe",
            "Inspecter le joint mécanique et les roulements",
        ]
    elif "fuite" in n:
        labels = [
            "Identifier l'origine de la fuite",
            "Contrôler le joint mécanique",
            "Vérifier l'étanchéité après intervention",
        ]
    elif "vibration" in n:
        labels = [
            "Mesurer le niveau de vibration",
            "Vérifier l'alignement",
            "Contrôler les roulements",
        ]
    else:
        labels = [
            "Inspecter l'équipement",
            "Diagnostiquer l'anomalie",
            "Proposer l'action corrective",
        ]

    return [
        {
            "taskid": str((index + 1) * 10),
            "description": label,
            "status": "WAPPR",
            "source": "rules_fallback",
            "sequence": index + 1,
        }
        for index, label in enumerate(labels)
    ]


def _fallback_materials(text: str, assetnum: str = "") -> List[Dict[str, Any]]:
    n = _normalize(text)
    asset = _clean(assetnum).upper()

    # Cas validé dans Maximo pour CS11430.
    if asset == "CS11430" and "fuite" in n:
        return [
            {
                "itemnum": "11453",
                "description": "Seal, Mechanical, Self Aligning- 1 In ID",
                "quantity": 1,
                "location": "CENTRAL",
                "barcode": "",
                "source": "rules_fallback_maximo_known",
            }
        ]

    return []


def _fallback_labor(text: str, assetnum: str = "") -> List[Dict[str, Any]]:
    asset = _clean(assetnum).upper()

    # IMPORTANT :
    # MECHANIC est un craft, pas un laborcode valide.
    # BALDWIN a été testé et accepté par Maximo.
    if asset == "CS11430":
        return [
            {
                "laborcode": "BALDWIN",
                "laborhrs": 1.5,
                "quantity": 1,
                "wplaborid": None,
                "craft": "MECHANIC",
                "source": "rules_fallback_maximo_known",
            }
        ]

    # Pour les autres assets, on ne propose pas de labor invalide.
    return []


def _dedupe_by_description(
    items: List[Dict[str, Any]],
    max_items: int = 4,
) -> List[Dict[str, Any]]:
    seen = set()
    result = []

    for item in items:
        if not isinstance(item, dict):
            continue

        desc = _normalize(item.get("description"))

        if not desc or desc in seen:
            continue

        seen.add(desc)

        result.append(
            {
                "taskid": _clean(item.get("taskid")),
                "description": _clean(item.get("description")),
                "status": "WAPPR",
                "source": _clean(item.get("source")) or "mongodb_maximo_woactivity_examples",
            }
        )

        if len(result) >= max_items:
            break

    return result


def _dedupe_materials(
    items: List[Dict[str, Any]],
    max_items: int = 3,
) -> List[Dict[str, Any]]:
    seen = set()
    result = []

    for item in items:
        if not isinstance(item, dict):
            continue

        itemnum = _clean(item.get("itemnum"))
        description = _clean(item.get("description"))
        location = _clean(item.get("location"))

        key = _normalize(itemnum or description)

        if not key or key in seen:
            continue

        seen.add(key)

        try:
            quantity = int(float(item.get("quantity") or 1))
        except Exception:
            quantity = 1

        result.append(
            {
                "itemnum": itemnum,
                "description": description,
                "quantity": quantity,
                "location": location,
                "barcode": _clean(item.get("barcode")),
                "source": _clean(item.get("source")) or "mongodb_maximo_wpmaterial_examples",
            }
        )

        if len(result) >= max_items:
            break

    return result


def _is_invalid_laborcode(value: Any) -> bool:
    code = _clean(value).upper()

    if not code:
        return True

    # Ces valeurs sont des crafts ou labels génériques, pas des laborcodes Maximo.
    invalid = {
        "MECHANIC",
        "MECHANICS",
        "MECANICIEN",
        "MÉCANICIEN",
        "ELECTRICIAN",
        "ELECTRICIEN",
        "TECHNICIEN",
        "TECHNICIAN",
        "LABOR",
    }

    return code in invalid


def _dedupe_labor(
    items: List[Dict[str, Any]],
    max_items: int = 2,
) -> List[Dict[str, Any]]:
    seen = set()
    result = []

    for item in items:
        if not isinstance(item, dict):
            continue

        laborcode = _clean(item.get("laborcode"))

        # IMPORTANT :
        # Ne pas transformer craft=MECHANIC en laborcode.
        if _is_invalid_laborcode(laborcode):
            continue

        if laborcode in seen:
            continue

        seen.add(laborcode)

        try:
            laborhrs = float(item.get("laborhrs") or item.get("hours") or 1)
        except Exception:
            laborhrs = 1.0

        try:
            quantity = int(float(item.get("quantity") or 1))
        except Exception:
            quantity = 1

        result.append(
            {
                "laborcode": laborcode,
                "laborhrs": laborhrs,
                "quantity": quantity,
                "wplaborid": item.get("wplaborid"),
                "source": _clean(item.get("source")) or "mongodb_maximo_wplabor_examples",
            }
        )

        if len(result) >= max_items:
            break

    return result


def _enrich_materials_for_known_assets(
    materials: List[Dict[str, Any]],
    assetnum: str,
    text: str,
) -> List[Dict[str, Any]]:
    asset = _clean(assetnum).upper()
    enriched: List[Dict[str, Any]] = []

    for material in materials:
        item = dict(material)

        itemnum = _clean(item.get("itemnum"))
        description = _clean(item.get("description"))
        location = _clean(item.get("location"))

        if asset == "CS11430" and not itemnum and "joint" in _normalize(description):
            item["itemnum"] = "11453"
            item["description"] = "Seal, Mechanical, Self Aligning- 1 In ID"
            item["location"] = "CENTRAL"
            item["quantity"] = int(float(item.get("quantity") or 1))
            item["source"] = "rules_enriched_known_material"

        if asset == "CS11430" and _clean(item.get("itemnum")) == "11453" and not location:
            item["location"] = "CENTRAL"

        enriched.append(item)

    return enriched


def _find_plan_suggestions(
    text: str,
    assetnum: str,
    location: str,
    siteid: str,
) -> Dict[str, List[Dict[str, Any]]]:
    activities: List[Dict[str, Any]] = []
    materials: List[Dict[str, Any]] = []
    labor: List[Dict[str, Any]] = []

    if find_planned_activity_suggestions:
        try:
            activities = find_planned_activity_suggestions(
                text=text,
                assetnum=assetnum,
                location=location,
                siteid=siteid,
                limit=4,
            )
        except Exception:
            activities = []

    if find_planned_material_suggestions:
        try:
            materials = find_planned_material_suggestions(
                text=text,
                assetnum=assetnum,
                location=location,
                siteid=siteid,
                limit=3,
            )
        except Exception:
            materials = []

    if find_planned_labor_suggestions:
        try:
            labor = find_planned_labor_suggestions(
                text=text,
                assetnum=assetnum,
                location=location,
                siteid=siteid,
                limit=2,
            )
        except Exception:
            labor = []

    return {
        "activities": activities,
        "materials": materials,
        "labor": labor,
    }


def _apply_prediction_safely(
    current: Dict[str, Any],
    prediction: Optional[Dict[str, Any]],
    detected_assetnum: str,
) -> Dict[str, Any]:
    if not isinstance(prediction, dict):
        return current

    wo = prediction.get("workorder") or prediction

    predicted_asset = _clean(wo.get("assetnum")).upper()
    detected_asset = _clean(detected_assetnum).upper()

    # Si le technicien dit CS11430, on refuse un exemple d'un autre asset.
    if detected_asset and predicted_asset and predicted_asset != detected_asset:
        return current

    return {
        **current,
        "description": wo.get("description") or current.get("description"),
        "long_description": wo.get("long_description") or current.get("long_description"),
        "assetnum": wo.get("assetnum") or current.get("assetnum"),
        "asset_description": wo.get("asset_description") or current.get("asset_description"),
        "location": wo.get("location") or current.get("location"),
        "worktype": wo.get("worktype") or current.get("worktype"),
        "priority": wo.get("priority") or current.get("priority"),
    }


async def suggest_add_workorder(
    text: str,
    context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    context = context or {}

    analysis_text = _clean(
        text
        or context.get("technician_text")
        or context.get("text")
        or context.get("description")
    )

    siteid = _clean(context.get("siteid") or "BEDFORD").upper()
    reportedby = _clean(context.get("reportedby") or "maxadmin")

    assetnum = _extract_assetnum(analysis_text, context)
    asset_description = _infer_asset_description(assetnum)
    location = _infer_location(assetnum, analysis_text, context)

    description = _infer_description(analysis_text, assetnum)

    if location and analysis_text:
        long_description = f"{analysis_text.rstrip('.')} dans l'emplacement {location}."
    else:
        long_description = analysis_text

    worktype = _infer_worktype(analysis_text, context)
    priority = _infer_priority(analysis_text, context)

    validated_example = None
    if find_validated_add_workorder_example:
        try:
            validated_example = find_validated_add_workorder_example(text=analysis_text)
        except Exception:
            validated_example = None

    ml_prediction = None
    if predict_add_workorder_with_ml:
        try:
            ml_prediction = predict_add_workorder_with_ml(
                text=analysis_text,
                context=context,
            )
        except Exception:
            ml_prediction = None

    base_fields = {
        "description": description,
        "long_description": long_description,
        "assetnum": assetnum,
        "asset_description": asset_description,
        "location": location,
        "worktype": worktype,
        "priority": priority,
    }

    base_fields = _apply_prediction_safely(
        current=base_fields,
        prediction=validated_example,
        detected_assetnum=assetnum,
    )

    base_fields = _apply_prediction_safely(
        current=base_fields,
        prediction=ml_prediction,
        detected_assetnum=assetnum,
    )

    description = base_fields["description"]
    long_description = base_fields["long_description"]
    assetnum = base_fields["assetnum"]
    asset_description = base_fields["asset_description"]
    location = base_fields["location"]
    worktype = base_fields["worktype"]
    priority = base_fields["priority"]

    plan_suggestions = _find_plan_suggestions(
        text=analysis_text,
        assetnum=assetnum,
        location=location,
        siteid=siteid,
    )

    activities = _dedupe_by_description(
        plan_suggestions.get("activities") or [],
        max_items=4,
    )

    if not activities:
        activities = _fallback_activities(analysis_text)

    for activity in activities:
        activity["status"] = "WAPPR"

    materials = _dedupe_materials(
        plan_suggestions.get("materials") or [],
        max_items=3,
    )

    materials = _enrich_materials_for_known_assets(
        materials=materials,
        assetnum=assetnum,
        text=analysis_text,
    )

    if not materials:
        materials = _fallback_materials(analysis_text, assetnum)

    labor = _dedupe_labor(
        plan_suggestions.get("labor") or [],
        max_items=2,
    )

    if not labor:
        labor = _fallback_labor(analysis_text, assetnum)

    workorder = {
        "description": description,
        "long_description": long_description,
        "assetnum": assetnum,
        "asset_description": asset_description,
        "location": location,
        "siteid": siteid,
        "status": "WAPPR",
        "priority": int(float(priority or 3)),
        "worktype": worktype,
        "reportedby": reportedby,
        "scheduled_start": context.get("scheduled_start"),
        "scheduled_finish": context.get("scheduled_finish"),
        "target_start": context.get("target_start"),
        "target_finish": context.get("target_finish"),
        "activities": activities,
        "planned_materials": materials,
        "planned_labor": labor,
        "source": "rules_mongodb_ml_maximo_plans",
        "ml_prediction_used": bool(ml_prediction),
        "needs_review": True,
        "auto_save": False,
    }

    return workorder