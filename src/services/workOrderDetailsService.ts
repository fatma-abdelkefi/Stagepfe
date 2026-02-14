import axios from 'axios';
import { Buffer } from 'buffer';
import type { WorkOrder } from '../viewmodels/WorkOrdersViewModel';

const BASE_URL = 'http://demo2.smartech-tn.com/maximo/oslc/os/mxwo';

// ✅ host accessible depuis ton mobile/émulateur
const API_ORIGIN = 'http://demo2.smartech-tn.com';

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
  const last = u.split('/').pop() || '';
  return last.includes('.') ? decodeURIComponent(last) : last;
}

// ✅ rewrite any doclink URL (often returned as 192.168.x.x) to API_ORIGIN
function rewriteDoclinkUrl(inputUrl?: string): string {
  if (!inputUrl) return '';
  try {
    const u = new URL(inputUrl);
    const api = new URL(API_ORIGIN);

    u.protocol = api.protocol;
    u.hostname = api.hostname;
    u.port = api.port; // '' if no port in API_ORIGIN

    return u.toString();
  } catch {
    return inputUrl;
  }
}

function pickDocInfo(d: any): any | null {
  if (Array.isArray(d?.docinfo?.member) && d.docinfo.member.length > 0) {
    return d.docinfo.member[0];
  }
  if (d?.docinfo && typeof d.docinfo === 'object') {
    return d.docinfo;
  }
  return null;
}

export type NormalizedDocLink = {
  document: string;
  description: string;
  createdate: string;
  urlname: string;
  href?: string;
  _rawDocumentId?: string;
};

function normalizeDoclinks(raw: any): NormalizedDocLink[] {
  if (!raw) return [];

  const member = Array.isArray(raw?.member) ? raw.member : null;
  const list = member
    ? member
    : Array.isArray(raw)
    ? raw
    : typeof raw === 'object'
    ? [raw]
    : [];

  return list.map(extractDocInfo).filter(Boolean);
}

function extractDocInfo(d: any): NormalizedDocLink {
  const di = pickDocInfo(d);

  const docTitle =
    safeTrim(di?.doctitle) ||
    safeTrim(di?.title) ||
    safeTrim(d?.doctitle) ||
    safeTrim(d?.title);

  const docDesc = safeTrim(d?.description) || safeTrim(di?.description);

  const rawUrl =
    safeTrim(d?.urlname) ||
    safeTrim(di?.urlname) ||
    safeTrim(d?.href) ||
    safeTrim(di?.href);

  const url = rewriteDoclinkUrl(rawUrl);

  const fallbackFromUrl = filenameFromUrl(url);
  const fallbackId = safeTrim(d?.document) || safeTrim(di?.document);

  const display =
    docTitle ||
    docDesc ||
    fallbackFromUrl ||
    fallbackId ||
    'Document sans nom';

  const href = rewriteDoclinkUrl(
    safeTrim(d?.href) || safeTrim(di?.href) || safeTrim(d?.urlname) || safeTrim(di?.urlname)
  );

  return {
    document: display,
    description: docDesc || 'Aucune description',
    createdate:
      safeTrim(di?.createdate) ||
      safeTrim(d?.createdate) ||
      safeTrim(di?.creationdate) ||
      safeTrim(d?.creationdate) ||
      '',
    urlname: url || '',
    href: href || undefined,
    _rawDocumentId: fallbackId || '',
  };
}

/**
 * Fetch doclink details from its href/url (after rewriting host)
 */
export async function getDoclinkDetailsByHref(
  href: string,
  username: string,
  password: string
): Promise<Partial<NormalizedDocLink> | null> {
  const token = makeMaxAuth(username, password);
  const fixedHref = rewriteDoclinkUrl(href);

  try {
    const res = await axios.get<any>(fixedHref, {
      headers: {
        Authorization: `Basic ${token}`,
        MAXAUTH: token,
        Accept: 'application/json',
      },
      params: {
        lean: 1,
        'oslc.select':
          'document,description,createdate,urlname,href,' +
          'docinfo{document,description,createdate,urlname,doctitle,title}',
        'oslc.expand': 'docinfo',
      },
      timeout: 30000,
    });

    const data: any = res.data;
    const obj: any = Array.isArray(data?.member) ? data.member[0] : data;
    if (!obj) return null;

    const di = pickDocInfo(obj);

    const title =
      safeTrim(di?.doctitle) ||
      safeTrim(di?.title) ||
      safeTrim(obj?.doctitle) ||
      safeTrim(obj?.title);

    const desc = safeTrim(obj?.description) || safeTrim(di?.description);

    const raw =
      safeTrim(obj?.urlname) ||
      safeTrim(di?.urlname) ||
      safeTrim(obj?.href) ||
      safeTrim(di?.href);

    const url = rewriteDoclinkUrl(raw);

    const display =
      title ||
      desc ||
      filenameFromUrl(url) ||
      safeTrim(obj?.document) ||
      safeTrim(di?.document) ||
      '';

    const returnedHref = safeTrim(obj?.href)
      ? rewriteDoclinkUrl(safeTrim(obj?.href))
      : fixedHref;

    return {
      document: display || undefined,
      description: desc || undefined,
      createdate:
        safeTrim(di?.createdate) ||
        safeTrim(obj?.createdate) ||
        safeTrim(di?.creationdate) ||
        safeTrim(obj?.creationdate) ||
        undefined,
      urlname: url || undefined,
      href: returnedHref,
    };
  } catch (err: any) {
    console.log('❌ getDoclinkDetailsByHref error:', err?.message || err);
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

  try {
    const res = await axios.get<MaximoResponse>(BASE_URL, {
      headers: {
        Authorization: `Basic ${token}`,
        MAXAUTH: token,
        Accept: 'application/json',
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
          'doclinks{document,description,createdate,urlname,href,' +
          'docinfo{document,description,createdate,urlname,doctitle,title}}',
        'oslc.expand': 'doclinks{docinfo}',
      },
      timeout: 30000,
    });

    if (!res.data.member?.length) return null;

    const item = res.data.member[0];

    const loc =
      typeof item.location === 'string'
        ? item.location
        : item.location?.location ?? '';

    const locDesc = item.locationdescription ?? loc ?? '';

    const docLinksArr = normalizeDoclinks(item.doclinks);

    console.log('==============================');
    console.log('📥 [getWorkOrderDetails] wonum:', wonum);
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
        taskid: String(a?.taskid ?? ''),
        description: a?.description ?? '',
        status: a?.status ?? '',
        labhrs: parseLabHrs(a?.labhrs),
      })),

      labor: (Array.isArray(item.wplabor) ? item.wplabor : item.wplabor ? [item.wplabor] : []).map(l => ({
        taskid: String(l?.taskid ?? ''),
        laborcode: l?.laborcode ?? '',
        description: l?.description ?? '',
        labhrs: parseLabHrs(l?.labhrs ?? l?.regularhrs ?? l?.laborhrs),
      })),

      materials: (Array.isArray(item.wpmaterial) ? item.wpmaterial : item.wpmaterial ? [item.wpmaterial] : []).map(m => ({
        taskid: String(m?.taskid ?? ''),
        itemnum: m?.itemnum ?? '',
        description: m?.description ?? '',
        quantity: Number(m?.itemqty ?? 0),
      })),

      docLinks: docLinksArr as any,
    };

    return wo;
  } catch (err: any) {
    console.error('❌ Erreur getWorkOrderDetails:', err?.response?.data || err?.message || err);
    return null;
  }
}
