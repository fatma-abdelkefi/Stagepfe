import { maximo, makeToken, authHeaders } from '../../../shared/services/maximoClient';
import { MAXIMO } from '../../../shared/config/maximoUrls';
import type { WorkOrderDetailsSummary } from '../types/workOrderDetails.types';
import { getDoclinksByOwner } from '../../doclinks/services/doclinksService';
import { rewriteMaximoUrl } from '../../../shared/services/rewriteMaximoUrl';
const BASE_URL = `${MAXIMO.OSLC_OS}/mxwo`;

type MaximoResponse<T> = {
  member?: T[];
};

type MaximoActivity = {
  href?: string;
  taskid?: string | number;
  description?: string;
  status?: string;
  labhrs?: string | number;
};

type MaximoPlannedLabor = {
  taskid?: string | number;
  laborcode?: string;
  description?: string;
  labhrs?: string | number;
  regularhrs?: string | number;
  laborhrs?: string | number;
  quantity?: string | number;
};

type MaximoPlannedMaterial = {
  taskid?: string | number;
  itemnum?: string;
  description?: string;
  itemqty?: string | number;
  quantity?: string | number;
  qty?: string | number;
  location?: string;
};

type MaximoActualLabor = {
  laborcode?: string;
  regularhrs?: string | number;
  transdate?: string;
};

type MaximoActualMaterial = {
  itemnum?: string;
  itemqty?: string | number;
  quantity?: string | number;
  qty?: string | number;
  description?: string;
  storeroom?: string;
  storeloc?: string;
  issuetype?: string;
  siteid?: string;
  barcode?: string;
};

type MaximoWorkLog = {
  worklogid?: number | string;
  description?: string;
  description_longdescription?: any;
  logtype?: string;
  logtype_description?: string;
  createby?: string;
  createdate?: string;
  clientviewable?: boolean;
  href?: string;
  localref?: string;
};

type MaximoWorkOrderSummaryItem = {
  wonum?: string;
  href?: string;
  worklog_collectionref?: string;
  description?: string;
  status?: string;
  siteid?: string;
  workorderid?: number;
  ishistory?: boolean;
  hasfollowupwork?: boolean;

  assetnum?: string;
  asset?: { description?: string };

  location?: string | { location?: string };
  locationdescription?: string;

  priority?: string | number;

  scheduledstart?: string;
  targetstart?: string;
  targstartdate?: string;
  scheduledfinish?: string;

  woactivity?: MaximoActivity[] | MaximoActivity;
  wplabor?: MaximoPlannedLabor[] | MaximoPlannedLabor;
  wpmaterial?: MaximoPlannedMaterial[] | MaximoPlannedMaterial;

  labtrans?: MaximoActualLabor[] | MaximoActualLabor;
  matusetrans?: MaximoActualMaterial[] | MaximoActualMaterial;

  worklog?: MaximoWorkLog[] | MaximoWorkLog;

  failurecode?: string;
  problemcode?: string;
  causecode?: string;
  remedycode?: string;
  failureremarks?: string;
  remarkdesc?: string;
};

function buildHeaders(username: string, password: string) {
  const token = makeToken(username, password);
  return authHeaders(token);
}

function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function parseLabHrs(val: string | number | undefined | null): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;

  const s = String(val).trim();
  if (!s) return 0;

  if (s.includes(':')) {
    const [h, m] = s.split(':').map(Number);
    return (h || 0) + ((m || 0) / 60);
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function parseQty(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;

  const s = String(val).trim().replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function mapLocation(item: MaximoWorkOrderSummaryItem): string {
  if (typeof item.location === 'object' && item.location !== null) {
    return item.location.location ?? item.locationdescription ?? '';
  }

  return item.locationdescription ?? String(item.location ?? '');
}

function mapScheduledStart(item: MaximoWorkOrderSummaryItem): string | null {
  return item.scheduledstart || item.targetstart || item.targstartdate || null;
}
export function mapRelatedWorkOrders(data: any) {
  if (!Array.isArray(data?.relatedrecord)) return [];

  return data.relatedrecord
    .filter((item: any) => item?.class === 'WORKORDER')
    .map((item: any) => ({
      wonum: item.relatedreckey,
      relationship: item.relationship,
      description: item.description,
      status: item.status,
    }));
}

export async function getWorkOrderSummary(
  wonum: string,
  siteid: string,
  username: string,
  password: string,
  
): Promise<WorkOrderDetailsSummary | null> {
  const headers = buildHeaders(username, password);

  const response = await maximo.get<MaximoResponse<MaximoWorkOrderSummaryItem>>(BASE_URL, {
    headers,
    params: {
      lean: 1,
        'oslc.where': `wonum="${wonum}" and siteid="${siteid}"`,
        'oslc.pageSize': 1,
        'oslc.select':
          'href,wonum,description,status,assetnum,asset.description,location,locationdescription,priority,siteid,workorderid,ishistory,' +
          'scheduledstart,scheduledfinish,targstartdate,targcompdate,targetstart,targetfinish,' +
          'failurecode,problemcode,causecode,remedycode,failureremarks,remarkdesc,' +
          'woactivity{href,taskid,description,status,labhrs},' +
          'wplabor{taskid,laborcode,description,labhrs,regularhrs,laborhrs},' +
          'labtrans{laborcode,regularhrs,transdate},' +
          'wpmaterial{taskid,itemnum,description,itemqty},' +
          'matusetrans{itemnum,itemqty,description,storeroom,storeloc,issuetype,siteid},' +
          'worklog{worklogid,description,description_longdescription,logtype,logtype_description,createby,createdate,clientviewable,href,localref},' +
          'doclinks{href,urlname,document,description,createdate,creationdate,changedate,' +
          'describedBy{description,href},' +
          'docinfo{document,description,createdate,creationdate,changedate,urlname,doctitle,title,href}}',
        'oslc.expand': 'doclinks{docinfo},doclinks{describedBy}',
        _ts: Date.now(),
      },
    timeout: 30000,
  });

  if (response.status >= 400) {
    
  return null;
  
}

const members = Array.isArray(response.data?.member)
  ? response.data.member
  : [];

const item =
  members.find(
    (x: any) =>
      String(x?.wonum || '').trim() === String(wonum).trim() &&
      String(x?.siteid || '').trim() === String(siteid).trim(),
  ) || members[0];

if (!item) return null;

  const status = item.status ?? '';
  const priority = Number(item.priority ?? 0);
  const workorderid = item.workorderid ?? 0;

  const fetchedDoclinks =
    workorderid > 0
      ? await getDoclinksByOwner({
          ownerid: workorderid,
          username,
          password,
        })
      : [];

  return {
    wonum: item.wonum ?? '',
    href: item.href ?? undefined,
    worklog_collectionref: item.worklog_collectionref ?? undefined,
    description: item.description ?? '',
    status,
    siteid: item.siteid ?? undefined,
    workorderid: item.workorderid ?? undefined,
    ishistory: item.ishistory ?? undefined,

    asset: item.assetnum ?? '',
    assetDescription: item.asset?.description ?? '',

    location: mapLocation(item),
    locationDescription: item.locationdescription ?? '',

    scheduledStart: mapScheduledStart(item),
    scheduledFinish: item.scheduledfinish ?? null,

    isUrgent: priority === 1,
    completed: ['COMP', 'CLOSE'].includes(status.toUpperCase()),

    failureClass: item.failurecode ?? '',
    failureCode: item.failurecode ?? '',

    problem: item.problemcode ?? '',
    problemCode: item.problemcode ?? '',

    cause: item.causecode ?? '',
    causeCode: item.causecode ?? '',

    remedy: item.remedycode ?? '',
    remedyCode: item.remedycode ?? '',

    remark: item.failureremarks || item.remarkdesc || '',
    failureRemarks: item.failureremarks ?? '',
    remarkdesc: item.remarkdesc ?? '',

    activities: toArray(item.woactivity).map(a => ({
      href: a.href ?? undefined,
      taskid: String(a.taskid ?? ''),
      description: a.description ?? '',
      status: a.status ?? '',
      statut: a.status ?? '',
      labhrs: parseLabHrs(a.labhrs),
    })),

    labor: toArray(item.wplabor).map(l => ({
      taskid: String(l.taskid ?? ''),
      laborcode: l.laborcode ?? '',
      description: l.description ?? '',
      labhrs: parseLabHrs(l.labhrs ?? l.regularhrs ?? l.laborhrs),
      quantity: parseQty(l.quantity),
    })),
    hasfollowupwork: Boolean(members?.[0]?.hasfollowupwork ?? false),

    materials: toArray(item.wpmaterial).map(m => ({
      taskid: String(m.taskid ?? ''),
      itemnum: m.itemnum ?? '',
      description: m.description ?? '',
      quantity: parseQty(m.itemqty ?? m.quantity ?? m.qty),
      location: m.location ?? '',
    })),

    docLinks: fetchedDoclinks.map(d => ({
      ...d,
      weburl: (d as any).weburl ?? '',
    })),

    actualLabor: toArray(item.labtrans).map(l => ({
      laborcode: l.laborcode ?? '',
      regularhrs: parseLabHrs(l.regularhrs),
      transdate: l.transdate ?? undefined,
    })),

    actualMaterials: toArray(item.matusetrans).map(m => ({
      itemnum: m.itemnum ?? '',
      itemqty: parseQty(m.itemqty ?? m.quantity ?? m.qty),
      description: m.description ?? '—',
      storeroom: m.storeroom ?? '',
      storeloc: m.storeloc ?? '',
      issuetype: m.issuetype ?? '',
      siteid: m.siteid ?? '',
    })),
    workLogs: toArray(item.worklog).map(w => ({
      worklogid: w.worklogid,
      description: w.description ?? '',
      description_longdescription: w.description_longdescription,
      logtype: w.logtype ?? '',
      logtype_description: w.logtype_description ?? '',
      createby: w.createby ?? '',
      createdate: w.createdate ?? '',
      clientviewable: w.clientviewable ?? false,
      href: w.href ? rewriteMaximoUrl(String(w.href)) : undefined,
      localref: w.localref
        ? rewriteMaximoUrl(String(w.localref))
        : w.href
        ? rewriteMaximoUrl(String(w.href))
        : undefined,
    })),
  };
}