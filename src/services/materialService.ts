// src/services/materialService.ts
import axios from 'axios';
import { Buffer } from 'buffer';

export type MaterialInput = {
  description: string;
  itemnum: string;
  quantity: number;
  location: string;
  barcode?: string;
};

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

const BASE_URL = 'http://demo2.smartech-tn.com/maximo/oslc/os';

function buildMaxAuth(username: string, password: string) {
  const token = Buffer.from(`${username}:${password}`).toString('base64');
  return `Basic ${token}`;
}

function commonHeaders(maxauth: string) {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    maxauth,
    properties: '*',
  };
}

/**
 * Resolve from woKey (wonum OR workorderid) -> returns workorderid, siteid, status, ishistory
 */
export async function resolveWorkOrderIdAndSite({
  woKey,
  username,
  password,
}: {
  woKey: string;
  username: string;
  password: string;
}): Promise<{ workorderid: number; siteid: string; wonum?: string; status?: string; ishistory?: boolean }> {
  const maxauth = buildMaxAuth(username, password);
  const key = (woKey || '').trim();

  const select = 'wonum,siteid,workorderid,status,ishistory';

  const tryByWorkOrderId = async () => {
    const url = `${BASE_URL}/mxwo?lean=1&oslc.where=workorderid=${encodeURIComponent(
      key
    )}&oslc.select=${select}`;
    console.log('🔎 [resolve] tryByWorkOrderId URL:', url);
    const res = await axios.get<MaximoWOResponse>(url, { headers: commonHeaders(maxauth) });
    return res.data.member?.[0] ?? null;
  };

  const tryByWonum = async () => {
    const url = `${BASE_URL}/mxwo?lean=1&oslc.where=wonum="${encodeURIComponent(
      key
    )}"&oslc.select=${select}`;
    console.log('🔎 [resolve] tryByWonum URL:', url);
    const res = await axios.get<MaximoWOResponse>(url, { headers: commonHeaders(maxauth) });
    return res.data.member?.[0] ?? null;
  };

  // heuristic: if numeric, could be workorderid OR wonum
  let wo: MaximoWO | null = null;

  wo = await tryByWorkOrderId();
  if (!wo) wo = await tryByWonum();

  if (!wo?.workorderid || !wo?.siteid) {
    throw new Error(`Work order not found or missing siteid/workorderid (key=${woKey})`);
  }

  return {
    workorderid: wo.workorderid,
    siteid: wo.siteid,
    wonum: wo.wonum,
    status: wo.status,
    ishistory: wo.ishistory,
  };
}

/**
 * POST (MERGE PATCH override) exactly like Postman:
 * POST /SM1122/{workorderid}?lean=1
 * headers: x-method-override=PATCH, patchtype=MERGE
 * body: { wpmaterial: [ ... ] }
 */
export async function addMaterialToWorkOrder({
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
  const maxauth = buildMaxAuth(username, password);

  const url = `${BASE_URL}/SM1122/${workorderid}?lean=1`;

const body = {
  wpmaterial: [
    {
      description: material.description,
      itemnum: material.itemnum,
      itemqty: material.quantity, // ✅ use itemqty
      location: material.location,
      barcode: material.barcode || undefined,
      ...(siteid ? { siteid } : {}),
    },
  ],
};


  const headers = {
    ...commonHeaders(maxauth),
    'x-method-override': 'PATCH',
    patchtype: 'MERGE',
  };

  // IMPORTANT logs
  console.log('🚀 [addMaterial] URL:', url);
  console.log('🚀 [addMaterial] Headers:', headers);
  console.log('🚀 [addMaterial] Body:', JSON.stringify(body, null, 2));

  const res = await axios.post(url, body, { headers });

  console.log('✅ [addMaterial] Response:', res.status, JSON.stringify(res.data, null, 2));
  return res.data;
}