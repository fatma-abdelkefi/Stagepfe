import os
from typing import List

import joblib
import pandas as pd
from pymongo import MongoClient
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.multioutput import MultiOutputClassifier
from sklearn.pipeline import Pipeline


MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "smartech_ai")
COLLECTION_NAME = "validated_add_workorder_examples"

MODEL_PATH = os.path.join(
    "app",
    "data",
    "models",
    "add_workorder_model_mongo.joblib",
)

TARGET_COLUMNS = [
    "worktype",
    "priority",
    "classification",
]


def load_dataset() -> pd.DataFrame:
    client = MongoClient(MONGO_URI)
    db = client[MONGO_DB_NAME]
    collection = db[COLLECTION_NAME]

    rows: List[dict] = list(collection.find({}))

    if not rows:
        raise RuntimeError(
            f"Aucun exemple trouvé dans MongoDB collection {COLLECTION_NAME}"
        )

    for row in rows:
        row["_id"] = str(row["_id"])

    df = pd.DataFrame(rows)

    required_columns = ["text"] + TARGET_COLUMNS
    missing = [column for column in required_columns if column not in df.columns]

    if missing:
        raise RuntimeError(f"Colonnes manquantes dans le dataset: {missing}")

    df = df.dropna(subset=required_columns)

    if len(df) < 3:
        raise RuntimeError("Dataset insuffisant. Ajoute plus d'exemples MongoDB.")

    df["priority"] = df["priority"].astype(str)

    return df


def train_model(df: pd.DataFrame):
    x = df["text"].astype(str)
    y = df[TARGET_COLUMNS].astype(str)

    model = Pipeline(
        steps=[
            (
                "tfidf",
                TfidfVectorizer(
                    lowercase=True,
                    ngram_range=(1, 2),
                    max_features=5000,
                ),
            ),
            (
                "clf",
                MultiOutputClassifier(
                    LogisticRegression(
                        max_iter=1000,
                        class_weight="balanced",
                    )
                ),
            ),
        ]
    )

    model.fit(x, y)

    return model


def main():
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)

    df = load_dataset()

    print(f"Nombre d'exemples: {len(df)}")
    print("Colonnes utilisées:", TARGET_COLUMNS)

    model = train_model(df)

    joblib.dump(model, MODEL_PATH)

    print("Modèle Add Work Order entraîné avec succès.")
    print(f"Fichier sauvegardé: {MODEL_PATH}")


if __name__ == "__main__":
    main()