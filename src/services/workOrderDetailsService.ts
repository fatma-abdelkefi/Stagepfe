// src/services/workOrderDetailsService.ts
import axios from 'axios';
import type { WorkOrder } from '../viewmodels/WorkOrdersViewModel';

import { MAXIMO } from '../config/maximoUrls';
import { makeToken } from './maximoClient';

import { rewriteDoclinkUrl, metaToDoclinkUrl, doclinkToMetaUrl } from './doclinks';

const BASE_URL = `${MAXIMO.OSLC_OS}/mxwo`;

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

    const href = rewriteDoclinkUrl(metaToDoclinkUrl(safeTrim(d?.href) || safeTrim(di?.href)));
    const doclinkId = extractDoclinkIdFromHref(href);

    const rawUrl =
      safeTrim(d?.urlname) ||
      safeTrim(di?.urlname) ||
      safeTrim(di?.href) ||
      safeTrim(d?.href);

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
  const token = makeToken(username, password);

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
        Authorization: `Basic ${token}`,
        Accept: 'application/json',
        properties: '*',
      },
      params: {
        lean: 1,
        'oslc.select': '*,docinfo{*},describedBy{*}',
        'oslc.expand': 'docinfo,describedBy',
        _ts: Date.now(), // ✅ cache-buster safe here too
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

    return {
      document: display || undefined,
      description: desc || undefined,
      createdate: createdate || undefined,
      urlname: urlname || undefined,
      href: href || undefined,
    };
  } catch (err: any) {
    console.log('❌ [getDoclinkDetailsByHref] error status:', err?.response?.status);
    console.log('❌ [getDoclinkDetailsByHref] message:', err?.message || err);
    return null;
  }
}

export async function getDoclinkMetaByHref(
  anyHref: string,
  username: string,
  password: string
): Promise<Partial<NormalizedDocLink> | null> {
  const token = makeToken(username, password);

  const metaUrl = rewriteDoclinkUrl(doclinkToMetaUrl(anyHref));

  if (!metaUrl) return null;

  try {
    const res = await axios.get<any>(metaUrl, {
      headers: {
        MAXAUTH: token,
        Authorization: `Basic ${token}`,
        Accept: 'application/json',
        properties: '*',
      },
      params: {
        lean: 1,
        'oslc.select': '*,docinfo{*},describedBy{*}',
        'oslc.expand': 'docinfo,describedBy',
        _ts: Date.now(), // ✅ cache-buster
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

    const href = rewriteDoclinkUrl(
      metaToDoclinkUrl(safeTrim(obj?.href) || safeTrim(di?.href) || metaUrl)
    );

    const display = title || filenameFromUrl(urlname) || filenameFromUrl(href);

    return {
      document: display || undefined,
      description: desc || undefined,
      createdate: createdate || undefined,
      urlname: urlname || undefined,
      href: href || undefined,
    };
  } catch (err: any) {
    return null;
  }
}

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

  console.log('==============================');
  console.log('📥 [getWorkOrderDetails] wonum:', wonum);
  console.log('📥 [getWorkOrderDetails] BASE_URL:', BASE_URL);
  console.log('==============================');

  try {
    const res = await axios.get<MaximoResponse>(BASE_URL, {
      headers: {
        MAXAUTH: token,
        Authorization: `Basic ${token}`,
        Accept: 'application/json',
        properties: '*',

        // ✅ force no cache
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      params: {
        lean: 1,
        'oslc.where': `wonum="${wonum}"`,
        'oslc.pageSize': 1,

        // ✅ IMPORTANT: include href on WO + on woactivity
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

        // ✅ cache buster (most important)
        _ts: Date.now(),
      },
      timeout: 30000,
      validateStatus: () => true,
    });

    if (res.status >= 400) return null;
    if (!res.data.member?.length) return null;

    const item = res.data.member[0];

    const loc =
      typeof item.location === 'string' ? item.location : (item.location as any)?.location ?? '';

    const locDesc = item.locationdescription ?? loc ?? '';

    const docLinksArr = normalizeDoclinks(item.doclinks);

    const activitiesRaw = Array.isArray(item.woactivity)
      ? item.woactivity
      : item.woactivity
      ? [item.woactivity]
      : [];

    const wo: WorkOrder = {
      wonum: item.wonum ?? wonum,
      barcode: item.wonum ?? wonum,

      href: safeTrim((item as any)?.href) || undefined,

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
          href: safeTrim(a?.href) || undefined,
          taskid: String(a?.taskid ?? ''),
          description: a?.description ?? '',
          labhrs: parseLabHrs(a?.labhrs),
          status,
          statut: status,
        };
      }),

      labor: (Array.isArray(item.wplabor) ? item.wplabor : item.wplabor ? [item.wplabor] : []).map((l) => ({
        taskid: String((l as any)?.taskid ?? ''),
        laborcode: (l as any)?.laborcode ?? '',
        description: (l as any)?.description ?? '',
        labhrs: parseLabHrs((l as any)?.labhrs ?? (l as any)?.regularhrs ?? (l as any)?.laborhrs),
      })),

      materials: (Array.isArray(item.wpmaterial) ? item.wpmaterial : item.wpmaterial ? [item.wpmaterial] : []).map(
        (m) => ({
          taskid: String((m as any)?.taskid ?? ''),
          itemnum: (m as any)?.itemnum ?? '',
          description: (m as any)?.description ?? '',
          quantity: Number((m as any)?.itemqty ?? 0),
        })
      ),

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