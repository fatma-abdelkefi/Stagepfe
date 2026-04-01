import { API_CONFIG } from '../config/api';

export type AiFailurePredictionRequest = {
  description: string;
  long_description: string;
  worklog: string[];
  activities: string[];
  actual_materials: string[];
  actual_labor: string[];
  assetnum: string;
  location: string;
  lang: 'fr' | 'en';
  debug?: boolean;
};

export type AiFailurePredictionResponse = {
  language?: string;
  failure_class?: string | null;
  failure_class_description?: string | null;
  model_predicted_class?: string | null;
  class_selection_method?: string | null;
  problem?: string | null;
  problem_description?: string | null;
  cause?: string | null;
  cause_description?: string | null;
  remedy?: string | null;
  remedy_description?: string | null;
  remarkdesc?: string | null;
  confidence?: number;
  low_confidence?: boolean;
  top3_predictions?: Array<{
    failure_class?: string | null;
    failure_class_description?: string | null;
    confidence?: number;
  }>;
};

export async function predictFailureWithAI(
  payload: AiFailurePredictionRequest,
): Promise<AiFailurePredictionResponse> {
  const baseUrl = API_CONFIG.FAILURE_BASE_URL.replace(/\/+$/, '');
  const healthUrl = `${baseUrl}/health`;
  const predictUrl = `${baseUrl}/predict`;

  console.log('🌐 HEALTH URL =', healthUrl);
  console.log('🤖 PREDICT URL =', predictUrl);

  try {
    const healthResponse = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    const healthText = await healthResponse.text();
    console.log('✅ HEALTH STATUS =', healthResponse.status);
    console.log('✅ HEALTH BODY =', healthText);
  } catch (error) {
    console.log('❌ HEALTH FETCH ERROR =', error);
    throw new Error('La connexion à l’API IA échoue déjà sur /health');
  }

  const body = JSON.stringify(payload);

  console.log('🤖 AI PAYLOAD OBJECT =', payload);
  console.log('🤖 AI PAYLOAD JSON =', body);

  try {
    const response = await fetch(predictUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body,
    });

    console.log('🤖 AI STATUS =', response.status);

    const text = await response.text();
    console.log('🤖 RAW RESPONSE TEXT =', text);

    if (!response.ok) {
      throw new Error(text || 'Erreur API IA');
    }

    return JSON.parse(text);
  } catch (error) {
    console.log('❌ PREDICT FETCH ERROR =', error);
    throw error;
  }
}