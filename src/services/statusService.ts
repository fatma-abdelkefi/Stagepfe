// src/services/statusService.ts
import axios from 'axios';
import { MAXIMO } from '../config/maximoUrls';
import { makeToken } from './maximoClient';
import { rewriteDoclinkUrl } from './doclinks';

export type StatusOption = {
  value: string;        // synonym value (THIS is what Maximo status field usually stores)
  description?: string;
  maxvalue?: string;    // canonical code
};

export type StatusFR = {
  key: string;
  code: string;         // maxvalue (ex: INPRG)
  value: string;        // synonym value (ex: WPCOND)
  libelle: string;
  descriptionBrute?: string;
};

type MaximoDomainResp = {
  member?: Array<{ value?: string; description?: string; maxvalue?: string }>;
  [k: string]: any;
};

export const WOSTATUS_DOMAIN_ID = '_V09TVEFUVVM-';
export const DEFAULT_ACTIVITY_DOMAIN_ID = WOSTATUS_DOMAIN_ID;

export const FR_BY_CODE: Record<string, string> = {
  WAPPR: 'En attente d’approbation',
  APPR: 'Approuvé',
  INPRG: 'En cours',
  WMATL: 'En attente de matériel',
  WSCH: 'En attente de planification',
  COMP: 'Terminé',
  CLOSE: 'Clôturé',
  CAN: 'Annulé',
  CANC: 'Annulé',
  HISTEDIT: 'Modifié dans l’historique',
  WPCOND: 'Attente condition atelier',
};

function domainSynonymUrl(encodedDomainId: string) {
  return `${MAXIMO.OSLC_OS}/mxdomain/${encodedDomainId}/synonymdomain`;
}

async function getSynonymDomainOptions(
  domainId: string,
  username: string,
  password: string
): Promise<StatusOption[]> {
  const token = makeToken(username, password);

  const res = await axios.get<MaximoDomainResp>(domainSynonymUrl(domainId), {
    headers: {
      MAXAUTH: token,
      Authorization: `Basic ${token}`,
      Accept: 'application/json',
    },
    params: {
      lean: 1,
      'oslc.select': 'value,description,maxvalue',
      'oslc.pageSize': 1000,
      _ts: Date.now(),
    },
    timeout: 30000,
    validateStatus: () => true,
  });

  if (res.status >= 400) {
    const msg =
      (res.data as any)?.Error?.message ||
      (res.data as any)?.error?.message ||
      (res.data as any)?.message ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }

  const members = Array.isArray(res.data?.member) ? res.data.member : [];
  return members
    .map((m) => ({
      value: String(m.value ?? '').trim(),
      description: String(m.description ?? '').trim(),
      maxvalue: String(m.maxvalue ?? '').trim(),
    }))
    .filter((x) => !!x.value);
}

function toFRList(raw: StatusOption[]): StatusFR[] {
  const list: StatusFR[] = raw
    .map((it) => {
      const code = String(it.maxvalue || it.value).trim(); // canonical
      const value = String(it.value || '').trim();         // synonym (send this!)
      const descriptionBrute = it.description || '';
      const libelle = FR_BY_CODE[code] || descriptionBrute || code;

      return {
        key: `${code}__${value}`,
        code,
        value,
        libelle,
        descriptionBrute,
      };
    })
    .filter((x) => !!x.value);

  const map = new Map<string, StatusFR>();
  for (const s of list) map.set(s.key, s);

  const unique = Array.from(map.values());
  unique.sort((a, b) => a.libelle.localeCompare(b.libelle));
  return unique;
}

export async function getWorkOrderStatusListFR(username: string, password: string): Promise<StatusFR[]> {
  const raw = await getSynonymDomainOptions(WOSTATUS_DOMAIN_ID, username, password);
  return toFRList(raw);
}

export async function getActivityStatusListFR(
  username: string,
  password: string,
  domainIdOverride?: string
): Promise<StatusFR[]> {
  const domainId = domainIdOverride || DEFAULT_ACTIVITY_DOMAIN_ID;
  const raw = await getSynonymDomainOptions(domainId, username, password);
  return toFRList(raw);
}

function extractMaximoError(data: any): string {
  const msg = data?.Error?.message || data?.error?.message || data?.message;
  return String(msg || '').trim();
}

function throwIfMaximoReturnedErrorEvenWith200(data: any) {
  const msg = extractMaximoError(data);
  if (msg) throw new Error(msg);
}

/**
 * Read status back (truth from Maximo)
 */
export async function fetchStatusByHref(
  href: string,
  username: string,
  password: string
): Promise<string | null> {
  const token = makeToken(username, password);
  const fixedHref = rewriteDoclinkUrl(String(href || '').trim());
  if (!fixedHref) return null;

  const res = await axios.get<any>(fixedHref, {
    headers: {
      MAXAUTH: token,
      Authorization: `Basic ${token}`,
      Accept: 'application/json',
    },
    params: {
      lean: 1,
      'oslc.select': 'status',
      _ts: Date.now(),
    },
    timeout: 30000,
    validateStatus: () => true,
  });

  if (res.status >= 400) return null;

  const obj: any = res.data?.member?.[0] ?? res.data;
  const st = String(obj?.status ?? '').trim();
  return st || null;
}

/**
 * ✅ Change status for a resource href.
 * IMPORTANT: send the synonym "value" (not maxvalue) to Maximo.
 */
export async function changeStatusByHref(
  href: string,
  newStatusValue: string,
  username: string,
  password: string,
  opts?: { memo?: string }
): Promise<void> {
  const token = makeToken(username, password);

  const fixedHref = rewriteDoclinkUrl(String(href || '').trim());
  if (!fixedHref) throw new Error('href manquant');

  const body = {
    status: String(newStatusValue || '').trim(), // ✅ synonym value
    memo: opts?.memo ?? 'Changement via mobile',
    statusdate: new Date().toISOString(),
  };

  const headers = {
    MAXAUTH: token,
    Authorization: `Basic ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'If-Match': '*',
  };

  // Try common Maximo action:
  const actionUrl =
    fixedHref +
    (fixedHref.includes('?') ? '&' : '?') +
    `action=wostatus&lean=1&_ts=${Date.now()}`;

  const res = await axios.post(actionUrl, body, {
    headers,
    timeout: 30000,
    validateStatus: () => true,
  });

  // ✅ if server returns 200 but with Error => throw
  try {
    throwIfMaximoReturnedErrorEvenWith200(res.data);
  } catch (e) {
    // add debugging context
    console.log('❌ Maximo Error Body:', JSON.stringify(res.data)?.slice(0, 2000));
    throw e;
  }

  if (res.status >= 400) {
    const msg = extractMaximoError(res.data) || `HTTP ${res.status}`;
    console.log('❌ Maximo Error Body:', JSON.stringify(res.data)?.slice(0, 2000));
    throw new Error(msg);
  }
}