import { API_CONFIG } from '../../../shared/config/api';

export type ExtractedResponse = {
  success?: boolean;
  transcript?: string;
  raw_transcript?: string;
  corrected_transcript?: string;
  cleaned_text?: string;
  extracted?: any;
  payload?: {
    description?: string;
    description_longdescription?:
      | {
          ldtext?: string;
        }
      | string;
  };
  message?: string;
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
      data?.detail ||
        data?.message ||
        text ||
        `HTTP ${res.status}`,
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

  const url = `${API_CONFIG.AI_BASE_URL}/nlp/transcribe-audio`;

  console.log('[NLP] POST:', url);
  console.log('[NLP] fileUri:', fileUri);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
    body: formData,
  });

  return handleJsonResponse(res);
}