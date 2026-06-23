import os
from pathlib import Path

try:
    from dotenv import load_dotenv

    BASE_DIR = Path(__file__).resolve().parents[2]
    ENV_PATH = BASE_DIR / ".env"
    load_dotenv(dotenv_path=ENV_PATH)
except Exception:
    pass


APP_NAME = os.getenv("APP_NAME", "SMARTECH AI Tools")

MODEL_PATH = os.getenv(
    "MODEL_PATH",
    "app/models/failure_model.joblib",
)

MAXIMO_BASE_URL = os.getenv(
    "MAXIMO_BASE_URL",
    "http://demo2.smartech-tn.com/maximo",
).rstrip("/")

MAXIMO_USERNAME = os.getenv(
    "MAXIMO_USERNAME",
    "maxadmin",
)

MAXIMO_PASSWORD = os.getenv(
    "MAXIMO_PASSWORD",
    "maxadmin123",
)

MAXIMO_SITEID = os.getenv(
    "MAXIMO_SITEID",
    "BEDFORD",
)

MAXIMO_PLAN_OS = os.getenv(
    "MAXIMO_PLAN_OS",
    "SM1120",
)

LOCAL_LLM_MODEL = os.getenv(
    "LOCAL_LLM_MODEL",
    "Qwen/Qwen2.5-0.5B-Instruct",
)

LLM_MAX_NEW_TOKENS = int(
    os.getenv("LLM_MAX_NEW_TOKENS", "128")
)

MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb://localhost:27017",
)

MONGO_DB_NAME = os.getenv(
    "MONGO_DB_NAME",
    os.getenv("MONGO_DB", "smartech_ai"),
)

MONGO_DB = MONGO_DB_NAME

MONGO_TRAINING_COLLECTION = os.getenv(
    "MONGO_TRAINING_COLLECTION",
    "training_samples",
)

MONGO_COLLECTION = os.getenv(
    "MONGO_COLLECTION",
    MONGO_TRAINING_COLLECTION,
)

NLP_SERVICE_URL = os.getenv(
    "NLP_SERVICE_URL",
    "http://127.0.0.1:8001",
)