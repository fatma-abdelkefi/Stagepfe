import axios from 'axios';
import { Buffer } from 'buffer';
import type { WorkOrder } from '../viewmodels/WorkOrdersViewModel';

const BASE_URL = 'http://demo2.smartech-tn.com/maximo/oslc/os/mxwo';
const API_ORIGIN = new URL(BASE_URL).origin;

const makeMaxAuth = (u: string, p: string) =>
  Buffer.from(`${u}:${p}`).toString('base64');

export const parseLabHrs = (val: string | number | undefined): number => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const p = String(val).split(':').map(Number);
  return p.length === 2 ? p[0] + p[1] / 60 : Number(val) || 0;
};

function safeTrim(v: any): string {
  return typeof v === 'string' ? v.trim() : '';
}

function filenameFromUrl(u?: string): string {
  if (!u) return '';
  const clean = u.split('?')[0].split('#')[0].replace(/\/+$/, '');
  const last = clean.split('/').pop() || '';
  return last ? decodeURIComponent(last) : '';
}

/**
 * ✅ Corrige les typos d'endpoint qu'on voit parfois dans les réponses
 * /os/mxwwo/ , /os/mmxwo/ => /os/mxwo/
 */
function fixMxwoTypos(u: string): string {
  const s = safeTrim(u);
  if (!s) return '';
  return s
    .replace(/\/os\/mmxwo\//i, '/os/mxwo/')
    .replace(/\/os\/mxwwo\//i, '/os/mxwo/');
}

/**
 * Réécrit une URL vers le host API_ORIGIN, garde le path.
 * + applique le fix des typos /os/mmxwo/ etc.
 */
export function rewriteDoclinkUrl(inputUrl?: string): string {
  const raw = safeTrim(inputUrl);
  if (!raw) return '';

  if (raw.startsWith('http://childkey#') || raw.startsWith('childkey#')) return '';

  // /maximo/... => prefix origin
  if (raw.startsWith('/')) return fixMxwoTypos(`${API_ORIGIN}${raw}`);

  // http(s)://ANYHOST/... => force API_ORIGIN but keep path
  const m = raw.match(/^https?:\/\/[^/]+(\/.*)$/i);
  if (m?.[1]) return fixMxwoTypos(`${API_ORIGIN}${m[1]}`);

  return fixMxwoTypos(raw);
}

/**
 * ✅ meta -> binaire (robuste)
 * - .../doclinks/meta/{id}       => .../doclinks/{id}
 * - .../doclinks/{id}/meta       => .../doclinks/{id}
 * - fonctionne même si querystring existe
 */
export function metaToDoclinkUrl(url?: string): string {
  const u = safeTrim(url);
  if (!u) return '';

  // .../doclinks/meta/{id} -> .../doclinks/{id}
  const m1 = u.match(/\/doclinks\/meta\/(\d+)(?=\/|$|\?)/i);
  if (m1) return u.replace(/\/doclinks\/meta\/\d+/i, `/doclinks/${m1[1]}`);

  // .../doclinks/{id}/meta -> .../doclinks/{id}
  const m2 = u.match(/\/doclinks\/(\d+)\/meta(?=\/|$|\?)/i);
  if (m2) return u.replace(/\/doclinks\/\d+\/meta/i, `/doclinks/${m2[1]}`);

  return u;
}

/**
 * ✅ binaire -> meta (robuste)
 * - .../doclinks/{id}     => .../doclinks/meta/{id}
 * - si déjà meta, ne change rien
 * - conserve querystring
 */
export function doclinkToMetaUrl(url?: string): string {
  const u = safeTrim(url);
  if (!u) return '';

  // split query to preserve it
  const [path, query = ''] = u.split('?');
  const cleanPath = path.replace(/\/+$/, '');

  // déjà meta
  if (/\/doclinks\/meta\/\d+$/i.test(cleanPath)) {
    return query ? `${cleanPath}?${query}` : cleanPath;
  }

  // .../doclinks/{id} => .../doclinks/meta/{id}
  const converted = cleanPath.replace(/\/doclinks\/(\d+)$/i, '/doclinks/meta/$1');
  return query ? `${converted}?${query}` : converted;
}

function pickDocInfo(d: any): any | null {
  if (Array.isArray(d?.docinfo?.member) && d.docinfo.member.length > 0) return d.docinfo.member[0];
  if (d?.docinfo && typeof d.docinfo === 'object') return d.docinfo;
  return null;
}

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

  // ✅ doclinkId doit être numérique (sinon on évite des ids invalides)
  return /^\d+$/.test(last) ? last : '';
}

export function normalizeDoclinks(raw: any): NormalizedDocLink[] {
  if (!raw) return [];

  const member = Array.isArray(raw?.member) ? raw.member : null;
  const list = member
    ? member
    : Array.isArray(raw)
    ? raw
    : typeof raw === 'object'
    ? [raw]
    : [];

  return list.map((d: any) => {
    const di = pickDocInfo(d);

    const describedByHref = rewriteDoclinkUrl(safeTrim(d?.describedBy?.href));
    const describedByDesc = safeTrim(d?.describedBy?.description);

    // ✅ href normalisé + meta->binaire + fix typos
    const href = rewriteDoclinkUrl(metaToDoclinkUrl(safeTrim(d?.href) || safeTrim(di?.href)));
    const doclinkId = extractDoclinkIdFromHref(href);

    const rawUrl =
      safeTrim(d?.urlname) ||
      safeTrim(di?.urlname) ||
      safeTrim(di?.href) ||
      safeTrim(d?.href);

    // ✅ urlname normalisé + fix typos (sans forcer meta->binaire car parfois urlname n'est pas doclinks)
    const urlname = rewriteDoclinkUrl(rawUrl);

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

    const desc =
      safeTrim(d?.description) ||
      safeTrim(di?.description) ||
      'Aucune description';

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
  const token = makeMaxAuth(username, password);

  const fixed = rewriteDoclinkUrl(metaToDoclinkUrl(anyHref));

  console.log('==============================');
  console.log('🔎 [getDoclinkDetailsByHref] input:', anyHref);
  console.log('🔎 [getDoclinkDetailsByHref] fixed:', fixed);

  if (!fixed) {
    console.log('❌ [getDoclinkDetailsByHref] empty fixed url');
    console.log('==============================');
    return null;
  }

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
      },
      timeout: 30000,
    });

    const obj: any = res.data?.member?.[0] ?? res.data;
    if (!obj) return null;

    const di = pickDocInfo(obj);

    const title =
      safeTrim(obj?.upload_documentname) ||
      safeTrim(obj?.documenttitle) ||
      safeTrim(obj?.documentname) ||
      safeTrim(obj?.filename) ||
      safeTrim(obj?.original_filename) ||
      safeTrim(obj?.file_name) ||
      safeTrim(di?.upload_documentname) ||
      safeTrim(di?.documenttitle) ||
      safeTrim(di?.documentname) ||
      safeTrim(di?.doctitle) ||
      safeTrim(di?.title) ||
      safeTrim(di?.filename) ||
      safeTrim(obj?.doctitle) ||
      safeTrim(obj?.title) ||
      (safeTrim(obj?.document) && !safeTrim(obj?.document).match(/^\d+$/) ? safeTrim(obj?.document) : '') ||
      (safeTrim(di?.document) && !safeTrim(di?.document).match(/^\d+$/) ? safeTrim(di?.document) : '');

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

    const rawUrl =
      safeTrim(obj?.urlname) ||
      safeTrim(di?.urlname) ||
      safeTrim(obj?.href) ||
      safeTrim(di?.href);

    const urlname = rewriteDoclinkUrl(rawUrl);
    const href = rewriteDoclinkUrl(metaToDoclinkUrl(safeTrim(obj?.href) || safeTrim(di?.href)));

    const display = title || filenameFromUrl(urlname) || filenameFromUrl(href);

    console.log('✅ [getDoclinkDetailsByHref] display:', display);
    console.log('✅ [getDoclinkDetailsByHref] desc:', desc);
    console.log('✅ [getDoclinkDetailsByHref] createdate:', createdate);
    console.log('✅ [getDoclinkDetailsByHref] urlname:', urlname);
    console.log('==============================');

    return {
      document: display || undefined,
      description: desc || undefined,
      createdate: createdate || undefined,
      urlname: urlname || undefined,
      href: href || undefined,
    };
  } catch (err: any) {
    console.log('❌ [getDoclinkDetailsByHref] error status:', err?.response?.status);
    console.log('❌ [getDoclinkDetailsByHref] error data:', JSON.stringify(err?.response?.data)?.slice(0, 2000));
    console.log('❌ [getDoclinkDetailsByHref] message:', err?.message || err);
    console.log('==============================');
    return null;
  }
}

export async function getDoclinkMetaByHref(
  anyHref: string,
  username: string,
  password: string
): Promise<Partial<NormalizedDocLink> | null> {
  const token = makeMaxAuth(username, password);

  const metaUrl = rewriteDoclinkUrl(doclinkToMetaUrl(anyHref));

  console.log('==============================');
  console.log('🧾 [getDoclinkMetaByHref] input:', anyHref);
  console.log('🧾 [getDoclinkMetaByHref] metaUrl:', metaUrl);

  if (!metaUrl) {
    console.log('❌ [getDoclinkMetaByHref] empty meta url');
    console.log('==============================');
    return null;
  }

  try {
    const res = await axios.get<any>(metaUrl, {
      headers: {
        MAXAUTH: token,
        Accept: 'application/json',
        properties: '*',
      },
      params: {
        lean: 1,
        'oslc.select': '*,docinfo{*},describedBy{*}',
        'oslc.expand': 'docinfo,describedBy',
      },
      timeout: 30000,
    });

    const obj: any = res.data?.member?.[0] ?? res.data;
    if (!obj) return null;

    const di = pickDocInfo(obj);

    const title =
      safeTrim(obj?.upload_documentname) ||
      safeTrim(obj?.documenttitle) ||
      safeTrim(obj?.documentname) ||
      safeTrim(obj?.filename) ||
      safeTrim(obj?.original_filename) ||
      safeTrim(obj?.file_name) ||
      safeTrim(di?.upload_documentname) ||
      safeTrim(di?.documenttitle) ||
      safeTrim(di?.documentname) ||
      safeTrim(di?.doctitle) ||
      safeTrim(di?.title) ||
      safeTrim(di?.filename) ||
      safeTrim(obj?.doctitle) ||
      safeTrim(obj?.title) ||
      (safeTrim(obj?.document) && !safeTrim(obj?.document).match(/^\d+$/) ? safeTrim(obj?.document) : '') ||
      (safeTrim(di?.document) && !safeTrim(di?.document).match(/^\d+$/) ? safeTrim(di?.document) : '');

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

    const rawUrl =
      safeTrim(obj?.urlname) ||
      safeTrim(di?.urlname) ||
      safeTrim(obj?.href) ||
      safeTrim(di?.href);

    const urlname = rewriteDoclinkUrl(rawUrl);

    // ✅ on renvoie un href binaire même si on a consulté meta
    const href = rewriteDoclinkUrl(
      metaToDoclinkUrl(safeTrim(obj?.href) || safeTrim(di?.href) || metaUrl)
    );

    const display = title || filenameFromUrl(urlname) || filenameFromUrl(href);

    console.log('✅ [getDoclinkMetaByHref] display:', display);
    console.log('✅ [getDoclinkMetaByHref] desc:', desc);
    console.log('✅ [getDoclinkMetaByHref] createdate:', createdate);
    console.log('✅ [getDoclinkMetaByHref] urlname:', urlname);
    console.log('==============================');

    return {
      document: display || undefined,
      description: desc || undefined,
      createdate: createdate || undefined,
      urlname: urlname || undefined,
      href: href || undefined,
    };
  } catch (err: any) {
    console.log('❌ [getDoclinkMetaByHref] error status:', err?.response?.status);
    console.log('❌ [getDoclinkMetaByHref] error data:', JSON.stringify(err?.response?.data)?.slice(0, 2000));
    console.log('❌ [getDoclinkMetaByHref] message:', err?.message || err);
    console.log('==============================');
    return null;
  }
}

interface MaximoWorkOrderItem {
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
  const token = makeMaxAuth(username, password);

  console.log('==============================');
  console.log('📥 [getWorkOrderDetails] wonum:', wonum);
  console.log('📥 [getWorkOrderDetails] BASE_URL:', BASE_URL);
  console.log('==============================');

  try {
    const res = await axios.get<MaximoResponse>(BASE_URL, {
      headers: {
        MAXAUTH: token,
        Accept: 'application/json',
        properties: '*',
      },
      params: {
        lean: 1,
        'oslc.where': `wonum="${wonum}"`,
        'oslc.pageSize': 1,
        'oslc.select':
          'wonum,description,status,assetnum,asset.description,location,locationdescription,priority,siteid,workorderid,ishistory,' +
          'scheduledstart,scheduledfinish,' +
          'woactivity{taskid,description,status,labhrs},' +
          'wplabor{taskid,laborcode,description,labhrs,regularhrs,laborhrs},' +
          'wpmaterial{taskid,itemnum,description,itemqty},' +
          'doclinks{href,urlname,document,description,createdate,creationdate,changedate,' +
          'describedBy{description,href},' +
          'docinfo{document,description,createdate,creationdate,changedate,urlname,doctitle,title,href}}',
        'oslc.expand': 'doclinks{docinfo},doclinks{describedBy}',
      },
      timeout: 30000,
    });

    if (!res.data.member?.length) return null;
    const item = res.data.member[0];

    const loc =
      typeof item.location === 'string'
        ? item.location
        : (item.location as any)?.location ?? '';

    const locDesc = item.locationdescription ?? loc ?? '';

    // ✅ normalize doclinks
    const docLinksArr = normalizeDoclinks(item.doclinks);

    console.log('==============================');
    console.log('📥 [getWorkOrderDetails] docLinksArr length:', docLinksArr.length);
    console.log('📥 [getWorkOrderDetails] docLinksArr sample:', docLinksArr[0]);
    console.log('==============================');

    const wo: WorkOrder = {
      wonum: item.wonum ?? wonum,
      barcode: item.wonum ?? wonum,

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

      activities: (Array.isArray(item.woactivity) ? item.woactivity : item.woactivity ? [item.woactivity] : []).map(a => ({
        taskid: String((a as any)?.taskid ?? ''),
        description: (a as any)?.description ?? '',
        status: (a as any)?.status ?? '',
        labhrs: parseLabHrs((a as any)?.labhrs),
      })),

      labor: (Array.isArray(item.wplabor) ? item.wplabor : item.wplabor ? [item.wplabor] : []).map(l => ({
        taskid: String((l as any)?.taskid ?? ''),
        laborcode: (l as any)?.laborcode ?? '',
        description: (l as any)?.description ?? '',
        labhrs: parseLabHrs((l as any)?.labhrs ?? (l as any)?.regularhrs ?? (l as any)?.laborhrs),
      })),

      materials: (Array.isArray(item.wpmaterial) ? item.wpmaterial : item.wpmaterial ? [item.wpmaterial] : []).map(m => ({
        taskid: String((m as any)?.taskid ?? ''),
        itemnum: (m as any)?.itemnum ?? '',
        description: (m as any)?.description ?? '',
        quantity: Number((m as any)?.itemqty ?? 0),
      })),

      docLinks: docLinksArr as any,
    };

    return wo;
  } catch (err: any) {
    console.error('❌ [getWorkOrderDetails] error status:', err?.response?.status);
    console.error('❌ [getWorkOrderDetails] error data:', JSON.stringify(err?.response?.data)?.slice(0, 2500));
    console.error('❌ [getWorkOrderDetails] message:', err?.message || err);
    return null;
  }
}
