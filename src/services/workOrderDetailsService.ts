// ✅ src/services/workOrderDetailsService.ts
import axios from 'axios';
import type { WorkOrder } from '../viewmodels/WorkOrdersViewModel';

import { MAXIMO } from '../config/maximoUrls';
import { makeToken } from './maximoClient';
import { rewriteDoclinkUrl, metaToDoclinkUrl } from './doclinks';

// ✅ Maximo endpoints
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

  for (const k of keys) if (obj[k] !== undefined) return obj[k];

  const lowerMap: Record<string, any> = {};
  Object.keys(obj).forEach((k) => (lowerMap[k.toLowerCase()] = obj[k]));
  for (const k of keys) {
    const v = lowerMap[k.toLowerCase()];
    if (v !== undefined) return v;
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

// ✅ IMPORTANT: MAXAUTH ONLY
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

/**
 * ✅ CRITICAL FIX:
 * Maximo may return href with LAN host (192.168.x.x).
 * Mobile must always call public host (demo2...).
 */
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

// --------------------------
// ✅ NEW: Always re-fetch the real mxwo href by wonum (fixes corrupted woHref between screens)
// --------------------------
export async function getWoHrefByWonum(
  wonum: string,
  username: string,
  password: string
): Promise<string> {
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
// ✅ ACTUALS READ (FROM MXWO ONLY)
// --------------------------
export type ActualLaborItem = { laborcode: string; regularhrs: number };
export type ActualMaterialItem = { itemnum: string; itemqty: number; description: string };

function normalizeCollectionAny(v: any): any[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.member)) return v.member;
  return [v];
}

export async function getActualsFromWoHref(
  woHref: string,
  username: string,
  password: string
): Promise<{ actualLabor: ActualLaborItem[]; actualMaterials: ActualMaterialItem[] }> {
  const token = makeToken(username, password);

  const fixedHref = normalizeOslcHref(woHref).replace(/\/+$/, '');

  console.log('[ACTUALS] GET URL:', fixedHref);

  const res = await axios.get<any>(fixedHref, {
    headers: {
      MAXAUTH: token,
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
    params: {
      lean: 1,
      'oslc.select': 'href,wonum,labtrans{laborcode,regularhrs},matusetrans{itemnum,itemqty,description}',
      'oslc.expand': 'labtrans,matusetrans',
      _ts: Date.now(),
    },
    timeout: 30000,
    validateStatus: () => true,
  });

  console.log('[ACTUALS] status:', res.status);

  if (res.status >= 400) return { actualLabor: [], actualMaterials: [] };

  const obj = res.data?.member?.[0] ?? res.data ?? {};

  const labRaw = pickAnyKey(obj, ['labtrans', 'LABTRANS']);
  const matRaw = pickAnyKey(obj, ['matusetrans', 'MATUSETRANS']);

  const labArr = normalizeCollectionAny(labRaw);
  const matArr = normalizeCollectionAny(matRaw);

  const actualLabor: ActualLaborItem[] = labArr
    .map((l: any) => ({
      laborcode: safeTrim(pickAnyKey(l, ['laborcode', 'LABORCODE'])),
      regularhrs: parseLabHrs(pickAnyKey(l, ['regularhrs', 'REGULARHRS'])),
    }))
    .filter((x) => !!x.laborcode || x.regularhrs > 0);

  const actualMaterials: ActualMaterialItem[] = matArr
    .map((m: any) => ({
      itemnum: safeTrim(pickAnyKey(m, ['itemnum', 'ITEMNUM'])),
      itemqty: Number(pickAnyKey(m, ['itemqty', 'ITEMQTY']) ?? 0),
      description: safeTrim(pickAnyKey(m, ['description', 'DESCRIPTION'])) || '—',
    }))
    .filter((x) => !!x.itemnum || x.itemqty > 0);

  return { actualLabor, actualMaterials };
}

// --------------------------
// ✅ ACTUALS WRITE (MXWO ONLY) + returns AddActualResult with bodyText
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

export async function addActualLabor(
  woHref: string,
  username: string,
  password: string,
  payload: { laborcode: string; regularhrs: number }
): Promise<AddActualResult> {
  const token = makeToken(username, password);

  const fixedHref = normalizeOslcHref(woHref).replace(/\/+$/, '');
  const url = `${fixedHref}?lean=1`; // ✅ IMPORTANT: use fixedHref

  console.log('[addActualLabor] fixedHref:', fixedHref);
  console.log('[addActualLabor] POST URL:', url);
  console.log('[addActualLabor] url==fixed?', url.startsWith(fixedHref));

  const res = await axios.post(
    url,
    {
      labtrans_reporting: [
        {
          laborcode: String(payload.laborcode || '').trim(),
          regularhrs: Number(payload.regularhrs || 0),
        },
      ],
    },
    {
      headers: patchHeaders(token),
      timeout: 30000,
      validateStatus: () => true,
    }
  );

  console.log('[addActualLabor] status:', res.status);

  if (!(res.status === 204 || (res.status >= 200 && res.status < 300))) {
    throw new Error(extractMaximoError(res));
  }

  return { status: res.status, data: res.data, bodyText: toBodyText(res.data) };
}

export async function addActualMaterial(
  woHref: string,
  username: string,
  password: string,
  payload: { itemnum: string; quantity: number; storeloc: string; issuetype: string }
): Promise<AddActualResult> {
  const token = makeToken(username, password);

  const fixedHref = normalizeOslcHref(woHref).replace(/\/+$/, '');
  const url = `${fixedHref}?lean=1`; // ✅ IMPORTANT: use fixedHref

  console.log('[addActualMaterial] fixedHref:', fixedHref);
  console.log('[addActualMaterial] POST URL:', url);
  console.log('[addActualMaterial] url==fixed?', url.startsWith(fixedHref));

  const res = await axios.post(
    url,
    {
      matusetrans_reporting: [
        {
          itemnum: payload.itemnum,
          storeloc: payload.storeloc,
          issuetype: payload.issuetype,

          // quantity aliases (Maximo environments vary)
          quantity: payload.quantity,
          issueqty: payload.quantity,
          itemqty: payload.quantity,
        },
      ],
    },
    {
      headers: patchHeaders(token),
      timeout: 30000,
      validateStatus: () => true,
    }
  );

  console.log('[addActualMaterial] status:', res.status);

  if (!(res.status === 204 || (res.status >= 200 && res.status < 300))) {
    throw new Error(extractMaximoError(res));
  }

  return { status: res.status, data: res.data, bodyText: toBodyText(res.data) };
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
        quantity: Number(m?.itemqty ?? 0),
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