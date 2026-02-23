// src/services/statusService.ts
import axios from 'axios';
import { makeToken } from './maximoClient';
import { rewriteMaximoUrl } from './rewriteMaximoUrl';

export type StatusFR = {
  key: string;
  libelle: string;
  code: string;
  value: string;
};

export const DEFAULT_WO_DOMAIN_ID = '_V09TVEFUVVM-';
export const DEFAULT_ACTIVITY_DOMAIN_ID = '_V09TVEFUVVM-';

export const FR_BY_CODE: Record<string, string> = {
  WAPPR:    'En attente d\'approbation',
  APPR:     'Approuvé',
  INPRG:    'En cours',
  WMATL:    'En attente de matériel',
  WPCOND:   'En attente condition usine',
  COMP:     'Terminé',
  CLOSE:    'Clôturé',
  CAN:      'Annulé',
  CANC:     'Annulé',
  WSCH:     'En attente de planification',
  WSCHED:   'En attente de planification',
  HISTEDIT: 'Modifié dans l\'historique',
};

/**
 * French label override map keyed by SYNONYM VALUE (what Maximo returns in `value`).
 * Applied after fetching from Maximo's domain API to replace English descriptions.
 * Add any missing statuses here.
 */
const FR_LABEL_BY_VALUE: Record<string, string> = {
  // Standard WO statuses
  WAPPR:    'En attente d\'approbation',
  APPR:     'Approuvé',
  INPRG:    'En cours',
  WMATL:    'En attente de matériel',
  WPCOND:   'En attente condition usine',
  COMP:     'Terminé',
  CLOSE:    'Clôturé',
  CAN:      'Annulé',
  CANC:     'Annulé',
  WSCH:     'En attente de planification',
  WSCHED:   'En attente de planification',
  HISTEDIT: 'Modifié dans l\'historique',
  // Add more here as you discover new ones in your Maximo domain
};

type MaximoErrorShape = {
  Error?: { message?: string; extendedError?: { message?: string } };
  error?: { message?: string };
  message?: string;
};

type MaximoListResp<T> = MaximoErrorShape & {
  member?: T[];
  href?: string;
  [k: string]: any;
};

type MaximoWoResp = MaximoErrorShape & {
  status?: string;
  status_description?: string;
  wostatus_collectionref?: string;
  wostatus?: { href?: string } | Array<{ href?: string; localref?: string }>;
  member?: Array<{
    status?: string;
    status_description?: string;
    wostatus_collectionref?: string;
    wostatus?: { href?: string } | Array<{ href?: string }>;
  }>;
  [k: string]: any;
};

type MaximoDomainMember = {
  value?: string;
  description?: string;
  maxvalue?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeTrim(v: any): string {
  return typeof v === 'string' ? v.trim() : String(v ?? '').trim();
}

function upper(v: any): string {
  return safeTrim(v).toUpperCase();
}

function withNoCache(url: string): string {
  const u = safeTrim(url);
  if (!u) return '';
  return u.includes('?') ? `${u}&_ts=${Date.now()}` : `${u}?_ts=${Date.now()}`;
}

function extractMaximoError(data: any): string {
  return (
    safeTrim(data?.Error?.message) ||
    safeTrim(data?.Error?.extendedError?.message) ||
    safeTrim(data?.error?.message) ||
    safeTrim(data?.message) ||
    ''
  );
}

function oslcLiteral(v: any): string {
  const s = safeTrim(v);
  if (!s) return '""';
  const n = Number(s);
  if (!Number.isNaN(n) && /^-?\d+(\.\d+)?$/.test(s)) return String(n);
  return `"${s.replace(/"/g, '\\"')}"`;
}

/**
 * Returns true if the href is a Maximo internal child key reference.
 * These look like "http://childkey#BASE64" and are NOT real HTTP endpoints.
 * Never pass them to normalizeMaximoHref or any HTTP call.
 */
function isChildKeyHref(href: string): boolean {
  return href.startsWith('http://childkey') || href.startsWith('childkey');
}

/**
 * Normalize a Maximo href — fixes all known corruption patterns.
 *
 * ⚠️  Do NOT call this on childkey hrefs — pass them through isChildKeyHref first.
 *     If the href is a childkey, return '' immediately.
 */
export function normalizeMaximoHref(inputHref: string): string {
  const raw = safeTrim(inputHref);
  if (!raw) return '';

  // Reject Maximo internal child-key refs — they are NOT real URLs
  if (isChildKeyHref(raw)) {
    console.warn('[normalizeMaximoHref] Rejected childkey href:', raw);
    return '';
  }

  // Strip hash fragment (safe for real http URLs)
  let fixed = raw.split('#')[0];

  // Rewrite internal IP → public demo host
  fixed = rewriteMaximoUrl(fixed);

  // Fix known path typos
  fixed = fixed.replace('/maxiimo/', '/maximo/');
  fixed = fixed.replace('/ooslc/', '/oslc/');
  fixed = fixed.replace('/maximo/maximo/', '/maximo/');
  fixed = fixed.replace('/oslc/os/os/', '/oslc/os/');

  // Collapse double slashes in path (preserve http://)
  fixed = fixed.replace(/([^:])\/\/+/g, '$1/');

  // Remove trailing slash
  fixed = fixed.replace(/\/+$/, '');

  return fixed;
}

function makeAuthHeaders(token: string) {
  return {
    MAXAUTH: token,
    Authorization: `Basic ${token}`,
    Accept: 'application/json',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
  };
}

function pickStatusFromWoPayload(data: MaximoWoResp): string {
  return safeTrim(data?.status) || safeTrim(data?.member?.[0]?.status) || '';
}

function pickStatusDescFromWoPayload(data: MaximoWoResp): string {
  return safeTrim(data?.status_description) || safeTrim(data?.member?.[0]?.status_description) || '';
}

function pickWoStatusCollectionRef(data: MaximoWoResp): string {
  const direct =
    safeTrim(data?.wostatus_collectionref) ||
    safeTrim(data?.member?.[0]?.wostatus_collectionref);
  if (direct) return direct;

  const ws = data?.wostatus;
  if (ws && !Array.isArray(ws)) return safeTrim((ws as { href?: string }).href);

  return '';
}

// ─── Domain / Status list ─────────────────────────────────────────────────────

export async function getStatusListFR(
  username: string,
  password: string,
  domainId: string
): Promise<StatusFR[]> {
  const token = makeToken(username, password);
  const cleanDomainId = safeTrim(domainId);
  if (!cleanDomainId) throw new Error('domainId manquant');

  const url = normalizeMaximoHref(
    `http://demo2.smartech-tn.com/maximo/oslc/os/mxdomain/${cleanDomainId}/synonymdomain`
  );

  const res = await axios.get<MaximoListResp<MaximoDomainMember>>(withNoCache(url), {
    headers: makeAuthHeaders(token),
    params: {
      lean: 1,
      'oslc.select': 'value,description,maxvalue',
      'oslc.pageSize': 1000,
    },
    timeout: 30000,
    validateStatus: () => true,
  });

  if (res.status >= 400) {
    const msg = extractMaximoError(res.data) || `Erreur domain (${res.status})`;
    throw new Error(msg);
  }

  const members: MaximoDomainMember[] = Array.isArray(res.data?.member)
    ? res.data.member
    : [];

  return members
    .map((m, idx) => {
      const value = safeTrim(m?.value);
      const code = safeTrim(m?.maxvalue) || value;
      if (!value && !code) return null;

      // ✅ Override Maximo's English description with French translation if available
      const maximo_libelle = safeTrim(m?.description) || value || code || '-';
      const libelle =
        FR_LABEL_BY_VALUE[upper(value)] ||
        FR_LABEL_BY_VALUE[upper(code)] ||
        maximo_libelle;

      return { key: `${code}::${value}::${idx}`, libelle, code, value };
    })
    .filter(Boolean) as StatusFR[];
}

export async function getWorkOrderStatusListFR(username: string, password: string) {
  return getStatusListFR(username, password, DEFAULT_WO_DOMAIN_ID);
}

export async function getActivityStatusListFR(
  username: string,
  password: string,
  activityDomainId: string = DEFAULT_ACTIVITY_DOMAIN_ID
) {
  return getStatusListFR(username, password, activityDomainId);
}

// ─── Fetch current status ─────────────────────────────────────────────────────

export async function fetchStatusByHref(
  href: string,
  username: string,
  password: string
): Promise<{ status: string; description: string }> {
  const token = makeToken(username, password);
  const cleanHref = normalizeMaximoHref(href);

  if (!cleanHref) throw new Error('href invalide pour fetchStatusByHref');

  const res = await axios.get<MaximoWoResp>(withNoCache(cleanHref), {
    headers: makeAuthHeaders(token),
    params: {
      lean: 1,
      'oslc.select': 'status,status_description,wostatus_collectionref',
    },
    timeout: 30000,
    validateStatus: () => true,
  });

  if (res.status >= 400) {
    const msg = extractMaximoError(res.data) || `Erreur fetch status (${res.status})`;
    throw new Error(msg);
  }

  return {
    status: pickStatusFromWoPayload(res.data),
    description: pickStatusDescFromWoPayload(res.data),
  };
}

// ─── Strategy 1: Direct PATCH ─────────────────────────────────────────────────

async function changeStatusViaPatch(
  cleanHref: string,
  statusValue: string,
  token: string
): Promise<void> {
  console.log('[STATUS][patch] PATCH =>', cleanHref, '| status =>', statusValue);

  const res = await axios.post<MaximoErrorShape>(
    withNoCache(cleanHref),
    { status: statusValue },
    {
      headers: {
        ...makeAuthHeaders(token),
        'Content-Type': 'application/json',
        'x-method-override': 'PATCH',
        patchtype: 'MERGE',
        'If-Match': '*',
      } as any,
      params: { lean: 1 },
      timeout: 30000,
      validateStatus: () => true,
    }
  );

  console.log('[STATUS][patch] response =>', res.status);

  if (res.status >= 400) {
    const msg = extractMaximoError(res.data) || `Erreur PATCH (${res.status})`;
    throw new Error(msg);
  }
}

// ─── Strategy 2: wostatus_collectionref POST array ───────────────────────────

async function changeStatusViaCollectionRef(
  cleanHref: string,
  statusValue: string,
  token: string,
  memo: string
): Promise<void> {
  const getRes = await axios.get<MaximoWoResp>(withNoCache(cleanHref), {
    headers: makeAuthHeaders(token),
    params: { lean: 1, 'oslc.select': 'status,wostatus_collectionref' },
    timeout: 30000,
    validateStatus: () => true,
  });

  console.log('[STATUS][collectionref] GET =>', getRes.status);

  if (getRes.status >= 400) {
    throw new Error(extractMaximoError(getRes.data) || `Erreur GET (${getRes.status})`);
  }

  const wostatusRef = normalizeMaximoHref(pickWoStatusCollectionRef(getRes.data));
  console.log('[STATUS][collectionref] ref =>', wostatusRef || '(vide)');

  if (!wostatusRef) {
    throw new Error('wostatus_collectionref introuvable.');
  }

  const postRes = await axios.post<MaximoErrorShape>(
    withNoCache(wostatusRef),
    [{ status: statusValue, memo, statusdate: new Date().toISOString() }],
    {
      headers: {
        ...makeAuthHeaders(token),
        'Content-Type': 'application/json',
        'If-Match': '*',
        'x-method-override': 'PATCH',
        patchtype: 'MERGE',
      } as any,
      params: { lean: 1 },
      timeout: 30000,
      validateStatus: () => true,
    }
  );

  console.log('[STATUS][collectionref] POST =>', postRes.status);

  if (postRes.status >= 400) {
    throw new Error(extractMaximoError(postRes.data) || `Erreur POST (${postRes.status})`);
  }
}

// ─── Main: changeStatusByHref ─────────────────────────────────────────────────

export async function changeStatusByHref(
  href: string,
  newStatusValue: string,
  username: string,
  password: string,
  options?: { memo?: string; skipCollectionRef?: boolean }
): Promise<string> {
  const token = makeToken(username, password);
  const cleanHref = normalizeMaximoHref(href);
  const statusValue = safeTrim(newStatusValue);
  const memo = safeTrim(options?.memo) || 'Changement via mobile';

  if (!cleanHref) throw new Error('href manquant ou invalide');
  if (!statusValue) throw new Error('statut manquant');

  console.log('[STATUS] changeStatusByHref | href =>', cleanHref, '| value =>', statusValue);

  try {
    await changeStatusViaPatch(cleanHref, statusValue, token);
    console.log('[STATUS] ✅ PATCH succeeded');
  } catch (patchErr: any) {
    console.warn('[STATUS] ⚠️ PATCH failed:', patchErr?.message);

    // Any Maximo error code (BMXAAXXXX) is a business rule rejection — surface it directly.
    // Do NOT fall through to collectionref: it won't help and woactivity sub-resources
    // don't expose wostatus_collectionref anyway.
    const isBusinessRule =
      /BMXAA\d+/i.test(patchErr?.message || '') ||
      patchErr?.message?.includes('Could not change') ||
      patchErr?.message?.includes('must be of') ||
      patchErr?.message?.includes('is used by');

    if (isBusinessRule || options?.skipCollectionRef) {
      throw new Error(patchErr.message);
    }

    console.log('[STATUS] → trying collectionref fallback...');
    await changeStatusViaCollectionRef(cleanHref, statusValue, token, memo);
    console.log('[STATUS] ✅ collectionref succeeded');
  }

  // Wait for Maximo to commit
  await new Promise((r) => setTimeout(r, 800));

  // Confirm actual new status
  try {
    const confirmed = await fetchStatusByHref(cleanHref, username, password);
    console.log('[STATUS] confirmed =>', confirmed.status);

    if (confirmed.status && upper(confirmed.status) !== upper(statusValue)) {
      throw new Error(
        `Le statut n'a pas changé (actuel: ${confirmed.status}, attendu: ${statusValue}). ` +
        `Transition peut-être interdite par les règles métier Maximo.`
      );
    }

    return confirmed.status || statusValue;
  } catch (e: any) {
    if (e?.message?.includes("n'a pas changé")) throw e;
    console.warn('[STATUS] confirmation GET failed (non-blocking):', e?.message);
    return statusValue;
  }
}

// ─── Activity: resolve OSLC href via localref ─────────────────────────────────
//
// ROOT CAUSE of "http://demo2.smartech-tn.com" bug:
//
//   Maximo child objects expose TWO href fields:
//     • href:     "http://childkey#BASE64"  ← internal Maximo ref, NOT a real URL
//     • localref: "http://192.168.x.x/.../woactivity/0-XXXX"  ← real OSLC endpoint
//
//   The old code only requested `href` in oslc.select and called normalizeMaximoHref
//   on it. Since childkey hrefs become empty after normalization, the resolved href
//   was just the base domain.
//
//   Fix: always request AND prefer `localref` for child resource resolution.
//

// ─── Activity: resolve href via mxwo woactivity localref, then wsmethod ───────
//
// mxapiwoactivity doesn't exist on this Maximo instance (404).
//
// Approach:
//   1. GET mxwo with woactivity{localref,taskid} to resolve the real activity URL
//   2. POST {localref}?action=wsmethod:changeStatus  ← bypasses inter-task deps
//
// WHY wsmethod and not PATCH on the localref:
//   PATCH on mxwo/.../woactivity/N-XXXXX triggers BMXAA4518E because Maximo
//   enforces cascade dependency rules on sub-resource writes.
//   wsmethod:changeStatus is a direct status transition action that operates on
//   the activity record itself and skips those cascade checks.
//

type ResolveActivityArgs = {
  wonum?: string;
  siteid?: string;
  taskid?: string | number;
  workorderid?: string | number;
};

type MaximoChild = {
  href?: string;
  localref?: string;
  taskid?: any;
  status?: string;
  [k: string]: any;
};

type MaximoWoWithChildren = MaximoErrorShape & {
  member?: Array<{
    href?: string;
    woactivity?: MaximoChild[];
    wotask?: MaximoChild[];
    [k: string]: any;
  }>;
  [k: string]: any;
};

function findActivityLocalref(data: MaximoWoWithChildren, taskid: string): string {
  const wo = data?.member?.[0];
  if (!wo) return '';

  const buckets = [wo.woactivity, wo.wotask].filter(Array.isArray) as MaximoChild[][];

  for (const arr of buckets) {
    const hit = arr.find((x) => safeTrim(x?.taskid) === taskid);
    if (!hit) continue;

    const localref = safeTrim(hit.localref);
    if (localref && /^https?:\/\//i.test(localref) && !isChildKeyHref(localref)) {
      return normalizeMaximoHref(localref);
    }
  }
  return '';
}

export async function resolveActivityOsclHref(
  args: ResolveActivityArgs,
  username: string,
  password: string
): Promise<string> {
  const token = makeToken(username, password);

  const taskid = safeTrim(args.taskid);
  const wonum = safeTrim(args.wonum);
  const siteid = safeTrim(args.siteid);
  const workorderid = safeTrim(args.workorderid);

  if (!taskid) throw new Error('taskid manquant');

  let where = '';
  if (workorderid) {
    where = `workorderid=${oslcLiteral(workorderid)}`;
  } else if (wonum) {
    where = `wonum=${oslcLiteral(wonum)}`;
    if (siteid) where += ` and siteid=${oslcLiteral(siteid)}`;
  } else {
    throw new Error('workorderid ou wonum requis');
  }

  console.log('[ACTIVITY][resolve] where=', where, '| taskid=', taskid);

  const url = normalizeMaximoHref(`http://demo2.smartech-tn.com/maximo/oslc/os/mxwo`);

  const res = await axios.get<MaximoWoWithChildren>(withNoCache(url), {
    headers: makeAuthHeaders(token),
    params: {
      lean: 1,
      'oslc.where': where,
      'oslc.pageSize': 1,
      'oslc.select': 'href,wonum,siteid,workorderid,woactivity{href,localref,taskid,status},wotask{href,localref,taskid,status}',
    },
    timeout: 30000,
    validateStatus: () => true,
  });

  console.log('[ACTIVITY][resolve] GET =>', res.status);
  if (res.status >= 400) {
    throw new Error(extractMaximoError(res.data) || `Erreur GET mxwo (${res.status})`);
  }

  const localref = findActivityLocalref(res.data, taskid);
  console.log('[ACTIVITY][resolve] localref =>', localref || '(not found)');

  if (!localref) {
    throw new Error(`Activité introuvable (taskid=${taskid}). Vérifiez que mxwo expose woactivity avec localref.`);
  }

  return localref;
}

// ─── changeActivityStatus: wsmethod:changeStatus on woactivity localref ───────

export async function changeActivityStatus(
  activity: { taskid?: any; wonum?: any; siteid?: any; workorderid?: any },
  newStatusValue: string,
  username: string,
  password: string,
  options?: { memo?: string }
): Promise<string> {
  const token = makeToken(username, password);
  const statusValue = safeTrim(newStatusValue);
  const memo = safeTrim(options?.memo) || 'Changement via mobile';

  const localref = await resolveActivityOsclHref(
    {
      taskid: activity?.taskid,
      wonum: activity?.wonum,
      siteid: activity?.siteid,
      workorderid: activity?.workorderid,
    },
    username,
    password
  );

  // ✅ wsmethod:changeStatus on woactivity localref — bypasses inter-task dependency checks
  const actionUrl = `${withNoCache(localref)}&action=wsmethod:changeStatus`;
  const payload = {
    status: statusValue,
    memo,
    statusdate: new Date().toISOString(),
  };

  console.log('[ACTIVITY][wsmethod] POST =>', actionUrl, '| payload =>', JSON.stringify(payload));

  const res = await axios.post<MaximoErrorShape>(actionUrl, payload, {
    headers: {
      ...makeAuthHeaders(token),
      'Content-Type': 'application/json',
    },
    timeout: 30000,
    validateStatus: () => true,
  });

  console.log('[ACTIVITY][wsmethod] response =>', res.status, JSON.stringify(res.data));

  if (res.status >= 400) {
    const msg = extractMaximoError(res.data) || `Erreur wsmethod (${res.status})`;
    throw new Error(msg);
  }

  // Wait briefly then confirm
  await new Promise((r) => setTimeout(r, 800));

  try {
    const confirmed = await fetchStatusByHref(localref, username, password);
    console.log('[ACTIVITY] confirmed status =>', confirmed.status);
    return confirmed.status || statusValue;
  } catch {
    return statusValue;
  }
}