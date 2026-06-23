import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT_DIR))

import joblib
import pandas as pd
from pymongo import MongoClient
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from app.core.config import (
    MONGO_COLLECTION,
    MONGO_DB,
    MONGO_URI,
    RELATED_WO_ASSET_MODEL_PATH,
    RELATED_WO_MODEL_PATH,
)


def safe(value):
    return "" if value is None else str(value).strip()


def load_rows():
    client = MongoClient(MONGO_URI)
    col = client[MONGO_DB][MONGO_COLLECTION]

    docs = list(
        col.find(
            {
                "$or": [
                    {"ml_training.related_workorder_ready": True},
                    {"labels.intent": "related_workorder"},
                    {"record_type": "generated_related_workorder"},
                    {"record_type": "validated_related_workorder_example"},
                ]
            },
            {
                "_id": 0,
                "search_text": 1,
                "ml_training.input_text": 1,
                "labels.related_workorder_needed": 1,
                "related_workorder.needed": 1,
                "asset.assetnum": 1,
                "asset.description": 1,
                "assetnum": 1,
                "related_workorder.assetnum": 1,
            },
        )
    )

    rows = []

    for doc in docs:
        ml = doc.get("ml_training") or {}
        labels = doc.get("labels") or {}
        rwo = doc.get("related_workorder") or {}
        asset = doc.get("asset") or {}

        text = safe(ml.get("input_text")) or safe(doc.get("search_text"))

        needed = labels.get("related_workorder_needed")
        if needed is None:
            needed = rwo.get("needed")

        assetnum = (
            safe(rwo.get("assetnum"))
            or safe(asset.get("assetnum"))
            or safe(doc.get("assetnum"))
        )

        asset_desc = safe(asset.get("description"))

        final_text = " ".join([text, assetnum, asset_desc]).strip()

        if final_text and needed is not None:
            rows.append(
                {
                    "text": final_text,
                    "needed": bool(needed),
                    "assetnum": assetnum,
                }
            )

    return pd.DataFrame(rows)


def train_binary_model(df: pd.DataFrame):
    print("\nTraining related_workorder_needed model")
    print("=" * 70)
    print(df["needed"].value_counts())

    if df["needed"].nunique() < 2:
        print("Not enough classes to train needed model.")
        return

    min_class_count = df["needed"].value_counts().min()

    stratify = df["needed"] if min_class_count >= 2 else None

    X_train, X_test, y_train, y_test = train_test_split(
        df["text"],
        df["needed"],
        test_size=0.2,
        random_state=42,
        stratify=stratify,
    )

    model = Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    ngram_range=(1, 2),
                    max_features=15000,
                    min_df=1,
                ),
            ),
            (
                "clf",
                LogisticRegression(
                    max_iter=2000,
                    class_weight="balanced",
                ),
            ),
        ]
    )

    model.fit(X_train, y_train)
    pred = model.predict(X_test)

    acc = accuracy_score(y_test, pred)

    print(f"Accuracy related_workorder_needed: {acc:.4f}")
    print(classification_report(y_test, pred, zero_division=0))

    Path(RELATED_WO_MODEL_PATH).parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, RELATED_WO_MODEL_PATH)

    print("Model saved:", RELATED_WO_MODEL_PATH)


def train_asset_model(df: pd.DataFrame):
    print("\nTraining related_workorder_asset model")
    print("=" * 70)

    asset_df = df[
        (df["needed"] == True)
        & (df["assetnum"].astype(str).str.strip() != "")
    ].copy()

    counts = asset_df["assetnum"].value_counts()
    valid_classes = counts[counts >= 3].index

    asset_df = asset_df[asset_df["assetnum"].isin(valid_classes)].copy()

    print(asset_df["assetnum"].value_counts())

    if len(asset_df) < 20 or asset_df["assetnum"].nunique() < 2:
        print("Not enough data to train asset model.")
        return

    min_class_count = asset_df["assetnum"].value_counts().min()
    stratify = asset_df["assetnum"] if min_class_count >= 2 else None

    X_train, X_test, y_train, y_test = train_test_split(
        asset_df["text"],
        asset_df["assetnum"],
        test_size=0.2,
        random_state=42,
        stratify=stratify,
    )

    model = Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    analyzer="char_wb",
                    ngram_range=(3, 5),
                    max_features=20000,
                    min_df=1,
                ),
            ),
            (
                "clf",
                LogisticRegression(
                    max_iter=3000,
                    class_weight="balanced",
                ),
            ),
        ]
    )

    model.fit(X_train, y_train)
    pred = model.predict(X_test)

    acc = accuracy_score(y_test, pred)

    print(f"Accuracy related_workorder_asset: {acc:.4f}")
    print(classification_report(y_test, pred, zero_division=0))

    Path(RELATED_WO_ASSET_MODEL_PATH).parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, RELATED_WO_ASSET_MODEL_PATH)

    print("Model saved:", RELATED_WO_ASSET_MODEL_PATH)


def main():
    print("Loading related workorder dataset from MongoDB...")
    df = load_rows()

    print("Total rows:", len(df))

    if df.empty:
        print("No related workorder training data found.")
        return

    print("\nDataset balance:")
    print(df["needed"].value_counts())

    print("\nTop assets:")
    print(df["assetnum"].value_counts().head(20))

    train_binary_model(df)
    train_asset_model(df)


if __name__ == "__main__":
    main()