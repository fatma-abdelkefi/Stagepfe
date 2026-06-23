from pathlib import Path

import joblib
import pandas as pd

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.multioutput import MultiOutputClassifier
from sklearn.pipeline import Pipeline


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = BASE_DIR / "data" / "training_data.csv"
MODEL_PATH = BASE_DIR / "models" / "failure_model.joblib"


def main():
    df = pd.read_csv(DATA_PATH)

    required_columns = [
        "text",
        "failure_class",
        "problem",
        "cause",
        "remedy",
    ]

    for col in required_columns:
        if col not in df.columns:
            raise ValueError(f"Colonne manquante: {col}")

    df = df.dropna(subset=required_columns)

    X = df["text"]
    y = df[["failure_class", "problem", "cause", "remedy"]]

    model = Pipeline([
        ("tfidf", TfidfVectorizer(
            lowercase=True,
            ngram_range=(1, 2),
            max_features=5000,
        )),
        ("clf", MultiOutputClassifier(
            LogisticRegression(max_iter=1000)
        )),
    ])

    model.fit(X, y)

    joblib.dump(model, MODEL_PATH)

    print(f"Modèle sauvegardé dans: {MODEL_PATH}")


if __name__ == "__main__":
    main()