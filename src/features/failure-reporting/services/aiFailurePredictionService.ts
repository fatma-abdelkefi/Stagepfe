import { API_CONFIG } from '../../../shared/config/api';
import type {
  AiFailurePredictionRequest,
  AiFailurePredictionResponse,
} from '../types/failureReporting.types';

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

    return JSON.parse(text) as AiFailurePredictionResponse;
  } catch (error) {
    console.log('❌ PREDICT FETCH ERROR =', error);
    throw error;
  }
}