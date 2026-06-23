import json
import re
from typing import Any

from app.mcp_server import call_mcp_tool, list_mcp_tools
from app.services.local_llm_service import ask_local_llm

try:
    from app.services.maximo_dataset_service import get_assets_for_workorder_context
except Exception:
    get_assets_for_workorder_context = None


# =========================
# Constants
# =========================

DEFAULT_LLM_ENABLED = False

ALLOWED_TOOLS = {
    "add_workorder",
    "suggest_planned_material",
    "suggest_planned_labor",
    "estimate_labor_hours",
    "generate_activity_steps",
    "summarize_document",
    "suggest_related_workorder",
    "check_safety_risks",
    "predict_failure_reporting",
    "validate_failure_hierarchy",
    "resolve_failure_hierarchy",
    "generate_worklog",
    "validate_worklog",
    "extract_worklog_entities",
    "suggest_priority",
    "get_failure_hierarchy_options",
}


# =========================
# Utils
# =========================

def extract_json(text: str) -> dict:
    if not text:
        return {}

    text = text.strip()

    try:
        value = json.loads(text)
        return value if isinstance(value, dict) else {}
    except Exception:
        pass

    text = re.sub(r"```json|```", "", text, flags=re.IGNORECASE).strip()

    start = text.find("{")
    end = text.rfind("}")

    if start == -1 or end == -1 or end <= start:
        return {}

    try:
        value = json.loads(text[start:end + 1])
        return value if isinstance(value, dict) else {}
    except Exception:
        return {}


def normalize_text(value: Any) -> str:
    return (
        str(value or "")
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
        .strip()
    )


def contains_any(text: str, keywords: list[str]) -> bool:
    return any(keyword in text for keyword in keywords)

def normalize_intent_name(value: Any) -> str:
    intent = normalize_text(value)

    aliases = {
        "failure": "failure",
        "fail": "failure",
        "failure_reporting": "failure",
        "predict_failure": "failure",
        "predict_failure_reporting": "failure",
        "diagnostic_failure": "failure",
        "panne": "failure",
        "defaillance": "failure",

        "add_workorder": "add_workorder",
        "create_workorder": "add_workorder",
        "workorder": "add_workorder",

        "related_workorder": "related_workorder",
        "add_related_workorder": "related_workorder",
        "suggest_related_workorder": "related_workorder",
    }

    return aliases.get(intent, intent)


def list_to_text(value: Any) -> str:
    if not value:
        return ""

    if isinstance(value, list):
        parts = []

        for item in value:
            if isinstance(item, dict):
                parts.extend(
                    [
                        item.get("description", ""),
                        item.get("description_longdescription", ""),
                        item.get("longdescription", ""),
                        item.get("long_description", ""),
                        item.get("logtext", ""),
                        item.get("taskid", ""),
                        item.get("wonum", ""),
                        item.get("itemnum", ""),
                        item.get("itemdesc", ""),
                        item.get("description_item", ""),
                        item.get("laborcode", ""),
                        item.get("craft", ""),
                        item.get("skilllevel", ""),
                        item.get("regularhrs", ""),
                    ]
                )
            else:
                parts.append(str(item))

        return " ".join(str(part) for part in parts if str(part).strip())

    if isinstance(value, dict):
        return " ".join(str(v) for v in value.values() if str(v).strip())

    return str(value or "")


def get_context_text(context: dict) -> str:
    parts = [
        context.get("description", ""),
        context.get("long_description", ""),
        context.get("description_longdescription", ""),
        context.get("longdescription", ""),
        context.get("details", ""),

        context.get("assetnum", ""),
        context.get("asset", ""),
        context.get("asset_description", ""),
        context.get("assetDescription", ""),
        context.get("assetdesc", ""),

        context.get("location", ""),
        context.get("location_description", ""),
        context.get("locationDescription", ""),
        context.get("locationdesc", ""),

        context.get("worktype", ""),
        context.get("status", ""),
        context.get("priority", ""),
        context.get("wopriority", ""),
        context.get("problemcode", ""),
        context.get("failurecode", ""),

        list_to_text(context.get("worklog")),
        list_to_text(context.get("workLogs")),
        list_to_text(context.get("activities")),
        list_to_text(context.get("woactivity")),
        list_to_text(context.get("actual_materials")),
        list_to_text(context.get("actualMaterials")),
        list_to_text(context.get("actual_labor")),
        list_to_text(context.get("actualLabor")),
        list_to_text(context.get("materials")),
        list_to_text(context.get("labor")),
    ]

    return " ".join(str(p) for p in parts if str(p).strip()).strip()


def get_failure_from_context(context: dict) -> dict:
    failure = context.get("failure")

    if isinstance(failure, dict):
        return {
            "failure_class": failure.get("failure_class") or failure.get("failurecode"),
            "problem": failure.get("problem") or failure.get("problemcode"),
            "cause": failure.get("cause") or failure.get("causecode"),
            "remedy": failure.get("remedy") or failure.get("remedycode"),
        }

    return {
        "failure_class": context.get("failure_class") or context.get("failurecode"),
        "problem": context.get("problem") or context.get("problemcode"),
        "cause": context.get("cause") or context.get("causecode"),
        "remedy": context.get("remedy") or context.get("remedycode"),
    }


def normalize_context_for_tools(context: dict, enrich_assets: bool = False) -> dict:
    text = get_context_text(context)
    failure = get_failure_from_context(context)

    enriched_context = dict(context)

    existing_assets = (
        enriched_context.get("related_assets")
        or enriched_context.get("relatedAssets")
        or enriched_context.get("assets")
        or []
    )

    # IMPORTANT :
    # On ne lance la recherche Maximo assets que pour les cas qui en ont besoin.
    # Pour failure reporting, ça provoquait des erreurs OSLC inutiles.
    if enrich_assets and get_assets_for_workorder_context and not existing_assets:
        try:
            maximo_assets = get_assets_for_workorder_context(
                assetnum=enriched_context.get("assetnum") or "",
                location=enriched_context.get("location") or "",
                description=text,
                limit=20,
            )

            if maximo_assets:
                enriched_context["maximo_assets"] = maximo_assets
        except Exception as e:
            print("MAXIMO ASSET CONTEXT ENRICHMENT SKIPPED:", e)

    return {
        "text": text,
        "failure": failure,
        "priority": {
            "priority": context.get("priority") or context.get("wopriority"),
            "urgency": context.get("urgency"),
        },
        "context": enriched_context,
    }
def build_failure_tool_arguments(user_request: str, context: dict | None) -> dict:
    ctx = context or {}

    return {
        "text": user_request,
        "context": ctx,

        "description": ctx.get("description", ""),
        "long_description": ctx.get("long_description", ""),
        "description_longdescription": ctx.get("description_longdescription", ""),
        "longdescription": ctx.get("longdescription", ""),
        "details": ctx.get("details", ""),

        "worklog": ctx.get("worklog", []),
        "workLogs": ctx.get("workLogs", []),
        "activities": ctx.get("activities", []),
        "woactivity": ctx.get("woactivity", []),

        "actual_materials": ctx.get("actual_materials", []),
        "actualMaterials": ctx.get("actualMaterials", []),
        "materials": ctx.get("materials", []),

        "actual_labor": ctx.get("actual_labor", []),
        "actualLabor": ctx.get("actualLabor", []),
        "labor": ctx.get("labor", []),

        "assetnum": ctx.get("assetnum", ""),
        "asset": ctx.get("asset", ""),
        "asset_description": ctx.get("asset_description", ""),
        "assetDescription": ctx.get("assetDescription", ""),
        "assetdesc": ctx.get("assetdesc", ""),

        "location": ctx.get("location", ""),
        "location_description": ctx.get("location_description", ""),
        "locationDescription": ctx.get("locationDescription", ""),
        "locationdesc": ctx.get("locationdesc", ""),

        "status": ctx.get("status", ""),
        "priority": ctx.get("priority", ""),
        "wopriority": ctx.get("wopriority", ""),
        "worktype": ctx.get("worktype", ""),
        "wonum": ctx.get("wonum", ""),
        "siteid": ctx.get("siteid", ""),
    }


# =========================
# Intent detection
# =========================

def detect_intent(user_request: str, context: dict | None = None) -> str:
    context = context or {}

    forced_intent = (
        context.get("force_intent")
        or context.get("intent")
        or context.get("tool_intent")
        or ""
    )

    if forced_intent:
        normalized_forced = normalize_intent_name(forced_intent)

        if normalized_forced in {
            "failure",
            "add_workorder",
            "related_workorder",
            "materials",
            "labor",
            "materials_labor",
            "activities",
            "document",
            "safety",
            "worklog",
            "general",
        }:
            return normalized_forced

    text = normalize_text(
        " ".join(
            [
                str(user_request or ""),
                get_context_text(context),
            ]
        )
    )

    related_workorder_keywords = [
        "work order lie",
        "workorder lie",
        "ordre de travail lie",
        "ot lie",
        "wo lie",
        "work order associe",
        "ordre associe",
        "intervention liee",
        "asset lie",
        "asset principal",
        "equipement lie",
        "equipement associe",
        "autre asset",
        "autre equipement",
        "suivi",
        "controle final",
        "controle complementaire",
        "follow up",
        "follow-up",
        "related work order",
    ]

    add_workorder_keywords = [
        "creer un work order",
        "creer un ordre de travail",
        "nouveau work order",
        "nouvel ordre de travail",
        "ajouter un work order",
        "ajouter un ordre de travail",
        "ouvrir un ot",
        "creer ot",
        "nouvel ot",
        "demande intervention",
        "demande d'intervention",
        "planifier une intervention",
        "planifier une maintenance",
        "generer un work order",
        "generer un ot",
        "creer un ot",
        "créer un ot",
        "creer une intervention",
        "créer une intervention",
        "nouvelle intervention",
    ]

    materials_keywords = [
        "materiel",
        "materiaux",
        "materials",
        "piece",
        "pieces",
        "stock",
        "article",
        "item",
        "filtre",
        "joint",
        "roulement",
        "courroie",
        "huile",
        "graisse",
        "consommable",
    ]

    labor_keywords = [
        "main d",
        "main-d",
        "main d'oeuvre",
        "labor",
        "labour",
        "technicien",
        "techniciens",
        "heure",
        "heures",
        "duree",
        "temps",
        "craft",
        "electricien",
        "mecanicien",
    ]

    activities_keywords = [
        "activite",
        "activites",
        "etape",
        "etapes",
        "checklist",
        "action",
        "actions",
        "procedure intervention",
        "gamme",
    ]

    document_keywords = [
        "document",
        "pdf",
        "resume",
        "resumer",
        "procedure",
        "manuel",
        "instruction",
        "fiche technique",
    ]

    safety_keywords = [
        "securite",
        "danger",
        "risque",
        "risques",
        "epi",
        "ppe",
        "protection",
        "consignation",
        "loto",
        "electrique",
    ]

    failure_keywords = [
        "failure",
        "failure reporting",
        "panne",
        "probleme",
        "problem",
        "defaillance",
        "diagnostic",
        "cause",
        "remedy",
        "remede",
        "classe",
        "failure class",

        "faible pression",
        "low pressure",
        "leak",
        "seal",
        "tuyau bouche",
        "blocked",
        "jam",

        "overheat",
        "demarre pas",
        "startfail",
        "ne demarre pas",

        "vanne bloquee",
        "valve stuck",
        "nosignal",

        "network",
        "reseau",
        "latency",
        "packet loss",
        "performance",

        "fuite",
        "fuite huile",
        "fuite d'huile",
        "vibration",
        "vibration anormale",
        "anormale",
        "huile fuite",
        "joint defectueux",
        "joint mécanique",
        "pompe defectueuse",
    ]

    worklog_keywords = [
        "worklog",
        "rapport",
        "rapport intervention",
        "compte rendu",
        "commentaire",
        "journal",
    ]

    # Important :
    # 1. Related Work Order avant Add Work Order
    # 2. Add Work Order avant Failure
    # 3. On évite que "creer un work order" parte vers related_workorder
    if contains_any(text, related_workorder_keywords):
        return "related_workorder"

    if contains_any(text, add_workorder_keywords):
        return "add_workorder"

    if contains_any(text, failure_keywords):
        return "failure"

    has_materials = contains_any(text, materials_keywords)
    has_labor = contains_any(text, labor_keywords)

    if has_materials and has_labor:
        return "materials_labor"

    if has_materials:
        return "materials"

    if has_labor:
        return "labor"

    if contains_any(text, activities_keywords):
        return "activities"

    if contains_any(text, document_keywords):
        return "document"

    if contains_any(text, safety_keywords):
        return "safety"

    if contains_any(text, worklog_keywords):
        return "worklog"

    return "general"


# =========================
# Rule-based plan
# =========================

def build_rule_based_plan(user_request: str, context: dict) -> dict:
    intent = detect_intent(user_request, context)

    # IMPORTANT :
    # enrich_assets seulement pour add_workorder / related_workorder.
    # Pour failure reporting, on évite les erreurs Maximo asset search.
    normalized = normalize_context_for_tools(
        context,
        enrich_assets=intent in {"add_workorder", "related_workorder"},
    )

    text = " ".join(
        [
            str(user_request or "").strip(),
            str(normalized.get("text") or "").strip(),
        ]
    ).strip()

    failure = normalized["failure"]
    priority = normalized["priority"]

    failure_arguments = build_failure_tool_arguments(
        user_request=text,
        context=context,
    )

    plans = {
        "add_workorder": [
            {
                "tool_name": "add_workorder",
                "arguments": {
                    "text": text,
                    "context": context,
                },
            }
        ],
        "materials": [
            {
                "tool_name": "suggest_planned_material",
                "arguments": {
                    "text": text,
                    "failure": failure,
                    "context": context,
                },
            }
        ],
        "labor": [
            {
                "tool_name": "suggest_planned_labor",
                "arguments": {
                    "text": text,
                    "failure": failure,
                    "context": context,
                },
            },
            {
                "tool_name": "estimate_labor_hours",
                "arguments": {
                    "text": text,
                    "failure": failure,
                    "priority": priority,
                    "context": context,
                },
            },
        ],
        "materials_labor": [
            {
                "tool_name": "suggest_planned_material",
                "arguments": {
                    "text": text,
                    "failure": failure,
                    "context": context,
                },
            },
            {
                "tool_name": "suggest_planned_labor",
                "arguments": {
                    "text": text,
                    "failure": failure,
                    "context": context,
                },
            },
            {
                "tool_name": "estimate_labor_hours",
                "arguments": {
                    "text": text,
                    "failure": failure,
                    "priority": priority,
                    "context": context,
                },
            },
        ],
        "activities": [
            {
                "tool_name": "generate_activity_steps",
                "arguments": {
                    "text": text,
                    "failure": failure,
                    "context": context,
                },
            }
        ],
        "document": [
            {
                "tool_name": "summarize_document",
                "arguments": {
                    "text": context.get("document_text") or text,
                },
            }
        ],
        "related_workorder": [
            {
                "tool_name": "suggest_related_workorder",
                "arguments": {
                    "text": text,
                    "failure": failure,
                    "context": context,
                },
            }
        ],
        "safety": [
            {
                "tool_name": "check_safety_risks",
                "arguments": {
                    "text": text,
                    "context": context,
                },
            }
        ],
        "failure": [
            {
                "tool_name": "predict_failure_reporting",
                "arguments": failure_arguments,
            }
        ],
        "worklog": [
            {
                "tool_name": "generate_worklog",
                "arguments": {
                    "text": text,
                    "failure": failure,
                    "context": context,
                },
            },
            {
                "tool_name": "validate_worklog",
                "arguments": {
                    "text": text,
                    "context": context,
                },
            },
            {
                "tool_name": "extract_worklog_entities",
                "arguments": {
                    "text": text,
                    "context": context,
                },
            },
        ],
        "general": [
            {
                "tool_name": "predict_failure_reporting",
                "arguments": failure_arguments,
            },
            {
                "tool_name": "suggest_priority",
                "arguments": {
                    "text": text,
                    "context": context,
                },
            },
            {
                "tool_name": "check_safety_risks",
                "arguments": {
                    "text": text,
                    "context": context,
                },
            },
        ],
    }

    tool_calls = plans.get(intent, plans["general"])

    if intent == "failure" and any(failure.values()):
        tool_calls.append(
            {
                "tool_name": "validate_failure_hierarchy",
                "arguments": {
                    "failure": failure,
                },
            }
        )

    return {
        "intent": intent,
        "tool_calls": tool_calls,
        "explanation": "Plan généré par règles métier déterministes.",
    }


# =========================
# Optional LLM plan
# =========================

def build_llm_prompt(user_request: str, context: dict) -> str:
    try:
        tools = list_mcp_tools().get("tools", [])
    except Exception:
        tools = list(ALLOWED_TOOLS)

    return f"""
Tu es un orchestrateur IA pour une application IBM Maximo.

Ta mission:
Choisir uniquement les tools nécessaires selon la demande utilisateur.

Tools disponibles:
{json.dumps(tools, ensure_ascii=False)}

Contexte OT:
{json.dumps(context, ensure_ascii=False)}

Demande utilisateur:
{user_request}

Réponds uniquement en JSON valide.

Format obligatoire:
{{
  "intent": "add_workorder|materials|labor|materials_labor|activities|document|related_workorder|safety|failure|worklog|general",
  "tool_calls": [
    {{
      "tool_name": "nom_du_tool",
      "arguments": {{}}
    }}
  ],
  "explanation": "raison courte"
}}

Règles:
- Création nouveau Work Order / nouvel OT / demande intervention => add_workorder.
- OT lié / WO lié / asset lié / suivi / autre équipement associé => suggest_related_workorder.
- Matériel/pièces => suggest_planned_material.
- Main d'œuvre/durée/technicien => suggest_planned_labor + estimate_labor_hours.
- Matériel + main d'œuvre => suggest_planned_material + suggest_planned_labor + estimate_labor_hours.
- Activités/étapes/checklist => generate_activity_steps.
- Document/PDF/procédure => summarize_document.
- Sécurité/risque/EPI => check_safety_risks.
- Failure reporting/diagnostic/panne => predict_failure_reporting.
- Worklog/rapport/compte rendu => generate_worklog + validate_worklog + extract_worklog_entities.
- Ne jamais appeler tous les tools.
- Ne jamais inventer un nom de tool.
- Ne jamais enregistrer automatiquement dans Maximo.
"""


def sanitize_plan(plan: dict, fallback_plan: dict) -> dict:
    if not isinstance(plan, dict):
        return fallback_plan

    tool_calls = plan.get("tool_calls")
    if not isinstance(tool_calls, list):
        return fallback_plan

    clean_calls = []

    for call in tool_calls:
        if not isinstance(call, dict):
            continue

        tool_name = call.get("tool_name")
        arguments = call.get("arguments", {})

        if tool_name not in ALLOWED_TOOLS:
            continue

        if not isinstance(arguments, dict):
            arguments = {}

        clean_calls.append(
            {
                "tool_name": tool_name,
                "arguments": arguments,
            }
        )

    if not clean_calls:
        return fallback_plan

    return {
        "intent": plan.get("intent") or fallback_plan.get("intent") or "general",
        "tool_calls": clean_calls,
        "explanation": plan.get("explanation") or "Plan généré par LLM et validé.",
    }


def try_llm_plan(user_request: str, context: dict, fallback_plan: dict) -> dict:
    try:
        prompt = build_llm_prompt(user_request, context)
        llm_text = ask_local_llm(prompt)
        raw_plan = extract_json(llm_text)
        return sanitize_plan(raw_plan, fallback_plan)

    except Exception as e:
        return {
            "intent": "llm_error",
            "tool_calls": [],
            "explanation": f"LLM non disponible: {str(e)}",
        }


# =========================
# Execute tools
# =========================

def execute_tool_plan(tool_calls: list[dict]) -> list[dict]:
    results = []

    for call in tool_calls:
        tool_name = call.get("tool_name")
        arguments = call.get("arguments", {})

        if tool_name not in ALLOWED_TOOLS:
            results.append(
                {
                    "success": False,
                    "tool": tool_name,
                    "error": "Tool non autorisé.",
                }
            )
            continue

        try:
            result = call_mcp_tool(
                tool_name=tool_name,
                arguments=arguments,
            )

            if isinstance(result, dict):
                if "tool" not in result:
                    result["tool"] = tool_name
                results.append(result)
            else:
                results.append(
                    {
                        "success": True,
                        "tool": tool_name,
                        "result": result,
                    }
                )

        except Exception as e:
            results.append(
                {
                    "success": False,
                    "tool": tool_name,
                    "error": str(e),
                }
            )

    return results


# =========================
# Final answer
# =========================

def generate_final_answer_without_llm(
    user_request: str,
    context: dict,
    plan: dict,
    tool_results: list[dict],
) -> str:
    lines = [
        "Analyse IA terminée.",
        f"Intention détectée : {plan.get('intent')}.",
        "",
    ]

    for result in tool_results:
        if not result.get("success"):
            lines.append(f"Erreur tool {result.get('tool')} : {result.get('error')}")
            lines.append("")
            continue

        tool = result.get("tool")
        value = result.get("result")

        if tool == "add_workorder":
            lines.append("Nouveau Work Order proposé :")

            if isinstance(value, dict):
                workorder = value.get("workorder") or value.get("ui_data", {}).get("workorder") or value

                if isinstance(workorder, dict):
                    lines.append(f"- Description : {workorder.get('description')}")
                    lines.append(f"- Asset : {workorder.get('assetnum')}")
                    lines.append(f"- Location : {workorder.get('location')}")
                    lines.append(f"- Worktype : {workorder.get('worktype')}")
                    lines.append(f"- Priorité : {workorder.get('priority')}")
                    lines.append(f"- Classification : {workorder.get('classification')}")
                    lines.append("- Validation technicien requise avant création Maximo.")

            lines.append("")

        elif tool == "predict_failure_reporting":
            lines.append("Failure reporting proposé :")
            if isinstance(value, dict):
                lines.append(f"- Classe : {value.get('failure_class')}")
                lines.append(f"- Problème : {value.get('problem')}")
                lines.append(f"- Cause : {value.get('cause')}")
                lines.append(f"- Remède : {value.get('remedy')}")
                lines.append(f"- Validation requise : {value.get('validation_required')}")
            lines.append("")

        elif tool == "suggest_related_workorder":
            lines.append("Work order lié :")
            if isinstance(value, dict):
                lines.append(f"- Nécessaire : {value.get('needed')}")
                lines.append(f"- Raison : {value.get('reason')}")
                lines.append(f"- Description proposée : {value.get('suggested_description')}")
                lines.append(f"- Stratégie asset : {value.get('asset_strategy')}")
                lines.append(f"- Asset proposé : {value.get('suggested_assetnum')}")
                lines.append(f"- Justification asset : {value.get('asset_reason')}")
            lines.append("")

        elif tool == "suggest_planned_material":
            lines.append("Matériel planifié recommandé :")
            if isinstance(value, list) and value:
                for item in value:
                    lines.append(
                        f"- {item.get('description')} ({item.get('itemnum')}) "
                        f"x{item.get('quantity')} : {item.get('reason')}"
                    )
            else:
                lines.append("- Aucun matériel planifié recommandé.")
            lines.append("")

        elif tool == "suggest_planned_labor":
            lines.append("Main d’œuvre planifiée recommandée :")
            if isinstance(value, list) and value:
                for item in value:
                    lines.append(
                        f"- {item.get('description')} ({item.get('craft')}) "
                        f"{item.get('planned_hours')} h : {item.get('reason')}"
                    )
            else:
                lines.append("- Aucune main d’œuvre planifiée recommandée.")
            lines.append("")

        elif tool == "estimate_labor_hours":
            lines.append("Estimation de durée :")
            if isinstance(value, dict):
                lines.append(f"- Durée estimée : {value.get('estimated_hours')} h")
                lines.append(f"- Confiance : {value.get('confidence')}")
                lines.append(f"- Justification : {value.get('reason')}")
            lines.append("")

        elif tool == "validate_failure_hierarchy":
            lines.append("Validation failure hierarchy :")
            if isinstance(value, dict):
                lines.append(f"- Valide : {value.get('is_valid')}")
                lines.append(f"- Niveau confiance : {value.get('confidence_level')}")
                for warning in value.get("warnings") or []:
                    lines.append(f"- Alerte : {warning}")
            lines.append("")

        elif tool == "generate_activity_steps":
            lines.append("Étapes d’intervention recommandées :")
            if isinstance(value, list) and value:
                for index, step in enumerate(value, start=1):
                    lines.append(f"{index}. {step}")
            else:
                lines.append("- Aucune étape générée.")
            lines.append("")

        elif tool == "check_safety_risks":
            lines.append("Analyse sécurité :")
            if isinstance(value, dict):
                risks = value.get("risks") or []
                ppe = value.get("ppe") or []
                checklist = value.get("checklist") or []

                if risks:
                    lines.append("- Risques : " + ", ".join(risks))
                if ppe:
                    lines.append("- EPI : " + ", ".join(ppe))
                if checklist:
                    lines.append("- Checklist : " + " | ".join(checklist))
            lines.append("")

        elif tool == "generate_worklog":
            lines.append("Worklog généré :")
            lines.append(str(value))
            lines.append("")

        elif tool == "validate_worklog":
            lines.append("Validation worklog :")
            if isinstance(value, dict):
                lines.append(f"- Valide : {value.get('is_valid')}")
                for field in value.get("missing_fields") or []:
                    lines.append(f"- Champ manquant : {field}")
            lines.append("")

        elif tool == "extract_worklog_entities":
            lines.append("Entités détectées dans le worklog :")
            if isinstance(value, dict):
                for key, val in value.items():
                    lines.append(f"- {key}: {val}")
            lines.append("")

        elif tool == "summarize_document":
            lines.append("Résumé du document :")
            if isinstance(value, dict):
                lines.append(value.get("summary", ""))
            else:
                lines.append(str(value))
            lines.append("")

        elif tool == "suggest_priority":
            lines.append("Priorité recommandée :")
            if isinstance(value, dict):
                lines.append(f"- Priorité : {value.get('priority')}")
                lines.append(f"- Urgence : {value.get('urgency')}")
                lines.append(f"- Raison : {value.get('reason')}")
            lines.append("")

    return "\n".join(lines).strip()


# =========================
# UI data
# =========================

def build_empty_failure() -> dict:
    return {
        "failure_class": None,
        "problem": None,
        "cause": None,
        "remedy": None,
        "confidence": None,
        "validation_required": True,
        "prediction_source": None,
        "hierarchy_resolved": None,
        "auto_corrected": None,
        "hierarchy_validation": None,
        "input_used": None,
        "mongodb_used": None,
        "mongodb_similar_examples_count": 0,
        "mongodb_similar_examples": [],
        "source": "ml_model",
        "tool": "predict_failure_reporting",
        "model": "failure_model.joblib",
    }


def extract_tool_value(result: dict) -> Any:
    if not isinstance(result, dict):
        return result

    # Cas standard MCP
    if "result" in result:
        value = result.get("result")

        if isinstance(value, dict):
            if "prediction" in value:
                return value.get("prediction")

            if "failure_reporting" in value:
                return value.get("failure_reporting")

            if "ui_data" in value and isinstance(value.get("ui_data"), dict):
                ui_data = value.get("ui_data") or {}
                return (
                    ui_data.get("failure_reporting")
                    or ui_data.get("failure")
                    or ui_data.get("workorder")
                    or value
                )

        return value

    # Cas où le tool retourne directement prediction
    if "prediction" in result:
        return result.get("prediction")

    # Cas où le tool retourne ui_data directement
    if "ui_data" in result and isinstance(result.get("ui_data"), dict):
        ui_data = result.get("ui_data") or {}
        return (
            ui_data.get("failure_reporting")
            or ui_data.get("failure")
            or ui_data.get("workorder")
            or result
        )

    return result
def build_ui_data(tool_results: list[dict]) -> dict:
    ui_data = {
        "workorder": None,
        "materials": [],
        "labor": [],
        "estimated_hours": None,
        "failure": None,
        "failure_reporting": None,
        "priority": None,
        "safety": None,
        "activities": [],
        "document_summary": None,
        "related_workorder": None,
        "worklog": None,
        "errors": [],
    }

    for result in tool_results:
        tool = result.get("tool")

        if not result.get("success"):
            ui_data["errors"].append(result)

            if tool == "predict_failure_reporting":
                ui_data["failure"] = build_empty_failure()

            continue

        value = extract_tool_value(result)

        if tool == "add_workorder":
            if isinstance(value, dict):
                if isinstance(value.get("ui_data"), dict):
                    ui_data["workorder"] = value.get("ui_data", {}).get("workorder")
                elif isinstance(value.get("workorder"), dict):
                    ui_data["workorder"] = value.get("workorder")
                else:
                    ui_data["workorder"] = value

        elif tool == "suggest_planned_material":
            ui_data["materials"] = value if isinstance(value, list) else []

        elif tool == "suggest_planned_labor":
            ui_data["labor"] = value if isinstance(value, list) else []

        elif tool == "estimate_labor_hours":
            ui_data["estimated_hours"] = value if isinstance(value, dict) else None

        elif tool == "predict_failure_reporting":
                failure = build_empty_failure()

                if isinstance(value, dict):
                    # Supporte plusieurs formats possibles
                    source_value = (
                        value.get("prediction")
                        or value.get("failure_reporting")
                        or value.get("failure")
                        or value
                    )

                    if isinstance(source_value, dict):
                        failure.update(
                            {
                                "failure_class": (
                                    source_value.get("failure_class")
                                    or source_value.get("failureClass")
                                    or source_value.get("failurecode")
                                ),
                                "problem": (
                                    source_value.get("problem")
                                    or source_value.get("problemcode")
                                ),
                                "cause": (
                                    source_value.get("cause")
                                    or source_value.get("causecode")
                                ),
                                "remedy": (
                                    source_value.get("remedy")
                                    or source_value.get("remedycode")
                                ),
                                "confidence": source_value.get("confidence"),
                                "validation_required": source_value.get("validation_required"),
                                "prediction_source": source_value.get("prediction_source"),
                                "hierarchy_resolved": source_value.get("hierarchy_resolved"),
                                "auto_corrected": source_value.get("auto_corrected"),
                                "hierarchy_validation": source_value.get("hierarchy_validation"),
                                "input_used": source_value.get("input_used"),
                                "mongodb_used": source_value.get("mongodb_used"),
                                "mongodb_similar_examples_count": source_value.get(
                                    "mongodb_similar_examples_count"
                                ),
                                "mongodb_similar_examples": source_value.get(
                                    "mongodb_similar_examples"
                                ),
                            }
                        )

                ui_data["failure"] = failure
                ui_data["failure_reporting"] = failure
        elif tool == "suggest_priority":
            ui_data["priority"] = value if isinstance(value, dict) else None

        elif tool == "check_safety_risks":
            ui_data["safety"] = value if isinstance(value, dict) else None

        elif tool == "generate_activity_steps":
            ui_data["activities"] = value if isinstance(value, list) else []

        elif tool == "summarize_document":
            ui_data["document_summary"] = value

        elif tool == "suggest_related_workorder":
            ui_data["related_workorder"] = value if isinstance(value, dict) else None

        elif tool == "generate_worklog":
            ui_data["worklog"] = value

    return ui_data


# =========================
# Main assistant
# =========================

def llm_assistant(
    user_request: str,
    context: dict | None = None,
    use_llm_planner: bool = DEFAULT_LLM_ENABLED,
) -> dict:
    context = context or {}

    rule_plan = build_rule_based_plan(user_request, context)

    if use_llm_planner:
        llm_raw_plan = try_llm_plan(user_request, context, rule_plan)
        final_plan = llm_raw_plan if llm_raw_plan.get("tool_calls") else rule_plan
    else:
        llm_raw_plan = {
            "intent": "disabled",
            "tool_calls": [],
            "explanation": "Plan sécurisé par couche métier déterministe.",
        }
        final_plan = rule_plan

    tool_results = execute_tool_plan(final_plan.get("tool_calls", []))

    final_answer = generate_final_answer_without_llm(
        user_request=user_request,
        context=context,
        plan=final_plan,
        tool_results=tool_results,
    )

    ui_data = build_ui_data(tool_results)

    prediction = (
        ui_data.get("failure_reporting")
        or ui_data.get("failure")
    )

    success = not bool(ui_data.get("errors"))

    # Si le tool predict_failure_reporting a retourné une failure vide,
    # on considère quand même que la route a répondu proprement.
    if final_plan.get("intent") == "failure" and prediction:
        success = Trueprediction = (
        ui_data.get("failure_reporting")
        or ui_data.get("failure")
    )

    success = not bool(ui_data.get("errors"))

    # Si le tool predict_failure_reporting a retourné une failure vide,
    # on considère quand même que la route a répondu proprement.
    if final_plan.get("intent") == "failure" and prediction:
        success = True
        prediction = (
        ui_data.get("failure_reporting")
        or ui_data.get("failure")
    )

    normalized_intent = (
        "failure_reporting"
        if final_plan.get("intent") == "failure"
        else final_plan.get("intent")
    )

    success = not bool(ui_data.get("errors"))

    if final_plan.get("intent") == "failure" and prediction:
        success = True
        

        return {
        "success": success,
        "intent": final_plan.get("intent"),
        "normalized_intent": normalized_intent,
        "user_request": user_request,
        "context": context,
        "llm_raw_plan": llm_raw_plan,
        "llm_plan": final_plan,
        "tool_results": tool_results,

        "prediction": prediction,
        "failure_reporting": prediction,

        "ui_data": ui_data,
        "final_answer": final_answer,
    }