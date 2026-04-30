import { API_CONFIG } from '../../../shared/config/api';

export type ExtractedResponse = {
  transcript?: string;
  extracted?: any;
  payload?: any;
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
    throw new Error(data?.detail || data?.message || text || `HTTP ${res.status}`);
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

  const res = await fetch(`${API_CONFIG.NLP_BASE_URL}/transcribe-audio`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
    body: formData,
  });

  return handleJsonResponse(res);
}