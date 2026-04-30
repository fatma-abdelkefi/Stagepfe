import axios from 'axios';
import { Buffer } from 'buffer';
import { MAXIMO } from '../config/maximoUrls';
import { rewriteMaximoUrl } from './rewriteMaximoUrl';

export const DEFAULT_ACTIVITY_DOMAIN_ID = 'WOSTATUS';

export type StatusFR = {
  key: string;
  code: string;
  value: string;
  libelle: string;
};

type ChangeStatusOptions = {
  memo?: string;
};

type ActivityCtx = {
  taskid?: string | number;
  wonum?: string | number;
  siteid?: string | number;
  workorderid?: string | number;
  href?: string;
};

export const FR_BY_CODE: Record<string, string> = {
  WAPPR: 'En attente',
  APPR: 'Approuvé',
  WSCH: 'Planifié',
  SCHED: 'Planifié',
  INPRG: 'En cours',
  COMP: 'Terminé',
  CLOSE: 'Clôturé',
  CAN: 'Annulé',
  CANC: 'Annulé',
  HOLD: 'En attente',
};

function safeTrim(v: any): string {
  return typeof v === 'string' ? v.trim() : String(v ?? '').trim();
}

function upper(v: any): string {
  return safeTrim(v).toUpperCase();
}

export function getFrenchStatusLabel(code?: string, fallback?: string): string {
  const c = upper(code);
  if (!c) return safeTrim(fallback) || '-';
  return FR_BY_CODE[c] || safeTrim(fallback) || c;
}

export function normalizeMaximoHref(href?: string): string {
  const raw = safeTrim(href);
  if (!raw) return '';

  if (raw.startsWith('http://childkey#')) {
    return raw;
  }

  return rewriteMaximoUrl(raw);
}

function makeBasicAuth(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

function buildJsonHeaders(username: string, password: string) {
  return {
    Authorization: makeBasicAuth(username, password),
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

function buildPatchHeaders(username: string, password: string) {
  return {
    Authorization: makeBasicAuth(username, password),
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'x-method-override': 'PATCH',
    patchtype: 'MERGE',
    properties: '*',
  };
}

function mapDomainRowsToFR(rows: any[]): StatusFR[] {
  const mapped = rows.map((item: any, index: number) => {
    const code = upper(item?.value || item?.maxvalue);
    const fallback = safeTrim(item?.description || item?.maxvalue || item?.value);

    return {
      key: `${code || 'STATUS'}_${index}`,
      code,
      value: code,
      libelle: getFrenchStatusLabel(code, fallback),
    };
  });

  return mapped.filter(
    (item, index, arr) => arr.findIndex((x) => x.code === item.code) === index,
  );
}

export async function getWorkOrderStatusListFR(
  username: string,
  password: string,
): Promise<StatusFR[]> {
  const url =
    `${MAXIMO.OSLC_OS}/MXAPISYNONYMDOMAIN` +
    `?oslc.where=domainid="WOSTATUS"` +
    `&oslc.select=domainid,maxvalue,value,description,defaults` +
    `&lean=1`;

  const response = await axios.get(url, {
    headers: buildJsonHeaders(username, password),
  });

  const rows = Array.isArray(response?.data?.member) ? response.data.member : [];
  return mapDomainRowsToFR(rows);
}

export async function getActivityStatusListFR(
  username: string,
  password: string,
  activityDomainId: string = DEFAULT_ACTIVITY_DOMAIN_ID,
): Promise<StatusFR[]> {
  const domainId = safeTrim(activityDomainId) || DEFAULT_ACTIVITY_DOMAIN_ID;

  const url =
    `${MAXIMO.OSLC_OS}/MXAPISYNONYMDOMAIN` +
    `?oslc.where=domainid="${domainId}"` +
    `&oslc.select=domainid,maxvalue,value,description,defaults` +
    `&lean=1`;

  const response = await axios.get(url, {
    headers: buildJsonHeaders(username, password),
  });

  const rows = Array.isArray(response?.data?.member) ? response.data.member : [];
  return mapDomainRowsToFR(rows);
}

export async function changeStatusByHref(
  href: string,
  newStatusValue: string,
  username: string,
  password: string,
  options?: ChangeStatusOptions,
): Promise<string> {
  const cleanHref = normalizeMaximoHref(href);
  const status = upper(newStatusValue);

  if (!cleanHref) {
    throw new Error("href manquant pour le changement de statut de l'ordre de travail");
  }

  if (!status) {
    throw new Error('Nouveau statut OT manquant');
  }

  const payload: Record<string, any> = {
    status,
  };

  if (options?.memo) {
    payload.memo = safeTrim(options.memo);
  }

  const response = await axios.post(cleanHref, payload, {
    headers: buildPatchHeaders(username, password),
  });

  const contentType = String(response?.headers?.['content-type'] || '').toLowerCase();
  const bodyAsString =
    typeof response?.data === 'string' ? response.data : JSON.stringify(response?.data || {});

  if (contentType.includes('text/html') || bodyAsString.includes('<!DOCTYPE html>')) {
    throw new Error("La requête WO a retourné une page HTML Maximo au lieu d'une réponse OSLC JSON");
  }
  return status;
}

export async function changeActivityStatus(
  activityCtx: ActivityCtx,
  newStatusValue: string,
  username: string,
  password: string,
  options?: ChangeStatusOptions,
): Promise<string> {
  const taskid = safeTrim(activityCtx?.taskid);
  const wonum = safeTrim(activityCtx?.wonum);
  const siteid = safeTrim(activityCtx?.siteid);

  if (!taskid) {
    throw new Error("taskid manquant pour le changement de statut d'activité");
  }

  if (!wonum) {
    throw new Error("wonum manquant pour le changement de statut d'activité");
  }

  if (!siteid) {
    throw new Error("siteid manquant pour le changement de statut d'activité");
  }

  const status = upper(newStatusValue);
  if (!status) {
    throw new Error('Nouveau statut activité manquant');
  }

  const lookupUrl =
    `${MAXIMO.MXWO}` +
    `?oslc.where=wonum="${wonum}" and siteid="${siteid}"` +
    `&oslc.select=href,wonum,siteid,woactivity{href,localref,taskid,workorderid,status,wonum,siteid}` +
    `&lean=1`;

  console.log('[ACTIVITY] lookup URL:', lookupUrl);

  const lookupResponse = await axios.get(lookupUrl, {
    headers: buildJsonHeaders(username, password),
  });

  const parent = lookupResponse?.data?.member?.[0];
  if (!parent) {
    throw new Error('Ordre de travail parent introuvable');
  }

  const activities = Array.isArray(parent?.woactivity) ? parent.woactivity : [];

  const targetActivity = activities.find(
    (item: any) => safeTrim(item?.taskid) === taskid,
  );

  if (!targetActivity) {
    throw new Error(`Activité taskid=${taskid} introuvable dans le work order ${wonum}`);
  }

  const parentHrefRaw =
    typeof parent?.href === 'string'
      ? parent.href
      : parent?.href?.href || parent?._href || parent?.['rdf:about'] || '';

  if (!parentHrefRaw) {
    throw new Error('href parent introuvable');
  }

  const patchUrl = rewriteMaximoUrl(parentHrefRaw);

  const targetHrefRaw =
    typeof targetActivity?.href === 'string'
      ? targetActivity.href
      : targetActivity?.href?.href ||
        targetActivity?._href ||
        targetActivity?.['rdf:about'] ||
        '';

  const targetLocalRef = safeTrim(targetActivity?.localref);
  const targetWorkorderId = safeTrim(targetActivity?.workorderid);

  const activityPayload: Record<string, any> = {
    taskid: Number(taskid),
    status,
    statusdate: new Date().toISOString(),
  };

  if (targetLocalRef) {
    activityPayload.localref = targetLocalRef;
  }

  if (targetHrefRaw) {
    activityPayload.href = targetHrefRaw;
  }

  if (targetWorkorderId) {
    activityPayload.workorderid = targetWorkorderId;
  }

  if (options?.memo) {
    activityPayload.memo = safeTrim(options.memo);
  }

  const payload: Record<string, any> = {
    woactivity: [activityPayload],
  };

  const response = await axios.post(patchUrl, payload, {
    headers: buildPatchHeaders(username, password),
  });

  const contentType = String(response?.headers?.['content-type'] || '').toLowerCase();
  const bodyAsString =
    typeof response?.data === 'string' ? response.data : JSON.stringify(response?.data || {});

  if (contentType.includes('text/html') || bodyAsString.includes('<!DOCTYPE html>')) {
    throw new Error("La requête activité a retourné une page HTML Maximo au lieu d'une réponse OSLC JSON");
  }
  return status;
}