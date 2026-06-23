import { API_CONFIG } from '../../../shared/config/api';

function baseUrl() {
  return API_CONFIG.AI_BASE_URL.replace(/\/+$/, '');
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(data?.detail || data?.message || `HTTP ${res.status}`);
  }

  return data as T;
}

export type PriorityOption = {
  value: number;
  label: string;
};

export type WorkTypeOption = {
  value: string;
  label: string;
};

export type MaterialOption = {
  itemnum: string;
  description: string;
  quantity?: number;
  location?: string;
};

export type LaborOption = {
  laborcode: string;
  laborhrs?: number;
  quantity?: number;
};

export async function searchPriorities(q: string) {
  const url = `${baseUrl()}/add-workorder/reference/priorities?q=${encodeURIComponent(q)}`;
  const data = await getJson<{ items: PriorityOption[] }>(url);
  return data.items || [];
}

export async function searchWorkTypes(q: string) {
  const url = `${baseUrl()}/add-workorder/reference/worktypes?q=${encodeURIComponent(q)}`;
  const data = await getJson<{ items: WorkTypeOption[] }>(url);
  return data.items || [];
}

export async function searchMaterials(q: string) {
  const url = `${baseUrl()}/add-workorder/reference/materials?q=${encodeURIComponent(q)}`;
  const data = await getJson<{ items: MaterialOption[] }>(url);
  return data.items || [];
}

export async function searchLabor(q: string) {
  const url = `${baseUrl()}/add-workorder/reference/labor?q=${encodeURIComponent(q)}`;
  const data = await getJson<{ items: LaborOption[] }>(url);
  return data.items || [];
}