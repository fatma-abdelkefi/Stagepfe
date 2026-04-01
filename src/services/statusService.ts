import axios from 'axios';
import { makeToken } from './maximoClient';
import { rewriteMaximoUrl } from './rewriteMaximoUrl';

export type StatusFR = {
  key: string;
  libelle: string;
  code: string;
  value: string;
};

export const DEFAULT_WO_DOMAIN_ID = 'WOSTATUS';
export const DEFAULT_ACTIVITY_DOMAIN_ID = 'WOSTATUS';

export const FR_BY_CODE: Record<string, string> = {
  WAPPR: "En attente d'approbation",
  APPR: 'Approuvé',
  INPRG: 'En cours',
  WMATL: 'En attente de matériel',
  WPCOND: 'En attente condition usine',
  COMP: 'Terminé',
  CLOSE: 'Clôturé',
  CAN: 'Annulé',
  CANC: 'Annulé',
  WSCH: 'En attente de planification',
  WSCHED: 'En attente de planification',
  HISTEDIT: "Modifié dans l'historique",
};

const FR_LABEL_BY_VALUE: Record<string, string> = {
  WAPPR: "En attente d'approbation",
  APPR: 'Approuvé',
  INPRG: 'En cours',
  WMATL: 'En attente de matériel',
  WPCOND: 'En attente condition usine',
  COMP: 'Terminé',
  CLOSE: 'Clôturé',
  CAN: 'Annulé',
  CANC: 'Annulé',
  WSCH: 'En attente de planification',
  WSCHED: 'En attente de planification',
  HISTEDIT: "Modifié dans l'historique",
};

type MaximoErrorShape = {
  Error?: { message?: string; extendedError?: { message?: string } };
  error?: { message?: string };
  message?: string;
};

type MaximoListResp<T> = MaximoErrorShape & {
  member?: T[];
};

type MaximoDomainMember = {
  value?: string;
  description?: string;
  maxvalue?: string;
  domainid?: string;
};

function safeTrim(v: any): string {
  return typeof v === 'string' ? v.trim() : String(v ?? '').trim();
}

function upper(v: any): string {
  return safeTrim(v).toUpperCase();
}

function withNoCache(url: string): string {
  return url.includes('?') ? `${url}&_ts=${Date.now()}` : `${url}?_ts=${Date.now()}`;
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
  if (!Number.isNaN(n)) return String(n);
  return `"${s}"`;
}

export function normalizeMaximoHref(inputHref: string): string {
  const raw = safeTrim(inputHref);
  if (!raw) return '';

  let fixed = raw.split('#')[0];

  fixed = rewriteMaximoUrl(fixed);

  fixed = fixed.replace('/maxiimo/', '/maximo/');
  fixed = fixed.replace('/ooslc/', '/oslc/');
  fixed = fixed.replace('/maximo/maximo/', '/maximo/');
  fixed = fixed.replace(/([^:])\/\/+/g, '$1/');
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

export function getFrenchStatusLabel(status?: string, fallbackLabel?: string): string {
  const code = upper(status);

  return (
    FR_LABEL_BY_VALUE[code] ||
    FR_BY_CODE[code] ||
    safeTrim(fallbackLabel) ||
    safeTrim(status) ||
    '-'
  );
}

export async function getStatusListFR(
  username: string,
  password: string,
  domainId: string
): Promise<StatusFR[]> {

  const token = makeToken(username, password);

  const url = normalizeMaximoHref(
    'http://demo2.smartech-tn.com/maximo/oslc/os/MXAPISYNONYMDOMAIN'
  );

  const res = await axios.get<MaximoListResp<MaximoDomainMember>>(withNoCache(url), {
    headers: makeAuthHeaders(token),
    params: {
      lean: 1,
      'oslc.select': 'value,description,maxvalue,domainid',
      'oslc.where': `domainid=${oslcLiteral(domainId)}`,
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
      const maxvalue = safeTrim(m?.maxvalue);

      const code = value || maxvalue;

      if (!code) return null;

      const label = getFrenchStatusLabel(code, m?.description);

      return {
        key: `${code}_${idx}`,
        libelle: label,
        code,
        value: code,
      };

    })
    .filter(Boolean) as StatusFR[];
}

export async function getWorkOrderStatusListFR(
  username: string,
  password: string
) {
  return getStatusListFR(username, password, DEFAULT_WO_DOMAIN_ID);
}

export async function getActivityStatusListFR(
  username: string,
  password: string,
  activityDomainId: string = DEFAULT_ACTIVITY_DOMAIN_ID
) {
  return getStatusListFR(username, password, activityDomainId);
}

/* =========================
   CHANGE WORK ORDER STATUS
   ========================= */

export async function changeStatusByHref(
  href: string,
  newStatusValue: string,
  username: string,
  password: string,
  options?: { memo?: string }
): Promise<string> {

  const token = makeToken(username, password);

  const cleanHref = normalizeMaximoHref(href);

  const payload = {
    status: newStatusValue,
    memo: options?.memo || 'Changement via mobile',
    statusdate: new Date().toISOString(),
  };

  const res = await axios.post(
    withNoCache(cleanHref),
    payload,
    {
      headers: {
        ...makeAuthHeaders(token),
        'Content-Type': 'application/json',
        'x-method-override': 'PATCH',
        patchtype: 'MERGE',
        'If-Match': '*',
      },
      timeout: 30000,
      validateStatus: () => true,
    }
  );

  if (res.status >= 400) {
    throw new Error(extractMaximoError(res.data) || `Erreur PATCH (${res.status})`);
  }

  return newStatusValue;
}

/* =========================
   CHANGE ACTIVITY STATUS
   ========================= */

export async function changeActivityStatus(
  activity: { taskid?: any; wonum?: any; siteid?: any; workorderid?: any },
  newStatusValue: string,
  username: string,
  password: string,
  options?: { memo?: string }
): Promise<string> {

  const token = makeToken(username, password);

  const payload = {
    status: newStatusValue,
    memo: options?.memo || 'Changement via mobile',
    statusdate: new Date().toISOString(),
  };

  const url = normalizeMaximoHref(
    `http://demo2.smartech-tn.com/maximo/oslc/os/mxwo`
  );

  const res = await axios.post(
    withNoCache(url),
    payload,
    {
      headers: {
        ...makeAuthHeaders(token),
        'Content-Type': 'application/json',
      },
      timeout: 30000,
      validateStatus: () => true,
    }
  );

  if (res.status >= 400) {
    throw new Error(extractMaximoError(res.data) || `Erreur changement statut activité`);
  }

  return newStatusValue;
}