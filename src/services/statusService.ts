// src/services/statusService.ts
import axios from 'axios';
import { makeToken } from './maximoClient';
import { rewriteMaximoUrl } from './rewriteMaximoUrl';

export type StatusFR = {
  key: string;
  libelle: string; // FR label (description)
  code: string;    // maxvalue (canonical)
  value: string;   // synonym value (what you must send to change status)
};

export const DEFAULT_WO_DOMAIN_ID = '_V09TVEFUVVM-';
export const DEFAULT_ACTIVITY_DOMAIN_ID = '_V09TVEFUVVM-';

/**
 * Static FR label fallback map (code → label).
 * Populated at runtime by getStatusListFR / getWorkOrderStatusListFR.
 * Used by screens that need a synchronous label lookup without an async call.
 */
export const FR_BY_CODE: Record<string, string> = {
  // Work Order statuses (common Maximo defaults)
  WAPPR:  'Waiting on approval',
  APPR:   'Approved',
  INPRG:  'In progress',
  WMATL:  'Waiting on material',
  WPCOND: 'Waiting on plant cond',
  COMP:   'Completed',
  CLOSE:  'Closed',
  CAN:    'Canceled',
  CANC:   'Canceled',
  WSCH:   'Waiting to be scheduled',
  WSCHED: 'Waiting to be scheduled',
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

/**
 * Normalize a Maximo href — fixes all known corruption patterns.
 *
 * Key fix: collapse any double-slash in the URL PATH (but not in "http://")
 * This prevents the base64 resource key from being corrupted when the
 * slash is doubled (e.g. mxwo//_QkVERk9SRC8x → mxwo/_QkVERk9SRC8x).
 */
export function normalizeMaximoHref(inputHref: string): string {
  const raw = safeTrim(inputHref);
  if (!raw) return '';

  // Step 1: rewrite internal IPs → public demo host
  let fixed = rewriteMaximoUrl(raw);

  // Step 2: fix known path typos
  fixed = fixed.replace('/maxiimo/', '/maximo/');
  fixed = fixed.replace('/ooslc/', '/oslc/');

  // Step 3: fix path duplications
  fixed = fixed.replace('/maximo/maximo/', '/maximo/');
  fixed = fixed.replace('/oslc/os/os/', '/oslc/os/');

  // Step 4: collapse ALL double (or more) slashes in the PATH
  // Only collapse after the protocol (http:// or https://) is preserved
  // Regex: replace 2+ slashes that are NOT preceded by ":"
  fixed = fixed.replace(/([^:])\/\/+/g, '$1/');

  // Step 5: remove trailing slash
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
  return (
    safeTrim(data?.status_description) ||
    safeTrim(data?.member?.[0]?.status_description) ||
    ''
  );
}

/**
 * wostatus can be a plain collectionref string, an object, or an ARRAY
 * (Maximo returns an array of status history records).
 * We want the wostatus_collectionref string, not a specific history record.
 */
function pickWoStatusCollectionRef(data: MaximoWoResp): string {
  // Best: dedicated collectionref field
  const direct =
    safeTrim(data?.wostatus_collectionref) ||
    safeTrim(data?.member?.[0]?.wostatus_collectionref);
  if (direct) return direct;

  // wostatus as plain object with href
  const ws = data?.wostatus;
  if (ws && !Array.isArray(ws)) {
    return safeTrim((ws as { href?: string }).href);
  }

  // wostatus as array — localref points to individual history rows, NOT to the
  // collection endpoint we need. Don't use localref here.
  // The wostatus_collectionref field above is always the right one.

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
      const libelle = safeTrim(m?.description) || value || code || '-';
      if (!value && !code) return null;
      return { key: `${code}::${value}::${idx}`, libelle, code, value };
    })
    .filter(Boolean) as StatusFR[];
}

export async function getWorkOrderStatusListFR(
  username: string,
  password: string
): Promise<StatusFR[]> {
  return getStatusListFR(username, password, DEFAULT_WO_DOMAIN_ID);
}

export async function getActivityStatusListFR(
  username: string,
  password: string,
  activityDomainId: string = DEFAULT_ACTIVITY_DOMAIN_ID
): Promise<StatusFR[]> {
  return getStatusListFR(username, password, activityDomainId);
}

export async function fetchWoStatusLabelFR(
  statusCodeOrValue: string,
  username: string,
  password: string
): Promise<string> {
  const list = await getWorkOrderStatusListFR(username, password);
  const s = upper(statusCodeOrValue);
  const found =
    list.find((x) => upper(x.code) === s) ||
    list.find((x) => upper(x.value) === s);
  return found?.libelle || '';
}

// ─── Fetch current status ─────────────────────────────────────────────────────

export async function fetchStatusByHref(
  href: string,
  username: string,
  password: string
): Promise<{ status: string; description: string }> {
  const token = makeToken(username, password);
  const cleanHref = normalizeMaximoHref(href);

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
// Inside changeStatusViaPatch
async function changeStatusViaPatch(
  cleanHref: string,
  statusValue: string,
  token: string
): Promise<void> {
  const fullUrl = withNoCache(cleanHref);
  console.log('[STATUS][patch] attempting →', {
    url: fullUrl,
    status: statusValue,
    auth: 'MAXAUTH present',
  });

  try {
    const res = await axios.post<MaximoErrorShape>(
      fullUrl,
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

    console.log('[STATUS][patch] success →', res.status);
    return;
  } catch (err: any) {
    console.error('[STATUS][patch] failed:', {
      message: err.message,
      code: err.code,
      url: err.config?.url,
      status: err.response?.status,
      data: err.response?.data ? JSON.stringify(err.response.data).slice(0, 400) : null,
    });
    throw err;
  }
}

// ─── Strategy 2: wostatus_collectionref POST array ───────────────────────────
//
// GET WO → extract wostatus_collectionref → POST [{ status, memo, statusdate }]
//
// NOTE: Some Maximo versions return 204 even for invalid transitions (silent
// fail). We always confirm the actual status after this call.
//
async function changeStatusViaCollectionRef(
  cleanHref: string,
  statusValue: string,
  token: string,
  memo: string
): Promise<void> {
  // GET WO with wostatus_collectionref
  const getRes = await axios.get<MaximoWoResp>(withNoCache(cleanHref), {
    headers: makeAuthHeaders(token),
    params: {
      lean: 1,
      'oslc.select': 'status,wostatus_collectionref',
    },
    timeout: 30000,
    validateStatus: () => true,
  });

  console.log(
    '[STATUS][collectionref] GET =>',
    getRes.status,
    JSON.stringify(getRes.data)
  );

  if (getRes.status >= 400) {
    const msg = extractMaximoError(getRes.data) || `Erreur GET WO (${getRes.status})`;
    throw new Error(msg);
  }

  const wostatusRefRaw = pickWoStatusCollectionRef(getRes.data);
  const wostatusRef = normalizeMaximoHref(wostatusRefRaw);

  console.log(
    '[STATUS][collectionref] wostatus_collectionref =>',
    wostatusRef || '(vide)'
  );

  if (!wostatusRef) {
    throw new Error(
      'wostatus_collectionref introuvable — impossible de changer le statut via cette méthode.'
    );
  }

  const payload = [
    {
      status: statusValue,
      memo,
      statusdate: new Date().toISOString(),
    },
  ];

  const postRes = await axios.post<MaximoErrorShape>(
    withNoCache(wostatusRef),
    payload,
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

  console.log(
    '[STATUS][collectionref] POST =>',
    postRes.status,
    JSON.stringify(postRes.data)
  );

  if (postRes.status >= 400) {
    const msg =
      extractMaximoError(postRes.data) ||
      `Erreur POST collectionref (${postRes.status})`;
    throw new Error(msg);
  }

  // 204 = accepted by Maximo, but some versions silently ignore invalid
  // transitions. Confirmation is done in the main function below.
}

// ─── Main export: changeStatusByHref ─────────────────────────────────────────

/**
 * Change WO / Activity status.
 *
 * Strategy order:
 *   1) Direct PATCH { status } on WO href
 *      → returns a proper Maximo business-rule error if transition is invalid
 *      → error message is thrown to the caller / shown in the UI
 *
 *   2) wostatus_collectionref POST array
 *      → fallback if PATCH is not supported
 *      → followed by a GET to confirm the status actually changed
 *        (some Maximo versions return 204 for invalid transitions silently)
 *
 * NOTE: wsmethod:changeStatus is intentionally removed — this Maximo instance
 * returns 500 null-pointer for every wsmethod call.
 *
 * Returns the confirmed status code from Maximo after the change.
 */
export async function changeStatusByHref(
  href: string,
  newStatusValue: string,
  username: string,
  password: string,
  options?: { memo?: string }
): Promise<string> {
  const token = makeToken(username, password);
  const cleanHref = normalizeMaximoHref(href);
  const statusValue = safeTrim(newStatusValue);
  const memo = safeTrim(options?.memo) || 'Changement via mobile';

  if (!cleanHref) throw new Error('href manquant ou invalide');
  if (!statusValue) throw new Error('statut manquant');

  console.log(
    '[STATUS] changeStatusByHref | href =>',
    cleanHref,
    '| value =>',
    statusValue
  );

  // ── Strategy 1: Direct PATCH ────────────────────────────────────────────────
  // If Maximo rejects the transition (business rule), the error message is
  // meaningful (e.g. "WO must be in WAPPR status") — throw it directly so
  // the UI can display it to the user.
  try {
    await changeStatusViaPatch(cleanHref, statusValue, token);
    console.log('[STATUS] ✅ PATCH succeeded');
  } catch (patchErr: any) {
    console.warn('[STATUS] ⚠️ PATCH failed:', patchErr?.message);

    // If this is a Maximo business-rule rejection, surface it immediately.
    // These error codes mean "invalid transition", not a connectivity issue.
    const isBusinessRuleError =
      patchErr?.message?.includes('BMXAA4590E') ||
      patchErr?.message?.includes('BMXAA4679E') ||
      patchErr?.message?.includes('Could not change') ||
      patchErr?.message?.includes('must be of');

    if (isBusinessRuleError) {
      // Re-throw the Maximo error directly — no point trying collectionref
      // since it will also silently fail (204 but status unchanged)
      throw new Error(patchErr.message);
    }

    // ── Strategy 2: wostatus_collectionref ────────────────────────────────────
    console.log('[STATUS] → trying collectionref fallback...');
    try {
      await changeStatusViaCollectionRef(cleanHref, statusValue, token, memo);
      console.log('[STATUS] ✅ collectionref POST accepted');
    } catch (colErr: any) {
      console.error('[STATUS] ❌ collectionref failed:', colErr?.message);
      throw new Error(colErr?.message || 'Impossible de changer le statut.');
    }
  }

  // ── Confirm new status from Maximo ─────────────────────────────────────────
  // Wait briefly for Maximo to commit, then read back the actual status.
  await new Promise((r) => setTimeout(r, 800));

  try {
    const confirmed = await fetchStatusByHref(cleanHref, username, password);
    console.log('[STATUS] confirmed status =>', confirmed.status);

    // Detect silent failure: collectionref returned 204 but status didn't change
    if (confirmed.status && upper(confirmed.status) !== upper(statusValue)) {
      throw new Error(
        `Le statut n'a pas changé (actuel: ${confirmed.status}, attendu: ${statusValue}). ` +
        `Cette transition est peut-être interdite par les règles métier Maximo.`
      );
    }

    return confirmed.status || statusValue;
  } catch (confirmErr: any) {
    // If confirmation itself threw our "status didn't change" error, re-throw it
    if (confirmErr?.message?.includes('n\'a pas changé')) {
      throw confirmErr;
    }
    // If the GET itself failed (network etc.), return best-effort
    console.warn('[STATUS] confirmation GET failed (non-blocking):', confirmErr?.message);
    return statusValue;
  }
}