import { API_CONFIG } from '../../../shared/config/api';

export type ExtractedResponse = {
  transcript?: string;
  raw_transcript?: string;
  corrected_transcript?: string;
  extracted?: any;
  payload?: any;
};

export type NlpAssetCandidate = {
  assetnum?: string;
  description?: string;
  location?: string;
  siteid?: string;
  parent?: string;
  assettype?: string;
  source?: string;
  score?: number;
};

export type NlpRelatedWorkOrderResult = {
  needed?: boolean;
  reason?: string;

  symptoms?: string[];
  equipment?: string[];
  severity?: string;

  assetnum?: string;
  asset_description?: string;
  description_asset?: string;
  asset_label?: string;
  asset_match_reliable?: boolean;
  asset_selection_source?: string;

  location?: string;

  description?: string;
  details?: string;

  suggested_description?: string;
  suggested_details?: string;
  suggested_assetnum?: string;
  suggested_asset_description?: string;
  suggested_location?: string;

  confidence?: number | string;

  candidates?: NlpAssetCandidate[];

  total_assets?: number;
  cleaned_text?: string;

  ml_result?: any;
};

async function handleJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();

  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(text || `HTTP ${res.status}`);
  }

  if (!res.ok) {
    throw new Error(
      data?.detail || data?.message || text || `HTTP ${res.status}`,
    );
  }

  return data as T;
}

function baseUrl() {
  return API_CONFIG.AI_BASE_URL.replace(/\/+$/, '');
}

export async function transcribeAudio(
  fileUri: string,
  fileName = 'audio.m4a',
  mimeType = 'audio/mp4',
): Promise<ExtractedResponse> {
  const formData = new FormData();

  formData.append('file', {
    uri: fileUri,
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

export async function analyzeRelatedWorkOrderNLP(params: {
  text: string;
  context?: any;
}): Promise<NlpRelatedWorkOrderResult> {
  const url = `${baseUrl()}/ai/mcp/call`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      tool_name: 'suggest_related_workorder',
      arguments: {
        text: [
          'Créer un work order lié.',
          params.text,
        ].join(' '),
        context: {
          ...(params.context ?? {}),
          intent: 'related_workorder',
          force_intent: 'related_workorder',
        },
        failure: (params.context ?? {})?.failure ?? {},
      },
    }),
  });

  const data = await handleJsonResponse<any>(res);

  return data?.result || data || {};
}