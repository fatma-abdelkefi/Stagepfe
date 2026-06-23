import { API_CONFIG } from '../../../shared/config/api';
import type {
  AiFailurePredictionRequest,
  AiFailurePredictionResponse,
  LlmAssistantResponse,
} from '../types/failureReporting.types';

async function handleJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(text || `HTTP ${response.status}`);
  }

  if (!response.ok) {
    throw new Error(
      data?.detail || data?.message || text || `HTTP ${response.status}`,
    );
  }

  return data as T;
}

function cleanText(value: any): string {
  return String(value || '').trim();
}

function buildAssistantText(payload: AiFailurePredictionRequest): string {
  const parts = [
    'Failure Reporting Maximo. Prédire failure_class, problem, cause et remedy à partir du Work Order complet.',

    payload.description ? `Description: ${payload.description}` : '',
    payload.long_description
      ? `Description longue: ${payload.long_description}`
      : '',

    payload.assetnum ? `Asset: ${payload.assetnum}` : '',
    payload.location ? `Location: ${payload.location}` : '',

    ...(payload.worklog || []).map(item => `Worklog: ${item}`),
    ...(payload.activities || []).map(item => `Activité: ${item}`),
    ...(payload.actual_materials || []).map(item => `Matériel: ${item}`),
    ...(payload.actual_labor || []).map(item => `Main d'oeuvre: ${item}`),
  ];

  return parts
    .map(cleanText)
    .filter(Boolean)
    .join('\n');
}

function mapLlmFailureToAiResponse(
  data: LlmAssistantResponse,
): AiFailurePredictionResponse {
  const failure = data?.ui_data?.failure;

  if (!failure) {
    throw new Error('Aucune prédiction Failure Reporting retournée par l’IA.');
  }

  return {
    failure_class: failure.failure_class ?? null,
    failure_class_description: failure.failure_class_description ?? null,

    problem: failure.problem ?? null,
    problem_description: failure.problem_description ?? null,

    cause: failure.cause ?? null,
    cause_description: failure.cause_description ?? null,

    remedy: failure.remedy ?? null,
    remedy_description: failure.remedy_description ?? null,

    confidence: failure.confidence ?? undefined,

    low_confidence:
      typeof failure.confidence === 'number'
        ? failure.confidence < 0.6
        : false,

    validation_required:
      typeof failure.confidence === 'number'
        ? failure.confidence < 0.6
        : true,

    recommendation_message:
      data.final_answer ||
      'Prédiction Failure Reporting générée à partir du Work Order complet.',

    models: {
      source: failure.source,
      tool: failure.tool,
      model: failure.model,
      validation_required: failure.validation_required,
      mongodb_used: failure.mongodb_used,
      mongodb_similar_examples_count:
        failure.mongodb_similar_examples_count,
      mongodb_similar_examples: failure.mongodb_similar_examples,
      intent: data.intent,
      raw: data,
    },
  };
}

export async function predictFailureWithAI(
  payload: AiFailurePredictionRequest,
): Promise<AiFailurePredictionResponse> {
  const baseUrl = API_CONFIG.AI_BASE_URL.replace(/\/+$/, '');
  const assistantUrl = `${baseUrl}/ai/llm/assistant`;

  const text = buildAssistantText(payload);

  const response = await fetch(assistantUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      text,
      context: {
        description: payload.description,
        long_description: payload.long_description,
        worklog: payload.worklog || [],
        activities: payload.activities || [],
        actual_materials: payload.actual_materials || [],
        actual_labor: payload.actual_labor || [],
        assetnum: payload.assetnum,
        location: payload.location,
        lang: payload.lang,
        debug: payload.debug,
      },
    }),
  });

  const data = await handleJsonResponse<LlmAssistantResponse>(response);

  const failure = data?.ui_data?.failure;

  if (
    !failure?.failure_class &&
    !failure?.problem &&
    !failure?.cause &&
    !failure?.remedy
  ) {
    throw new Error(
      `Aucune prédiction Failure Reporting retournée. Intent détecté : ${data.intent}`,
    );
  }

  return mapLlmFailureToAiResponse(data);
}