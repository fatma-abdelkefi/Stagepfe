import axios from 'axios';
import type { WorkOrder } from '../viewmodels/WorkOrdersViewModel';

import { MAXIMO } from '../config/maximoUrls';
import { makeToken } from './maximoClient';
import { rewriteDoclinkUrl, metaToDoclinkUrl } from './doclinks';
import { rewriteMaximoUrl } from './rewriteMaximoUrl';

// Maximo endpoints
const BASE_URL = `${MAXIMO.OSLC_OS}/mxwo`;

// --------------------------
// Helpers
// --------------------------
export const parseLabHrs = (val: string | number | undefined | null): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;

  const s = String(val).trim();
  if (!s) return 0;

  if (s.includes(':')) {
    const [h, m] = s.split(':').map((x) => Number(x));
    return (h || 0) + ((m || 0) / 60);
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

function parseQty(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;

  const s = String(val).trim().replace(',', '.');
  if (!s) return 0;

  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function safeTrim(v: any): string {
  return typeof v === 'string' ? v.trim() : String(v ?? '').trim();
}

function filenameFromUrl(u?: string): string {
  if (!u) return '';
  const clean = u.split('?')[0].split('#')[0].replace(/\/+$/, '');
  const last = clean.split('/').pop() || '';
  return last ? decodeURIComponent(last) : '';
}

function pickDocInfo(d: any): any | null {
  if (Array.isArray(d?.docinfo?.member) && d.docinfo.member.length > 0) return d.docinfo.member[0];
  if (d?.docinfo && typeof d.docinfo === 'object') return d.docinfo;
  return null;
}

function toArrayAny(v: any): any[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.member)) return v.member;
  return [v];
}

function pickAnyKey(obj: any, keys: string[]): any {
  if (!obj) return undefined;

  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  }

  const lowerMap: Record<string, any> = {};
  Object.keys(obj).forEach((k) => (lowerMap[k.toLowerCase()] = obj[k]));

  for (const k of keys) {
    const v = lowerMap[k.toLowerCase()];
    if (v !== undefined && v !== null && v !== '') return v;
  }

  return undefined;
}

type MaximoErrorPayload = {
  message?: string;
  reasonCode?: string;
  statusCode?: string | number;
  href?: string;
  error?: any;
};

function extractMaximoError(res: any): string {
  const data = (res?.data ?? {}) as MaximoErrorPayload;

  const parts: string[] = [];
  if ((data as any)?.Error?.reasonCode) parts.push(String((data as any)?.Error?.reasonCode));
  if ((data as any)?.Error?.message) parts.push(String((data as any)?.Error?.message));
  if (data.reasonCode) parts.push(String(data.reasonCode));
  if (data.message) parts.push(String(data.message));

  const http = `HTTP ${res?.status ?? '??'}`;
  if (parts.length) return `${http} - ${parts.join(' - ')}`;
  return http;
}

function maxauthHeaders(token: string): any {
  return {
    MAXAUTH: token,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
  };
}

function patchHeaders(token: string): any {
  return {
    ...maxauthHeaders(token),
    'x-method-override': 'PATCH',
    patchtype: 'MERGE',
    'If-Match': '*',
  };
}

export function normalizeOslcHref(anyHref: string): string {
  const href = String(anyHref || '').trim();
  if (!href) return '';

  const publicBase = String(MAXIMO.OSLC_OS).split('/oslc/os')[0].replace(/\/+$/, '');

  if (href.startsWith(publicBase)) return href.replace(/\/+$/, '');

  const idxOslc = href.indexOf('/oslc/os/');
  if (idxOslc >= 0) {
    const tail = href.substring(idxOslc);
    return `${publicBase}${tail}`.replace(/\/+$/, '');
  }

  const idxMaximo = href.indexOf('/maximo/');
  if (idxMaximo >= 0) {
    const tail = href.substring(idxMaximo + '/maximo'.length);
    return `${publicBase}${tail}`.replace(/\/+$/, '');
  }

  if (href.startsWith('/')) return `${publicBase}${href}`.replace(/\/+$/, '');

  return href.replace(/\/+$/, '');
}

export async function getWoHrefByWonum(wonum: string, username: string, password: string): Promise<string> {
  const token = makeToken(username, password);

  const res = await axios.get<any>(BASE_URL, {
    headers: {
      MAXAUTH: token,
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
    params: {
      lean: 1,
      'oslc.where': `wonum="${wonum}"`,
      'oslc.pageSize': 1,
      'oslc.select': 'href,wonum,siteid',
      _ts: Date.now(),
    },
    timeout: 30000,
    validateStatus: () => true,
  });

  if (res.status >= 400) throw new Error(extractMaximoError(res));
  const href = String(res.data?.member?.[0]?.href ?? '').trim();
  const fixed = normalizeOslcHref(href);
  if (!fixed) throw new Error('href mxwo introuvable pour ce wonum');
  return fixed.replace(/\/+$/, '');
}

// --------------------------
// Doclinks
// --------------------------
export type NormalizedDocLink = {
  document: string;
  description: string;
  createdate: string;
  urlname: string;

  href?: string;
  describedByHref?: string;
  describedByDesc?: string;
  doclinkId?: string;
};

function extractDoclinkIdFromHref(href?: string): string {
  const h = safeTrim(href);
  if (!h) return '';
  const clean = h.split('?')[0].split('#')[0].replace(/\/+$/, '');
  const last = clean.split('/').pop() || '';
  return /^\d+$/.test(last) ? last : '';
}

export function normalizeDoclinks(raw: any): NormalizedDocLink[] {
  if (!raw) return [];

  const member = Array.isArray(raw?.member) ? raw.member : null;
  const list = member ? member : Array.isArray(raw) ? raw : typeof raw === 'object' ? [raw] : [];

  return list.map((d: any) => {
    const di = pickDocInfo(d);

    const describedByHref = rewriteDoclinkUrl(safeTrim(d?.describedBy?.href));
    const describedByDesc = safeTrim(d?.describedBy?.description);

    const href = normalizeOslcHref(rewriteDoclinkUrl(metaToDoclinkUrl(safeTrim(d?.href) || safeTrim(di?.href))));
    const doclinkId = extractDoclinkIdFromHref(href);

    const rawUrl = safeTrim(d?.urlname) || safeTrim(di?.urlname) || safeTrim(di?.href) || safeTrim(d?.href);
    const urlname = normalizeOslcHref(rewriteDoclinkUrl(rawUrl));

    const title =
      safeTrim(d?.upload_documentname) ||
      safeTrim(d?.documenttitle) ||
      safeTrim(d?.documentname) ||
      safeTrim(d?.filename) ||
      safeTrim(d?.original_filename) ||
      safeTrim(d?.file_name) ||
      safeTrim(di?.upload_documentname) ||
      safeTrim(di?.documenttitle) ||
      safeTrim(di?.documentname) ||
      safeTrim(di?.doctitle) ||
      safeTrim(di?.title) ||
      safeTrim(di?.filename) ||
      safeTrim(d?.doctitle) ||
      safeTrim(d?.title) ||
      describedByDesc ||
      (safeTrim(d?.document) && !safeTrim(d?.document).match(/^\d+$/) ? safeTrim(d?.document) : '') ||
      (safeTrim(di?.document) && !safeTrim(di?.document).match(/^\d+$/) ? safeTrim(di?.document) : '') ||
      filenameFromUrl(urlname) ||
      (doclinkId ? `Document ${doclinkId}` : '') ||
      'Document sans nom';

    const desc = safeTrim(d?.description) || safeTrim(di?.description) || 'Aucune description';

    const createdate =
      safeTrim(di?.createdate) ||
      safeTrim(d?.createdate) ||
      safeTrim(di?.creationdate) ||
      safeTrim(d?.creationdate) ||
      safeTrim(di?.changedate) ||
      safeTrim(d?.changedate) ||
      '';

    return {
      document: title,
      description: desc,
      createdate,
      urlname: urlname || '',
      href: href || undefined,
      describedByHref: describedByHref || undefined,
      describedByDesc: describedByDesc || undefined,
      doclinkId: doclinkId || undefined,
    };
  });
}

export async function getDoclinkDetailsByHref(
  anyHref: string,
  username: string,
  password: string
): Promise<Partial<NormalizedDocLink> | null> {
  const token = makeToken(username, password);

  const fixed = normalizeOslcHref(rewriteDoclinkUrl(metaToDoclinkUrl(anyHref)));
  if (!fixed) return null;

  try {
    const res = await axios.get<any>(fixed, {
      headers: {
        MAXAUTH: token,
        Accept: 'application/json',
        properties: '*',
      },
      params: {
        lean: 1,
        'oslc.select': '*,docinfo{*},describedBy{*}',
        'oslc.expand': 'docinfo,describedBy',
        _ts: Date.now(),
      },
      timeout: 30000,
      validateStatus: () => true,
    });

    if (res.status >= 400) return null;

    const obj: any = res.data?.member?.[0] ?? res.data;
    if (!obj) return null;

    const di = pickDocInfo(obj);

    const title =
      safeTrim(obj?.upload_documentname) ||
      safeTrim(obj?.documenttitle) ||
      safeTrim(obj?.documentname) ||
      safeTrim(obj?.filename) ||
      safeTrim(di?.upload_documentname) ||
      safeTrim(di?.documenttitle) ||
      safeTrim(di?.documentname) ||
      safeTrim(di?.doctitle) ||
      safeTrim(di?.title);

    const desc =
      safeTrim(obj?.description) ||
      safeTrim(di?.description) ||
      safeTrim(obj?.describedBy?.description) ||
      '';

    const createdate =
      safeTrim(obj?.createdate) ||
      safeTrim(di?.createdate) ||
      safeTrim(obj?.creationdate) ||
      safeTrim(di?.creationdate) ||
      safeTrim(obj?.changedate) ||
      safeTrim(di?.changedate) ||
      '';

    const rawUrl = safeTrim(obj?.urlname) || safeTrim(di?.urlname) || safeTrim(obj?.href) || safeTrim(di?.href);

    const urlname = normalizeOslcHref(rewriteDoclinkUrl(rawUrl));
    const href = normalizeOslcHref(rewriteDoclinkUrl(metaToDoclinkUrl(safeTrim(obj?.href) || safeTrim(di?.href))));

    const display = title || filenameFromUrl(urlname) || filenameFromUrl(href);

    return {
      document: display || undefined,
      description: desc || undefined,
      createdate: createdate || undefined,
      urlname: urlname || undefined,
      href: href || undefined,
    };
  } catch {
    return null;
  }
}

// --------------------------
// ACTUALS READ/WRITE
// --------------------------

export type ActualLaborItem = { laborcode: string; regularhrs: number; transdate?: string };
export type ActualMaterialItem = { itemnum: string; itemqty: number; description: string };

function normalizeCollectionAny(v: any): any[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.member)) return v.member;
  return [v];
}

function mapActualMaterial(m: any): ActualMaterialItem {
  return {
    itemnum: safeTrim(
      pickAnyKey(m, ['itemnum', 'ITEMNUM'])
    ),
    itemqty: parseQty(
      pickAnyKey(m, [
        'itemqty',
        'ITEMQTY',
        'quantity',
        'QUANTITY',
        'qty',
        'QTY',
        'actualqty',
        'ACTUALQTY',
        'issueqty',
        'ISSUEQTY',
        'matuseqty',
        'MATUSEQTY',
        'usedqty',
        'USEDQTY',
      ])
    ),
    description: safeTrim(
      pickAnyKey(m, ['description', 'DESCRIPTION', 'itemdesc', 'ITEMDESC'])
    ) || '—',
  };
}

export async function getActualsFromWoHref(
  woHref: string,
  username: string,
  password: string
): Promise<{ actualLabor: ActualLaborItem[]; actualMaterials: ActualMaterialItem[] }> {
  const token = makeToken(username, password);
  const fixedHref = normalizeOslcHref(woHref).replace(/\/+$/, '');

  console.log('[ACTUALS] GET MXWO URL:', fixedHref);

  const res = await axios.get<any>(fixedHref, {
    headers: {
      MAXAUTH: token,
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
    params: {
      lean: 1,
      'oslc.select':
        'href,wonum,siteid,' +
        'labtrans{laborcode,regularhrs,transdate},' +
        'labtrans_reporting{laborcode,regularhrs,transdate},' +
        'matusetrans_collectionref,labtrans_collectionref',
      'oslc.expand': 'labtrans,labtrans_reporting',
      _ts: Date.now(),
    },
    timeout: 30000,
    validateStatus: () => true,
  });

  console.log('[ACTUALS] MXWO status:', res.status);
  if (res.status >= 400) return { actualLabor: [], actualMaterials: [] };

  const obj = res.data?.member?.[0] ?? res.data ?? {};

  const labRaw = [
    ...normalizeCollectionAny(pickAnyKey(obj, ['labtrans', 'LABTRANS'])),
    ...normalizeCollectionAny(pickAnyKey(obj, ['labtrans_reporting', 'LABTRANS_REPORTING'])),
  ];

  const actualLabor: ActualLaborItem[] = labRaw
    .map((l: any) => ({
      laborcode: safeTrim(pickAnyKey(l, ['laborcode', 'LABORCODE'])),
      regularhrs: parseLabHrs(pickAnyKey(l, ['regularhrs', 'REGULARHRS'])),
      transdate: safeTrim(pickAnyKey(l, ['transdate', 'TRANSDATE'])) || undefined,
    }))
    .filter((x) => !!x.laborcode || x.regularhrs > 0);

  const matRefRaw =
    safeTrim(pickAnyKey(obj, ['matusetrans_collectionref', 'MATUSETRANS_COLLECTIONREF'])) || '';

  const matRef = matRefRaw ? normalizeOslcHref(matRefRaw).replace(/\/+$/, '') : '';

  console.log('[ACTUALS] MATUSETRANS collectionref:', matRef);

  let actualMaterials: ActualMaterialItem[] = [];

  if (matRef) {
    const matRes = await axios.get<any>(matRef, {
      headers: {
        MAXAUTH: token,
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      params: {
        lean: 1,
        'oslc.pageSize': 1000,
        'oslc.select':
          'itemnum,itemqty,quantity,qty,actualqty,issueqty,matuseqty,usedqty,description,itemdesc',
        _ts: Date.now(),
      },
      timeout: 30000,
      validateStatus: () => true,
    });

    console.log('[ACTUALS] MATUSETRANS status:', matRes.status);
    console.log('[ACTUALS] MATUSETRANS body:', JSON.stringify(matRes.data, null, 2));

    if (matRes.status < 400) {
      const members = normalizeCollectionAny(matRes.data?.member ?? matRes.data);

      actualMaterials = members
        .map(mapActualMaterial)
        .filter((x) => !!x.itemnum || x.itemqty > 0);
    }
  }

  console.log('[ACTUALS] FINAL MAT COUNT:', actualMaterials.length);
  console.log('[ACTUALS] FINAL MAT DATA:', JSON.stringify(actualMaterials, null, 2));

  return { actualLabor, actualMaterials };
}

export async function getActualsByWonumSiteid(
  wonum: string,
  siteid: string,
  username: string,
  password: string
): Promise<{ actualLabor: ActualLaborItem[]; actualMaterials: ActualMaterialItem[] }> {
  const token = makeToken(username, password);

  console.log('[ACTUALS] GET DETAILS URL:', `${MAXIMO.OSLC_OS}/sm_mxwodetails`, 'wonum:', wonum, 'siteid:', siteid);

  const res = await axios.get<any>(`${MAXIMO.OSLC_OS}/sm_mxwodetails`, {
    headers: {
      MAXAUTH: token,
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
    params: {
      lean: 1,
      ignorecollectionref: 1,
      'oslc.where': `wonum="${wonum}" and siteid="${siteid}"`,
      'oslc.pageSize': 1,
      'oslc.select':
        'wonum,siteid,' +
        'labtrans{laborcode,regularhrs,transdate},' +
        'matusetrans{itemnum,itemqty,quantity,qty,actualqty,issueqty,matuseqty,usedqty,description,itemdesc}',
      _ts: Date.now(),
    },
    timeout: 30000,
    validateStatus: () => true,
  });

  console.log('[ACTUALS] DETAILS status:', res.status);
  console.log('[ACTUALS] DETAILS body:', JSON.stringify(res.data, null, 2));

  if (res.status >= 400) return { actualLabor: [], actualMaterials: [] };

  const obj = res.data?.member?.[0] ?? {};
  const labRaw = pickAnyKey(obj, ['labtrans', 'LABTRANS']);
  const matRaw = pickAnyKey(obj, ['matusetrans', 'MATUSETRANS']);

  const labArr = normalizeCollectionAny(labRaw);
  const matArr = normalizeCollectionAny(matRaw);

  const actualLabor: ActualLaborItem[] = labArr
    .map((l: any) => ({
      laborcode: safeTrim(pickAnyKey(l, ['laborcode', 'LABORCODE'])),
      regularhrs: parseLabHrs(pickAnyKey(l, ['regularhrs', 'REGULARHRS'])),
      transdate: safeTrim(pickAnyKey(l, ['transdate', 'TRANSDATE'])) || undefined,
    }))
    .filter((x) => !!x.laborcode || x.regularhrs > 0);

  const actualMaterials: ActualMaterialItem[] = matArr
    .map(mapActualMaterial)
    .filter((x) => !!x.itemnum || x.itemqty > 0);

  console.log('[ACTUALS] DETAILS MAT DATA:', JSON.stringify(actualMaterials, null, 2));

  return { actualLabor, actualMaterials };
}

// --------------------------
// ACTUALS WRITE
// --------------------------
export type AddActualResult = {
  status: number;
  data: any;
  bodyText: string;
};

function toBodyText(data: any): string {
  if (data === undefined || data === null) return '';
  if (typeof data === 'string') return data;
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

function toIsoWithOffset(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');

  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const ss = pad(d.getSeconds());

  const tzMin = -d.getTimezoneOffset();
  const sign = tzMin >= 0 ? '+' : '-';
  const tzAbs = Math.abs(tzMin);
  const tzh = pad(Math.floor(tzAbs / 60));
  const tzm = pad(tzAbs % 60);

  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}${sign}${tzh}:${tzm}`;
}

function toIsoNoTz(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}-` +
    `${pad(d.getUTCMonth() + 1)}-` +
    `${pad(d.getUTCDate())}T` +
    `${pad(d.getUTCHours())}:` +
    `${pad(d.getUTCMinutes())}:` +
    `${pad(d.getUTCSeconds())}`
  );
}

// --------------------------
// ACTUALS WRITE (MATERIAL)
// --------------------------
export async function addActualMaterial(
  woHref: string,
  username: string,
  password: string,
  payload: {
    itemnum: string;
    itemqty: number;
    storeroom: string;
    issuetype: string;
    siteid: string;
  }
): Promise<AddActualResult> {
  const token = makeToken(username, password);

  const fixedHref = normalizeOslcHref(rewriteMaximoUrl(woHref) || woHref).replace(/\/+$/, '');
  const url = `${fixedHref}?lean=1&_ts=${Date.now()}`;

  const body = {
    itemnum: String(payload.itemnum || '').trim(),
    itemqty: parseQty(payload.itemqty),
    storeroom: String(payload.storeroom || '').trim(),
    issuetype: String(payload.issuetype || '').trim(),
    siteid: String(payload.siteid || '').trim(),
  };

  console.log('──────────── addActualMaterial START ────────────');
  console.log('[addActualMaterial] URL:', url);
  console.log('[addActualMaterial] BODY:', JSON.stringify(body, null, 2));

  const res = await axios.post(url, body, {
    headers: {
      ...maxauthHeaders(token),
      'x-method-override': 'PATCH',
      patchtype: 'MERGE',
      'If-Match': '*',
    },
    timeout: 30000,
    validateStatus: () => true,
  });

  console.log('[addActualMaterial] RESPONSE STATUS:', res.status);
  console.log('[addActualMaterial] RESPONSE BODY:', toBodyText(res.data));

  if (!(res.status === 204 || (res.status >= 200 && res.status < 300))) {
    throw new Error(extractMaximoError(res));
  }

  console.log('[addActualMaterial] ✅ PATCH SUCCESS');
  console.log('──────────── addActualMaterial END ────────────');

  return {
    status: res.status,
    data: res.data,
    bodyText: toBodyText(res.data),
  };
}

export async function addActualLabor(
  woHref: string,
  username: string,
  password: string,
  payload: { laborcode: string; regularhrs: number }
): Promise<AddActualResult> {
  console.log('──────────── addActualLabor START ────────────');

  const token = makeToken(username, password);

  const fixedHref = normalizeOslcHref(woHref).replace(/\/+$/, '');
  const url = `${fixedHref}?lean=1&_ts=${Date.now()}`;

  const laborcode = String(payload.laborcode || '').trim();
  const regularhrs = Number(payload.regularhrs || 0);

  console.log('[addActualLabor] WO HREF (input):', woHref);
  console.log('[addActualLabor] fixedHref:', fixedHref);
  console.log('[addActualLabor] PATCH URL:', url);
  console.log('[addActualLabor] input payload:', { laborcode, regularhrs });

  let serverNow: Date | null = null;

  try {
    console.log('──────────── SERVER TIME PROBE ────────────');

    const probe = await axios.get<any>(fixedHref, {
      headers: {
        MAXAUTH: token,
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      params: { lean: 1, _ts: Date.now() },
      timeout: 30000,
      validateStatus: () => true,
    });

    const serverDateHeader: string | undefined = probe.headers?.date;
    console.log('[probe] status:', probe.status);
    console.log('[probe] server Date header:', serverDateHeader);

    if (serverDateHeader) {
      const parsed = new Date(serverDateHeader);
      if (!Number.isNaN(parsed.getTime())) serverNow = parsed;
    }
  } catch (e: any) {
    console.log('[probe] ❌ exception:', e?.message);
  }

  const deviceNow = new Date();
  console.log('[time] deviceNow ISO:', deviceNow.toISOString());

  if (serverNow) {
    console.log('[time] serverNow ISO:', serverNow.toISOString());
    console.log('[time] diff(ms) device-server:', deviceNow.getTime() - serverNow.getTime());
  } else {
    console.log('[time] serverNow not available -> fallback device time');
  }

  const base = serverNow ?? deviceNow;
  const bufferMinutes = 10;
  const backMinutes = regularhrs * 60 + bufferMinutes;
  const safeDate = new Date(base.getTime() - backMinutes * 60 * 1000);
  const transdate = toIsoNoTz(safeDate);

  console.log('[addActualLabor] chosen transdate (no tz, UTC):', transdate);

  const patchBody = {
    labtrans: [
      {
        laborcode,
        regularhrs,
        transdate,
      },
    ],
  };

  console.log('[addActualLabor] PATCH BODY:', JSON.stringify(patchBody, null, 2));

  const res = await axios.post(url, patchBody, {
    headers: {
      MAXAUTH: token,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      'x-method-override': 'PATCH',
      patchtype: 'MERGE',
      'If-Match': '*',
    },
    timeout: 30000,
    validateStatus: () => true,
  });

  console.log('[addActualLabor] RESPONSE STATUS:', res.status);
  console.log('[addActualLabor] RESPONSE BODY:', toBodyText(res.data));

  if (!(res.status === 204 || (res.status >= 200 && res.status < 300))) {
    console.log('[addActualLabor] ❌ ERROR BODY:', toBodyText(res.data));
    throw new Error(extractMaximoError(res));
  }

  console.log('[addActualLabor] ✅ PATCH SUCCESS');

  try {
    console.log('──────────── VERIFY AFTER PATCH ────────────');

    const verify = await axios.get<any>(fixedHref, {
      headers: { MAXAUTH: token, Accept: 'application/json' },
      params: {
        lean: 1,
        'oslc.select': 'labtrans{laborcode,regularhrs,transdate}',
        'oslc.expand': 'labtrans',
        _ts: Date.now(),
      },
      timeout: 30000,
      validateStatus: () => true,
    });

    console.log('[VERIFY] STATUS:', verify.status);

    if (verify.status < 300) {
      console.log('✅ VERIFY LABTRANS AFTER PATCH:');
      console.log(JSON.stringify(verify.data, null, 2));

      const data: any = verify.data;
      const lab = data?.labtrans ?? data?.member?.[0]?.labtrans ?? [];
      console.log('[VERIFY] LABTRANS COUNT:', Array.isArray(lab) ? lab.length : 0);
    } else {
      console.log('[VERIFY] ❌ ERROR BODY:', JSON.stringify(verify.data, null, 2));
    }
  } catch (err: any) {
    console.log('[VERIFY] ❌ EXCEPTION:', err?.message);
  }

  console.log('──────────── addActualLabor END ────────────');

  return {
    status: res.status,
    data: res.data,
    bodyText: toBodyText(res.data),
  };
}

// --------------------------
// Work Order Details (base)
// --------------------------
interface MaximoWorkOrderItem {
  href?: string;
  wonum?: string;
  description?: string;
  status?: string;
  assetnum?: string;
  asset?: { description?: string } | string;
  location?: string | { location?: string };
  locationdescription?: string;
  priority?: number | string;
  siteid?: string;
  workorderid?: number;
  ishistory?: boolean;
  scheduledstart?: string;
  scheduledfinish?: string;
  woactivity?: any | any[];
  wplabor?: any | any[];
  wpmaterial?: any | any[];
  doclinks?: any;
}

interface MaximoResponse {
  member?: MaximoWorkOrderItem[];
}

export async function getWorkOrderDetails(
  wonum: string,
  username: string,
  password: string
): Promise<WorkOrder | null> {
  const token = makeToken(username, password);

  try {
    const res = await axios.get<MaximoResponse>(BASE_URL, {
      headers: {
        MAXAUTH: token,
        Accept: 'application/json',
        properties: '*',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      params: {
        lean: 1,
        'oslc.where': `wonum="${wonum}"`,
        'oslc.pageSize': 1,
        'oslc.select':
          'href,wonum,description,status,assetnum,asset.description,location,locationdescription,priority,siteid,workorderid,ishistory,' +
          'scheduledstart,scheduledfinish,' +
          'woactivity{href,taskid,description,status,labhrs},' +
          'wplabor{taskid,laborcode,description,labhrs,regularhrs,laborhrs},' +
          'wpmaterial{taskid,itemnum,description,itemqty},' +
          'doclinks{href,urlname,document,description,createdate,creationdate,changedate,' +
          'describedBy{description,href},' +
          'docinfo{document,description,createdate,creationdate,changedate,urlname,doctitle,title,href}}',
        'oslc.expand': 'doclinks{docinfo},doclinks{describedBy}',
        _ts: Date.now(),
      },
      timeout: 30000,
      validateStatus: () => true,
    });

    if (res.status >= 400) return null;
    if (!res.data.member?.length) return null;

    const item = res.data.member[0];

    const loc = typeof item.location === 'string' ? item.location : (item.location as any)?.location ?? '';
    const locDesc = item.locationdescription ?? loc ?? '';
    const docLinksArr = normalizeDoclinks(item.doclinks);

    const activitiesRaw = Array.isArray(item.woactivity) ? item.woactivity : item.woactivity ? [item.woactivity] : [];

    const wo: WorkOrder = {
      wonum: item.wonum ?? wonum,
      barcode: item.wonum ?? wonum,

      href: normalizeOslcHref(safeTrim((item as any)?.href)) || undefined,

      description: item.description ?? '',
      details: '',

      location: locDesc || loc || '',
      locationDescription: locDesc || '',

      asset: item.assetnum ?? '',
      assetDescription: (item as any)?.asset?.description ?? '',

      status: item.status ?? '',

      scheduledStart: item.scheduledstart ?? null,
      scheduledFinish: item.scheduledfinish ?? null,

      priority: Number(item.priority ?? 0),
      isDynamic: false,
      dynamicJobPlanApplied: false,

      site: item.siteid ?? '',
      siteid: item.siteid ?? undefined,
      workorderid: item.workorderid ?? undefined,
      ishistory: item.ishistory ?? undefined,

      completed: ['COMP', 'CLOSE'].includes((item.status ?? '').toUpperCase()),
      isUrgent: Number(item.priority) === 1,
      cout: 0,

      activities: activitiesRaw.map((a: any) => {
        const status = String(a?.status ?? '');
        return {
          href: normalizeOslcHref(safeTrim(a?.href)) || undefined,
          taskid: String(a?.taskid ?? ''),
          description: a?.description ?? '',
          labhrs: parseLabHrs(a?.labhrs),
          status,
          statut: status,
        };
      }),

      labor: toArrayAny(item.wplabor).map((l: any) => ({
        taskid: String(l?.taskid ?? ''),
        laborcode: l?.laborcode ?? '',
        description: l?.description ?? '',
        labhrs: parseLabHrs(l?.labhrs ?? l?.regularhrs ?? l?.laborhrs),
      })),

      materials: toArrayAny(item.wpmaterial).map((m: any) => ({
        taskid: String(m?.taskid ?? ''),
        itemnum: m?.itemnum ?? '',
        description: m?.description ?? '',
        quantity: parseQty(m?.itemqty ?? m?.quantity ?? m?.qty),
      })),

      docLinks: docLinksArr as any,
    };

    return wo;
  } catch (err: any) {
    console.error('❌ [getWorkOrderDetails] error status:', err?.response?.status);
    console.error('❌ [getWorkOrderDetails] message:', err?.message || err);
    return null;
  }
}