import { API_CONFIG } from '../../../shared/config/api';

export type ExtractedResponse = {
  transcript?: string;
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
  score?: number;
};

export type NlpRelatedWorkOrderResult = {
  needed?: boolean;

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

  confidence?: number;

  candidates?: NlpAssetCandidate[];

  total_assets?: number;
  cleaned_text?: string;
};

async function handleJsonResponse(res: Response) {
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

  return data;
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

  const url = `${API_CONFIG.NLP_BASE_URL}/transcribe-audio`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
    body: formData,
  });

  return handleJsonResponse(res);
}

export async function analyzeRelatedWorkOrderNLP(params: {
  text: string;
  context?: any;
}): Promise<NlpRelatedWorkOrderResult> {
  const url = `${API_CONFIG.NLP_BASE_URL}/analyze-related-workorder`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: params.text,
      context: params.context ?? {},
    }),
  });

  return handleJsonResponse(res);
}