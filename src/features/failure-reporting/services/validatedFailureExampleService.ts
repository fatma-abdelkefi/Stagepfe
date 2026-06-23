import { API_CONFIG } from '../../../shared/config/api';
import type {
  AddFailureReportingExampleRequest,
  AddFailureReportingExampleResponse,
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

export async function addValidatedFailureExample(
  payload: AddFailureReportingExampleRequest,
): Promise<AddFailureReportingExampleResponse> {
  const baseUrl = API_CONFIG.AI_BASE_URL.replace(/\/+$/, '');

  const url = `${baseUrl}/ai/training/add-failure-reporting-example`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      ...payload,
      source: payload.source || 'mobile_confirmed_failure',
    }),
  });

  return handleJsonResponse<AddFailureReportingExampleResponse>(response);
}