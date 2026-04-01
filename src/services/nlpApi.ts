import { API_CONFIG } from '../config/api';

export type ExtractedResponse = {
  transcript?: string;
  extracted: any;
  payload: any;
};

export type CreateWorklogResponse = {
  success: boolean;
  wonum?: string;
  message: string;
  extracted?: any;
  payload?: any;
  maximo_response?: string;
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
    throw new Error(data?.detail || data?.message || `HTTP ${res.status}`);
  }

  return data;
}

export async function extractText(text: string): Promise<ExtractedResponse> {
  const res = await fetch(`${API_CONFIG.NLP_BASE_URL}/extract-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  return handleJsonResponse(res);
}

export async function createWorklog(text: string): Promise<CreateWorklogResponse> {
  const res = await fetch(`${API_CONFIG.NLP_BASE_URL}/create-worklog`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  return handleJsonResponse(res);
}

export async function transcribeAudio(fileUri: string, fileName = 'audio.wav', mimeType = 'audio/wav'): Promise<ExtractedResponse> {
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