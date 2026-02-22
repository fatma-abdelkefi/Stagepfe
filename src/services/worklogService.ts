// src/services/worklogService.ts
import { MAXIMO } from '../config/maximoUrls';
import { rewriteToMaximoOslcOs } from './maximoUrl';

export type WorkLogItem = {
  worklogid?: number | string;
  description?: string;
  description_longdescription?: { ldtext?: string } | string;
  logtype?: string;
  logtype_description?: string;
  createby?: string;
  createdate?: string;
  clientviewable?: boolean;
  href?: string;
  localref?: string;
};

function toBasicAuth(username: string, password: string) {
  const token = `${username}:${password}`;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Buffer } = require('buffer');
  return `Basic ${Buffer.from(token, 'utf8').toString('base64')}`;
}

async function httpGetJson(url: string, username: string, password: string): Promise<any> {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: toBasicAuth(username, password),

      // Helps nested objects (worklog, longdescription) return consistently in many Maximo envs
      properties: '*',
    } as any,
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(text || `HTTP ${res.status}`);
  }

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

function qs(params: Record<string, any>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    sp.append(k, String(v));
  });
  return sp.toString();
}

/**
 * ✅ ALWAYS build:
 *   {MAXIMO.ORIGIN}/oslc/os/mxapiwo
 *
 * This prevents the bug you see:
 *   http://demo2.../maximo?...
 * (missing /oslc/os/mxapiwo)
 */
function buildMxapiwoUrl(): string {
  const origin = String(MAXIMO.ORIGIN || '').replace(/\/+$/, ''); // e.g. http://demo2.../maximo
  return `${origin}/oslc/os/mxapiwo`;
}

/**
 * ✅ GET: /oslc/os/mxapiwo?oslc.where=wonum="1203"&oslc.select=...
 * Returns member[0]
 */
export async function getWorkOrderWithWorklog(params: { wonum: string; username: string; password: string }) {
  const { wonum, username, password } = params;

  const base = buildMxapiwoUrl();

  // ✅ IMPORTANT: MUST be "oslc.where" (NOT oslcc.where)
  const query = qs({
    lean: 1,
    _ts: Date.now(),
    'oslc.where': `wonum="${String(wonum).trim()}"`,
    'oslc.select':
      'wonum,siteid,href,worklog_collectionref,' +
      'worklog{worklogid,logtype,logtype_description,createby,createdate,description,description_longdescription,clientviewable,localref,href}',
  });

  const url = `${base}?${query}`;
  console.log('[WORKLOG] GET WO URL:', url);

  const json = await httpGetJson(url, username, password);

  const member = Array.isArray(json?.member) ? json.member : [];
  if (!member.length) return null;

  const wo = member[0] as any;

  return {
    wonum: String(wo?.wonum || ''),
    siteid: String(wo?.siteid || ''),
    href: rewriteToMaximoOslcOs(String(wo?.href || '')),
    worklog_collectionref: rewriteToMaximoOslcOs(String(wo?.worklog_collectionref || '')),
    worklog: Array.isArray(wo?.worklog) ? wo.worklog : [],
  };
}

/**
 * GET full worklog row using localref
 */
export async function getWorkLogByLocalRef(params: {
  localref: string;
  username: string;
  password: string;
}): Promise<WorkLogItem | null> {
  const { localref, username, password } = params;

  const url = rewriteToMaximoOslcOs(localref);
  if (!url) return null;

  console.log('[WORKLOG] GET localref:', url);

  const json = await httpGetJson(url, username, password);

  const obj = Array.isArray(json?.member) ? json.member?.[0] : json;
  if (!obj) return null;

  return {
    worklogid: obj.worklogid,
    description: obj.description,
    description_longdescription: obj.description_longdescription,
    logtype: obj.logtype,
    logtype_description: obj.logtype_description,
    createby: obj.createby,
    createdate: obj.createdate,
    clientviewable: obj.clientviewable,
    href: obj.href,
    localref: url,
  };
}

/**
 * Main: returns collectionref + enriched list
 */
export async function getWorkLogsForWonum(params: {
  wonum: string;
  username: string;
  password: string;
}): Promise<{ worklog_collectionref: string; worklogs: WorkLogItem[] }> {
  const { wonum, username, password } = params;

  const wo = await getWorkOrderWithWorklog({ wonum, username, password });
  if (!wo) return { worklog_collectionref: '', worklogs: [] };

  const collectionRef = String(wo.worklog_collectionref || '').trim();
  const list = Array.isArray(wo.worklog) ? wo.worklog : [];

  const enriched: WorkLogItem[] = [];

  for (const wl of list) {
    const hasDesc = !!String(wl?.description || '').trim();
    const lr = String(wl?.localref || '').trim();

    const light: WorkLogItem = {
      ...wl,
      localref: lr ? rewriteToMaximoOslcOs(lr) : wl?.localref,
    };

    // if already has description, keep it
    if (hasDesc || !lr) {
      enriched.push(light);
      continue;
    }

    // otherwise fetch full row by localref
    try {
      const full = await getWorkLogByLocalRef({ localref: lr, username, password });
      enriched.push(full || light);
    } catch {
      enriched.push(light);
    }
  }

  return { worklog_collectionref: collectionRef, worklogs: enriched };
}