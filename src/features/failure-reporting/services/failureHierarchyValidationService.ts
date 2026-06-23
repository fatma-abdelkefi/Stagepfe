import { API_CONFIG } from '../../../shared/config/api';

export type FailureHierarchyPayload = {
  failure_class: string;
  problem: string;
  cause: string;
  remedy: string;
};

export type FailureHierarchyValidationResponse = {
  success?: boolean;
  tool?: string;
  is_valid?: boolean;
  confidence_level?: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  warnings?: string[];
  errors?: string[];
};

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

export async function validateFailureHierarchy(
  failure: FailureHierarchyPayload,
): Promise<FailureHierarchyValidationResponse> {
  const baseUrl = API_CONFIG.AI_BASE_URL.replace(/\/+$/, '');
  const url = `${baseUrl}/ai/mcp/call`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      tool_name: 'validate_failure_hierarchy',
      arguments: {
        failure,
      },
    }),
  });

  return handleJsonResponse<FailureHierarchyValidationResponse>(response);
}