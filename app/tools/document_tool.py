def summarize_document(text: str) -> dict:
    clean = " ".join(text.split())

    if len(clean) <= 500:
        summary = clean
    else:
        summary = clean[:500] + "..."

    return {
        "summary": summary,
        "length": len(clean),
        "note": "Résumé local basé sur extraction simple du contenu.",
    }