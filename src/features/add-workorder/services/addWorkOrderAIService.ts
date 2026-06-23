import { API_CONFIG } from '../../../shared/config/api';
import {
  AddWorkOrderAIRequest,
  AddWorkOrderAIResponse,
} from '../types/addWorkOrder.types';

export async function suggestAddWorkOrder(
  payload: AddWorkOrderAIRequest,
): Promise<AddWorkOrderAIResponse> {
  const response = await fetch(`${API_CONFIG.AI_BASE_URL}/ai/llm/assistant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur API IA (${response.status}) : ${errorText}`);
  }

  return response.json();
}