from typing import Any, Dict, List

from pymongo import MongoClient

from app.core.config import MONGO_URI, MONGO_DB, MONGO_COLLECTION


def normalize(value: Any) -> str:
    return str(value or "").strip().upper()


def get_collection():
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")
    return client[MONGO_DB][MONGO_COLLECTION]


def unique_sorted(values: List[str]) -> List[str]:
    cleaned = sorted({normalize(v) for v in values if normalize(v)})
    return cleaned


def get_failure_hierarchy_options(
    level: str,
    failure_class: str | None = None,
    problem: str | None = None,
    cause: str | None = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Retourne les choix hiérarchiques Failure Reporting depuis MongoDB.

    level:
      - failure_class
      - problem
      - cause
      - remedy
    """

    level = normalize(level).lower()

    failure_class_n = normalize(failure_class)
    problem_n = normalize(problem)
    cause_n = normalize(cause)

    col = get_collection()

    base_query = {
        "task": "failure_reporting",
    }

    if level == "failure_class":
        docs = col.find(base_query, {"failure_class": 1, "failure.failure_class": 1})

        values = []
        for doc in docs:
            values.append(doc.get("failure_class"))
            failure = doc.get("failure") if isinstance(doc.get("failure"), dict) else {}
            values.append(failure.get("failure_class"))

        return {
            "success": True,
            "tool": "get_failure_hierarchy_options",
            "level": "failure_class",
            "options": unique_sorted(values),
        }

    if level == "problem":
        if not failure_class_n:
            return {
                "success": False,
                "tool": "get_failure_hierarchy_options",
                "error": "failure_class is required for problem options",
                "options": [],
            }

        query = {
            **base_query,
            "$or": [
                {"failure_class": failure_class_n},
                {"failure.failure_class": failure_class_n},
            ],
        }

        docs = col.find(query, {"problem": 1, "failure.problem": 1})

        values = []
        for doc in docs:
            values.append(doc.get("problem"))
            failure = doc.get("failure") if isinstance(doc.get("failure"), dict) else {}
            values.append(failure.get("problem"))

        return {
            "success": True,
            "tool": "get_failure_hierarchy_options",
            "level": "problem",
            "failure_class": failure_class_n,
            "options": unique_sorted(values),
        }

    if level == "cause":
        if not failure_class_n or not problem_n:
            return {
                "success": False,
                "tool": "get_failure_hierarchy_options",
                "error": "failure_class and problem are required for cause options",
                "options": [],
            }

        query = {
            **base_query,
            "$or": [
                {
                    "failure_class": failure_class_n,
                    "problem": problem_n,
                },
                {
                    "failure.failure_class": failure_class_n,
                    "failure.problem": problem_n,
                },
            ],
        }

        docs = col.find(query, {"cause": 1, "failure.cause": 1})

        values = []
        for doc in docs:
            values.append(doc.get("cause"))
            failure = doc.get("failure") if isinstance(doc.get("failure"), dict) else {}
            values.append(failure.get("cause"))

        return {
            "success": True,
            "tool": "get_failure_hierarchy_options",
            "level": "cause",
            "failure_class": failure_class_n,
            "problem": problem_n,
            "options": unique_sorted(values),
        }

    if level == "remedy":
        if not failure_class_n or not problem_n or not cause_n:
            return {
                "success": False,
                "tool": "get_failure_hierarchy_options",
                "error": "failure_class, problem and cause are required for remedy options",
                "options": [],
            }

        query = {
            **base_query,
            "$or": [
                {
                    "failure_class": failure_class_n,
                    "problem": problem_n,
                    "cause": cause_n,
                },
                {
                    "failure.failure_class": failure_class_n,
                    "failure.problem": problem_n,
                    "failure.cause": cause_n,
                },
            ],
        }

        docs = col.find(query, {"remedy": 1, "failure.remedy": 1})

        values = []
        for doc in docs:
            values.append(doc.get("remedy"))
            failure = doc.get("failure") if isinstance(doc.get("failure"), dict) else {}
            values.append(failure.get("remedy"))

        return {
            "success": True,
            "tool": "get_failure_hierarchy_options",
            "level": "remedy",
            "failure_class": failure_class_n,
            "problem": problem_n,
            "cause": cause_n,
            "options": unique_sorted(values),
        }

    return {
        "success": False,
        "tool": "get_failure_hierarchy_options",
        "error": f"Unknown level: {level}",
        "options": [],
    }