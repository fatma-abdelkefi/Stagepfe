from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from pymongo import MongoClient
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.multioutput import MultiOutputClassifier
from sklearn.pipeline import Pipeline
from sklearn.utils import resample

from app.core.config import MONGO_URI, MONGO_DB, MONGO_COLLECTION


BASE_DIR = Path(__file__).resolve().parents[2]
MODEL_PATH = BASE_DIR / "app" / "data" / "models" / "failure_model.joblib"


# =========================================================
# Balance parameters
# =========================================================

# Minimum examples per failure_class during training.
# This does not modify MongoDB. It duplicates rows only in memory.
MIN_EXAMPLES_PER_CLASS = 50

# Maximum examples per failure_class during training.
# This prevents dominant classes like PUMPS from becoming too large.
MAX_EXAMPLES_PER_CLASS = 150

RANDOM_STATE = 42


# =========================================================
# Normalization helpers
# =========================================================

def normalize_text(value: Any) -> str:
    return (
        str(value or "")
        .strip()
        .lower()
        .replace("œ", "oe")
        .replace("’", "'")
        .replace("é", "e")
        .replace("è", "e")
        .replace("ê", "e")
        .replace("ë", "e")
        .replace("à", "a")
        .replace("â", "a")
        .replace("ù", "u")
        .replace("û", "u")
        .replace("î", "i")
        .replace("ï", "i")
        .replace("ô", "o")
        .replace("ç", "c")
    )


def normalize_code(value: Any) -> str:
    return str(value or "").strip().upper()


def list_to_text(value: Any) -> str:
    if not value:
        return ""

    if isinstance(value, list):
        parts: list[str] = []

        for item in value:
            if isinstance(item, dict):
                parts.extend(
                    [
                        str(item.get("description", "") or ""),
                        str(item.get("description_longdescription", "") or ""),
                        str(item.get("long_description", "") or ""),
                        str(item.get("longdescription", "") or ""),
                        str(item.get("logtext", "") or ""),
                        str(item.get("taskid", "") or ""),
                        str(item.get("wonum", "") or ""),
                        str(item.get("itemnum", "") or ""),
                        str(item.get("itemdesc", "") or ""),
                        str(item.get("description_item", "") or ""),
                        str(item.get("laborcode", "") or ""),
                        str(item.get("craft", "") or ""),
                        str(item.get("skilllevel", "") or ""),
                        str(item.get("regularhrs", "") or ""),
                    ]
                )
            else:
                parts.append(str(item))

        return " ".join(part for part in parts if part.strip())

    if isinstance(value, dict):
        return " ".join(str(v) for v in value.values() if str(v).strip())

    return str(value or "")


# =========================================================
# Build training text
# =========================================================

def build_text(doc: dict) -> str:
    metadata = doc.get("metadata") if isinstance(doc.get("metadata"), dict) else {}

    worklogs = (
        doc.get("worklog")
        or doc.get("worklogs")
        or doc.get("workLogs")
        or metadata.get("worklog")
        or metadata.get("workLogs")
        or []
    )

    activities = (
        doc.get("activities")
        or doc.get("woactivity")
        or metadata.get("activities")
        or metadata.get("woactivity")
        or []
    )

    materials = (
        doc.get("actual_materials")
        or doc.get("actualMaterials")
        or doc.get("materials")
        or metadata.get("actual_materials")
        or metadata.get("actualMaterials")
        or metadata.get("materials")
        or []
    )

    labor = (
        doc.get("actual_labor")
        or doc.get("actualLabor")
        or doc.get("labor")
        or metadata.get("actual_labor")
        or metadata.get("actualLabor")
        or metadata.get("labor")
        or []
    )

    parts = [
        doc.get("text", ""),
        doc.get("description", ""),
        doc.get("long_description", ""),
        doc.get("description_longdescription", ""),
        doc.get("longdescription", ""),
        doc.get("details", ""),

        doc.get("worktype", ""),
        doc.get("status", ""),
        doc.get("priority", ""),
        doc.get("wopriority", ""),

        doc.get("assetnum", ""),
        doc.get("asset", ""),
        doc.get("asset_description", ""),
        doc.get("assetDescription", ""),
        doc.get("assetdesc", ""),

        doc.get("location", ""),
        doc.get("location_description", ""),
        doc.get("locationDescription", ""),
        doc.get("locationdesc", ""),

        list_to_text(worklogs),
        list_to_text(activities),
        list_to_text(materials),
        list_to_text(labor),
    ]

    return normalize_text(" ".join(str(part) for part in parts if str(part).strip()))


def normalize_doc(doc: dict) -> dict:
    failure = doc.get("failure") if isinstance(doc.get("failure"), dict) else {}

    failure_class = (
        doc.get("failure_class")
        or doc.get("failurecode")
        or failure.get("failure_class")
        or failure.get("failurecode")
    )

    problem = (
        doc.get("problem")
        or doc.get("problemcode")
        or failure.get("problem")
        or failure.get("problemcode")
    )

    cause = (
        doc.get("cause")
        or doc.get("causecode")
        or failure.get("cause")
        or failure.get("causecode")
    )

    remedy = (
        doc.get("remedy")
        or doc.get("remedycode")
        or failure.get("remedy")
        or failure.get("remedycode")
    )

    return {
        "text": build_text(doc),
        "failure_class": normalize_code(failure_class),
        "problem": normalize_code(problem),
        "cause": normalize_code(cause),
        "remedy": normalize_code(remedy),
        "source": doc.get("source") or "",
        "task": doc.get("task") or "",
        "wonum": doc.get("wonum") or "",
        "siteid": doc.get("siteid") or "",
    }


# =========================================================
# MongoDB loading
# =========================================================

def load_failure_dataset_from_mongodb() -> pd.DataFrame:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")

    col = client[MONGO_DB][MONGO_COLLECTION]

    query = {
        "$or": [
            {"task": "failure_reporting"},
            {"failure_class": {"$exists": True, "$ne": ""}},
            {"failurecode": {"$exists": True, "$ne": ""}},
            {"failure.failure_class": {"$exists": True, "$ne": ""}},
            {"failure.failurecode": {"$exists": True, "$ne": ""}},
        ]
    }

    docs = list(col.find(query))
    rows = [normalize_doc(doc) for doc in docs]

    df = pd.DataFrame(rows)

    for column in ["text", "failure_class", "problem", "cause", "remedy"]:
        if column not in df.columns:
            df[column] = ""

    df = df.fillna("")

    df = df[
        (df["text"].str.strip() != "")
        & (df["failure_class"].str.strip() != "")
        & (df["problem"].str.strip() != "")
        & (df["cause"].str.strip() != "")
        & (df["remedy"].str.strip() != "")
    ]

    df = df.drop_duplicates(
        subset=[
            "text",
            "failure_class",
            "problem",
            "cause",
            "remedy",
        ]
    )

    return df.reset_index(drop=True)


# =========================================================
# Balancing
# =========================================================

def balance_by_failure_class(df: pd.DataFrame) -> pd.DataFrame:
    balanced_parts = []

    print("\nDistribution before balancing:")
    print(df["failure_class"].value_counts())

    for failure_class, group in df.groupby("failure_class"):
        count = len(group)

        if count < MIN_EXAMPLES_PER_CLASS:
            target_size = MIN_EXAMPLES_PER_CLASS
            sampled = resample(
                group,
                replace=True,
                n_samples=target_size,
                random_state=RANDOM_STATE,
            )
        elif count > MAX_EXAMPLES_PER_CLASS:
            target_size = MAX_EXAMPLES_PER_CLASS
            sampled = resample(
                group,
                replace=False,
                n_samples=target_size,
                random_state=RANDOM_STATE,
            )
        else:
            sampled = group

        balanced_parts.append(sampled)

    balanced_df = pd.concat(balanced_parts, ignore_index=True)

    balanced_df = balanced_df.sample(
        frac=1,
        random_state=RANDOM_STATE,
    ).reset_index(drop=True)

    print("\nDistribution after balancing:")
    print(balanced_df["failure_class"].value_counts())

    print(f"\nOriginal rows: {len(df)}")
    print(f"Balanced rows: {len(balanced_df)}")

    return balanced_df


def print_combination_distribution(df: pd.DataFrame) -> None:
    print("\nTop failure combinations:")
    combo_counts = (
        df.groupby(["failure_class", "problem", "cause", "remedy"])
        .size()
        .sort_values(ascending=False)
        .head(30)
    )

    print(combo_counts)


# =========================================================
# Training
# =========================================================

def build_model() -> Pipeline:
    return Pipeline(
        steps=[
            (
                "tfidf",
                TfidfVectorizer(
                    ngram_range=(1, 2),
                    min_df=1,
                    max_features=50000,
                    sublinear_tf=True,
                ),
            ),
            (
                "clf",
                MultiOutputClassifier(
                    LogisticRegression(
                        max_iter=3000,
                        class_weight="balanced",
                        solver="lbfgs",
                    )
                ),
            ),
        ]
    )


def main():
    print("Loading Failure Reporting dataset from MongoDB...")

    df = load_failure_dataset_from_mongodb()

    if df.empty:
        raise ValueError(
            "Aucune donnée Failure Reporting valide trouvée dans MongoDB."
        )

    print(f"Loaded valid rows: {len(df)}")

    print_combination_distribution(df)

    balanced_df = balance_by_failure_class(df)

    X = balanced_df["text"]

    y = balanced_df[
        [
            "failure_class",
            "problem",
            "cause",
            "remedy",
        ]
    ]

    model = build_model()

    print("\nTraining Failure Reporting model...")
    model.fit(X, y)

    bundle = {
        "model": model,
        "model_type": "tfidf_multioutput_logistic_regression_balanced",
        "labels": ["failure_class", "problem", "cause", "remedy"],
        "balance_strategy": {
            "method": "resample_by_failure_class",
            "min_examples_per_class": MIN_EXAMPLES_PER_CLASS,
            "max_examples_per_class": MAX_EXAMPLES_PER_CLASS,
        },
        "confidence_rule": "min_probability_across_outputs",
        "original_rows": len(df),
        "balanced_rows": len(balanced_df),
        "original_distribution": df["failure_class"].value_counts().to_dict(),
        "balanced_distribution": balanced_df["failure_class"].value_counts().to_dict(),
    }

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, MODEL_PATH)

    print(f"\nModel saved to: {MODEL_PATH}")


if __name__ == "__main__":
    main()