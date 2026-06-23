import { API_CONFIG } from '../../../shared/config/api';

export type MaximoFailureOptionLevel =
  | 'failure_class'
  | 'problem'
  | 'cause'
  | 'remedy';

export type MaximoFailureHierarchyOptionsRequest = {
  level: MaximoFailureOptionLevel;
  failure_class?: string;
  problem?: string;
  cause?: string;
  siteid?: string;
};

export type MaximoFailureOption = {
  code: string;
  description?: string;
};

type RawOptionsResponse = {
  success: boolean;
  tool?: string;
  level?: string;
  options?: Array<string | MaximoFailureOption>;
  error?: string;
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

function normalizeOptions(
  options?: Array<string | MaximoFailureOption>,
): MaximoFailureOption[] {
  if (!Array.isArray(options)) return [];

  return options
    .map(item => {
      if (typeof item === 'string') {
        return {
          code: item,
          description: '',
        };
      }

      return {
        code: item.code,
        description: item.description || '',
      };
    })
    .filter(item => !!item.code);
}

export async function getMaximoFailureHierarchyOptions(
  payload: MaximoFailureHierarchyOptionsRequest,
): Promise<MaximoFailureOption[]> {
  const baseUrl = API_CONFIG.AI_BASE_URL.replace(/\/+$/, '');
  const url = `${baseUrl}/ai/mcp/call`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      // Tool existant dans ton backend actuel
      tool_name: 'get_failure_hierarchy_options',
      arguments: {
        level: payload.level,
        failure_class: payload.failure_class,
        problem: payload.problem,
        cause: payload.cause,
        siteid: payload.siteid,
      },
    }),
  });

  const data = await handleJsonResponse<RawOptionsResponse>(response);

  if (!data.success) {
    throw new Error(data.error || 'Impossible de charger les choix.');
  }

  return normalizeOptions(data.options);
}