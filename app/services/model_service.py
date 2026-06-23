from pathlib import Path

import joblib
import numpy as np

from app.core.config import MODEL_PATH

_model = None


def load_model():
    global _model

    if _model is None:
        path = Path(MODEL_PATH)

        if not path.exists():
            raise FileNotFoundError(
                f"Modèle introuvable: {path}. Lance l'entraînement avant."
            )

        _model = joblib.load(path)

    return _model


def get_vectorized_text(model, text: str):
    vectorizer = model.named_steps["tfidf"]
    return vectorizer.transform([text])


def get_classifier(model):
    return model.named_steps["clf"]


def get_prediction_confidence(model, text: str) -> float:
    clf = get_classifier(model)
    x_vec = get_vectorized_text(model, text)

    if not hasattr(clf, "predict_proba"):
        return 0.0

    probabilities = clf.predict_proba(x_vec)

    max_probs = []

    for proba in probabilities:
        max_probs.append(float(np.max(proba[0])))

    if not max_probs:
        return 0.0

    return round(float(np.mean(max_probs)), 4)


def get_top_predictions(model, text: str) -> dict:
    clf = get_classifier(model)
    x_vec = get_vectorized_text(model, text)

    targets = ["failure_class", "problem", "cause", "remedy"]

    if not hasattr(clf, "predict_proba"):
        return {}

    probabilities = clf.predict_proba(x_vec)

    result = {}

    for target, estimator, proba in zip(targets, clf.estimators_, probabilities):
        classes = estimator.classes_
        scores = proba[0]

        top_items = sorted(
            zip(classes, scores),
            key=lambda item: item[1],
            reverse=True,
        )[:3]

        result[target] = [
            {
                "value": str(value),
                "confidence": round(float(score), 4),
            }
            for value, score in top_items
        ]

    return result


def predict_failure(text: str) -> dict:
    model = load_model()

    prediction = model.predict([text])[0]
    confidence = get_prediction_confidence(model, text)
    top_predictions = get_top_predictions(model, text)

    return {
        "failure_class": str(prediction[0]),
        "problem": str(prediction[1]),
        "cause": str(prediction[2]),
        "remedy": str(prediction[3]),
        "confidence": confidence,
        "top_predictions": top_predictions,
    }