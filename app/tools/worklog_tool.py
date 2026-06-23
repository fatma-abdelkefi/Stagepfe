def generate_worklog(text: str, failure: dict) -> str:
    return (
        f"Rapport d’intervention : {text}. "
        f"L’analyse IA propose le problème {failure.get('problem')}, "
        f"la cause {failure.get('cause')} et le remède {failure.get('remedy')}. "
        f"Un contrôle final de l’équipement est recommandé."
    )


def improve_worklog(text: str) -> str:
    clean = text.strip()

    if not clean:
        return "Aucune description fournie."

    return clean[0].upper() + clean[1:]


def validate_worklog(text: str) -> dict:
    missing = []

    if len(text.strip()) < 15:
        missing.append("description trop courte")

    return {
        "is_valid": len(missing) == 0,
        "missing_fields": missing,
    }