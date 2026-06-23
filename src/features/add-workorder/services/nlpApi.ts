import { API_CONFIG } from '../../../shared/config/api';
import type { AddWorkOrderSuggestion } from '../types/addWorkOrder.types';

export type ExtractedResponse = {
  success?: boolean;
  transcript?: string;
  raw_transcript?: string;
  corrected_transcript?: string;
  cleaned_text?: string;
  extracted?: any;
  payload?: any;
  detail?: string;
  message?: string;
};

export type NlpAddWorkOrderResult = {
  success?: boolean;
  intent?: string;
  message?: string;
  workorder?: AddWorkOrderSuggestion;
  raw?: any;
};

function baseUrl() {
  return API_CONFIG.AI_BASE_URL.replace(/\/+$/, '');
}

async function handleJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();

  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(text || `Erreur HTTP ${res.status}`);
  }

  if (!res.ok) {
    const message =
      data?.detail ||
      data?.message ||
      data?.error ||
      data?.Error?.message ||
      text ||
      `Erreur HTTP ${res.status}`;

    throw new Error(message);
  }

  return data as T;
}

export async function transcribeAudio(
  fileUri: string,
  fileName = 'audio.m4a',
  mimeType = 'audio/mp4',
): Promise<ExtractedResponse> {
  const cleanUri = fileUri.startsWith('file://') ? fileUri : `file://${fileUri}`;

  const formData = new FormData();

  formData.append('file', {
    uri: cleanUri,
    name: fileName,
    type: mimeType,
  } as any);

  const url = `${baseUrl()}/nlp/transcribe-audio`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
    body: formData,
  });

  return handleJsonResponse<ExtractedResponse>(res);
}

function extractWorkOrderFromMcpResponse(
  data: any,
): AddWorkOrderSuggestion | undefined {
  const direct =
    data?.ui_data?.workorder ||
    data?.result?.workorder ||
    data?.result?.ui_data?.workorder ||
    data?.workorder;

  if (direct && typeof direct === 'object' && Object.keys(direct).length > 0) {
    return direct;
  }

  return undefined;
}

export async function analyzeAddWorkOrderNLP(params: {
  text: string;
  context?: any;
}): Promise<NlpAddWorkOrderResult> {
  const url = `${baseUrl()}/ai/mcp/call`;

  const technicianText = params.text.trim();

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      tool_name: 'add_workorder',
      arguments: {
        text: technicianText,
        context: {
          ...(params.context ?? {}),
          technician_text: technicianText,
          intent: 'add_workorder',
          force_intent: 'add_workorder',
        },
      },
    }),
  });

  const data = await handleJsonResponse<any>(res);
  const workorder = extractWorkOrderFromMcpResponse(data);

  return {
    success: data?.success,
    intent: data?.intent || 'add_workorder',
    message: data?.message || data?.final_answer,
    workorder,
    raw: data,
  };
}