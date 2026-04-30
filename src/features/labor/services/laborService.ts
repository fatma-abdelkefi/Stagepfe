import axios from 'axios';
import { makeToken } from '../../../shared/services/maximoClient';
import { MAXIMO } from '../../../shared/config/maximoUrls';
import type { LaborInput } from '../types/labor.types';

type MaximoWO = {
  wonum: string;
  siteid: string;
  workorderid: number;
  status?: string;
  ishistory?: boolean;
};

type MaximoWOResponse = {
  member?: MaximoWO[];
};

type MaximoResponse<T> = {
  member?: T[];
};

type PlannedLaborRaw = {
  taskid?: string | number;
  laborcode?: string;
  description?: string;
  labhrs?: number | string;
  regularhrs?: number | string;
  laborhrs?: number | string;
  quantity?: number | string;
};

type WoLaborResponse = {
  wplabor?: PlannedLaborRaw[];
};

const BASE_URL = `${MAXIMO.OSLC_OS}/mxwo`;

function parseHours(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;

  const s = String(val).trim().replace(',', '.');
  if (!s) return 0;

  if (s.includes(':')) {
    const [h, m] = s.split(':').map(Number);
    return (h || 0) + ((m || 0) / 60);
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function parseQty(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;

  const s = String(val).trim().replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function buildToken(username: string, password: string) {
  return makeToken(username, password);
}

function commonHeaders(token: string) {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    maxauth: token,
    Authorization: `Basic ${token}`,
    properties: '*',
  };
}

export async function resolveLaborWorkOrderIdAndSite({
  woKey,
  username,
  password,
}: {
  woKey: string;
  username: string;
  password: string;
}): Promise<{
  workorderid: number;
  siteid: string;
  wonum?: string;
  status?: string;
  ishistory?: boolean;
}> {
  const token = buildToken(username, password);
  const key = String(woKey || '').trim();
  const select = 'wonum,siteid,workorderid,status,ishistory';

  const byWorkOrderIdUrl = `${MAXIMO.OSLC_OS}/mxwo?lean=1&oslc.where=workorderid=${encodeURIComponent(
    key,
  )}&oslc.select=${select}`;

  const byWonumUrl = `${MAXIMO.OSLC_OS}/mxwo?lean=1&oslc.where=wonum="${encodeURIComponent(
    key,
  )}"&oslc.select=${select}`;

  let wo: MaximoWO | null = null;

  const res1 = await axios.get<MaximoWOResponse>(byWorkOrderIdUrl, {
    headers: commonHeaders(token),
  });
  wo = res1.data.member?.[0] ?? null;

  if (!wo) {
    const res2 = await axios.get<MaximoWOResponse>(byWonumUrl, {
      headers: commonHeaders(token),
    });
    wo = res2.data.member?.[0] ?? null;
  }

  if (!wo?.workorderid || !wo?.siteid) {
    throw new Error(`Work order introuvable (key=${woKey})`);
  }

  return {
    workorderid: wo.workorderid,
    siteid: wo.siteid,
    wonum: wo.wonum,
    status: wo.status,
    ishistory: wo.ishistory,
  };
}

export async function addPlannedLaborToWorkOrder({
  workorderid,
  siteid,
  username,
  password,
  labor,
}: {
  workorderid: number;
  siteid?: string;
  username: string;
  password: string;
  labor: LaborInput;
}) {
  const token = buildToken(username, password);

  const url = `${MAXIMO.OSLC_OS}/SM1120/${workorderid}?lean=1`;

  const body = {
    wplabor: [
      {
        wplaborid: String(Date.now()),
        laborcode: labor.laborcode,
        laborhrs: labor.laborhrs,
        quantity: labor.quantity ?? 1,
        ...(siteid ? { siteid } : {}),
      },
    ],
  };

  const headers = {
    ...commonHeaders(token),
    'x-method-override': 'PATCH',
    patchtype: 'MERGE',
  };

  console.log('🚀 [addPlannedLabor] URL:', url);
  console.log('🚀 [addPlannedLabor] Headers:', headers);
  console.log(
    '🚀 [addPlannedLabor] Body:',
    JSON.stringify(body, null, 2),
  );

  try {
    const response = await axios.post(url, body, { headers });
    console.log(
      '✅ [addPlannedLabor] Response:',
      response.status,
      JSON.stringify(response.data, null, 2),
    );
    return response.data;
  } catch (error: any) {
    console.log('❌ [addPlannedLabor] MESSAGE:', error?.message);
    console.log('❌ [addPlannedLabor] CODE:', error?.code);
    console.log(
      '❌ [addPlannedLabor] RESPONSE STATUS:',
      error?.response?.status,
    );
    console.log(
      '❌ [addPlannedLabor] RESPONSE DATA:',
      JSON.stringify(error?.response?.data, null, 2),
    );

    throw new Error(
      error?.response?.data?.Error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "Impossible d'ajouter la main d'œuvre planifiée.",
    );
  }
}

export async function getPlannedLaborByWonum(
  wonum: string,
  username: string,
  password: string,
) {
  const token = buildToken(username, password);

  const response = await axios.get<MaximoResponse<WoLaborResponse>>(BASE_URL, {
    headers: commonHeaders(token),
    params: {
      lean: 1,
      'oslc.where': `wonum="${wonum}"`,
      'oslc.select': 'wplabor{taskid,laborcode,description,labhrs,regularhrs,laborhrs,quantity}',
    },
  });

  const wo = response.data?.member?.[0];
  const items = wo?.wplabor ?? [];

  return items.map((item, index) => ({
    id: `pl-${index}`,
    taskid: String(item.taskid ?? ''),
    laborcode: item.laborcode ?? '',
    description: item.description ?? 'Aucune description',
    laborhrs: parseHours(item.labhrs ?? item.regularhrs ?? item.laborhrs),
    quantity: parseQty(item.quantity),
  }));
}