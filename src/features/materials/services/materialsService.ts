import axios from 'axios';

import { MAXIMO } from '../../../shared/config/maximoUrls';
import { makeToken } from '../../../shared/services/maximoClient';
import type { MaterialInput } from '../types/material.types';

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

type PlannedMaterialItem = {
  itemnum?: string;
  description?: string;
  itemqty?: number | string;
  location?: string;
  barcode?: string;
};

type WoMaterialsResponse = {
  wpmaterial?: PlannedMaterialItem[];
};

const BASE_URL = `${MAXIMO.OSLC_OS}/mxwo`;

function buildToken(username: string, password: string) {
  return makeToken(username, password);
}

function commonHeaders(token: string) {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    maxauth: token, // IMPORTANT: no "Basic " here
    Authorization: `Basic ${token}`,
    properties: '*',
  };
}

export async function resolveWorkOrderIdAndSite({
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

  const tryByWorkOrderId = async () => {
    const url = `${MAXIMO.OSLC_OS}/mxwo?lean=1&oslc.where=workorderid=${encodeURIComponent(
      key,
    )}&oslc.select=${select}`;

    console.log('🔎 [resolve] tryByWorkOrderId URL:', url);

    const res = await axios.get<MaximoWOResponse>(url, {
      headers: commonHeaders(token),
    });

    console.log('🔎 [resolve] tryByWorkOrderId STATUS:', res.status);
    console.log(
      '🔎 [resolve] tryByWorkOrderId DATA:',
      JSON.stringify(res.data, null, 2),
    );

    return res.data.member?.[0] ?? null;
  };

  const tryByWonum = async () => {
    const url = `${MAXIMO.OSLC_OS}/mxwo?lean=1&oslc.where=wonum="${encodeURIComponent(
      key,
    )}"&oslc.select=${select}`;

    console.log('🔎 [resolve] tryByWonum URL:', url);

    const res = await axios.get<MaximoWOResponse>(url, {
      headers: commonHeaders(token),
    });

    console.log('🔎 [resolve] tryByWonum STATUS:', res.status);
    console.log(
      '🔎 [resolve] tryByWonum DATA:',
      JSON.stringify(res.data, null, 2),
    );

    return res.data.member?.[0] ?? null;
  };

  let wo: MaximoWO | null = null;

  wo = await tryByWorkOrderId();
  if (!wo) wo = await tryByWonum();

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

export async function addPlannedMaterialToWorkOrder({
  workorderid,
  username,
  password,
  material,
  siteid,
}: {
  workorderid: number;
  username: string;
  password: string;
  material: MaterialInput;
  siteid?: string;
}) {
  const token = buildToken(username, password);

  const url = `${MAXIMO.OSLC_OS}/SM1122/${workorderid}?lean=1`;

  const body = {
    wpmaterial: [
      {
        description: material.description,
        itemnum: material.itemnum,
        itemqty: material.quantity,
        location: material.location,
        barcode: material.barcode || undefined,
        ...(siteid ? { siteid } : {}),
      },
    ],
  };

  const headers = {
    ...commonHeaders(token),
    'x-method-override': 'PATCH',
    patchtype: 'MERGE',
  };

  console.log('🚀 [addMaterial] URL:', url);
  console.log('🚀 [addMaterial] Headers:', headers);
  console.log('🚀 [addMaterial] Body:', JSON.stringify(body, null, 2));

  try {
    const res = await axios.post(url, body, { headers });

    console.log('✅ [addMaterial] STATUS:', res.status);
    console.log('✅ [addMaterial] DATA:', JSON.stringify(res.data, null, 2));

    return res.data;
  } catch (error: any) {
    console.log('❌ [addMaterial] MESSAGE:', error?.message);
    console.log('❌ [addMaterial] CODE:', error?.code);
    console.log('❌ [addMaterial] RESPONSE STATUS:', error?.response?.status);
    console.log(
      '❌ [addMaterial] RESPONSE DATA:',
      JSON.stringify(error?.response?.data, null, 2),
    );

    throw new Error(
      error?.response?.data?.Error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "Impossible d'ajouter le matériel planifié.",
    );
  }
}

export async function getPlannedMaterialsByWonum(
  wonum: string,
  username: string,
  password: string,
) {
  const token = buildToken(username, password);

  const url = `${BASE_URL}?lean=1&oslc.where=wonum="${encodeURIComponent(
    wonum,
  )}"&oslc.select=wpmaterial{itemnum,description,itemqty,location,barcode}`;

  console.log('📥 [getPlannedMaterialsByWonum] URL:', url);

  const response = await axios.get<MaximoResponse<WoMaterialsResponse>>(url, {
    headers: commonHeaders(token),
  });

  console.log('📥 [getPlannedMaterialsByWonum] STATUS:', response.status);
  console.log(
    '📥 [getPlannedMaterialsByWonum] DATA:',
    JSON.stringify(response.data, null, 2),
  );

  const wo = response.data?.member?.[0];
  const items = wo?.wpmaterial ?? [];

  return items.map((item, index) => ({
    id: `pm-${index}`,
    itemnum: item.itemnum ?? '',
    description: item.description ?? '',
    quantity: Number(item.itemqty ?? 0),
    location: item.location ?? '',
    barcode: item.barcode ?? '',
  }));
}