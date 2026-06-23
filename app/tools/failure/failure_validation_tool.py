from typing import Any, Dict

from app.tools.failure.failure_hierarchy_resolver_tool import resolve_failure_hierarchy


def validate_failure_hierarchy(failure: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validation finale avant enregistrement.

    Règle :
    - Exact match dans la hiérarchie => valide.
    - Correction automatique disponible => pas valide directement,
      car le technicien doit confirmer/corriger dans l'interface.
    """

    result = resolve_failure_hierarchy(failure)

    if result.get("is_valid") and not result.get("auto_corrected"):
        return {
            "success": True,
            "tool": "validate_failure_hierarchy",
            "is_valid": True,
            "confidence_level": "HIGH",
            "warnings": [],
            "matched_source": result.get("matched_source"),
            "matched_example_hash": result.get("matched_example_hash"),
            "failure": result.get("failure"),
        }

    if result.get("is_valid") and result.get("auto_corrected"):
        return {
            "success": True,
            "tool": "validate_failure_hierarchy",
            "is_valid": False,
            "confidence_level": "MEDIUM",
            "warnings": [
                "La combinaison saisie n'était pas exacte. Une correction automatique est disponible, mais le technicien doit confirmer les codes."
            ],
            "suggested_failure": result.get("failure"),
            "failure_before_correction": result.get("failure_before_correction"),
        }

    return {
        "success": True,
        "tool": "validate_failure_hierarchy",
        "is_valid": False,
        "confidence_level": "LOW",
        "warnings": result.get("warnings") or [
            "Combinaison Failure Reporting invalide."
        ],
        "failure": result.get("failure"),
    }