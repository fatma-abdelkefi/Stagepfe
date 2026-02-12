import axios from 'axios';
import { Buffer } from 'buffer';
import type { WorkOrder } from '../viewmodels/WorkOrdersViewModel';

const BASE_URL = 'http://demo2.smartech-tn.com/maximo/oslc/os/mxwo';

const makeMaxAuth = (u: string, p: string) =>
  Buffer.from(`${u}:${p}`).toString('base64');

export const parseLabHrs = (val: string | number | undefined): number => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const p = val.split(':').map(Number);
  return p.length === 2 ? p[0] + p[1] / 60 : Number(val) || 0;
};

// ✅ Robust parser for doclinks
function normalizeDoclinks(raw: any): Array<{ document: string; description: string; createdate: string; urlname: string }> {
  if (!raw) return [];

  // case 1: { member: [...] }
  const member = Array.isArray(raw?.member) ? raw.member : null;
  if (member) {
    return member.map((d: any) => ({
      document: d?.document ?? d?.docinfo?.document ?? '',
      description: d?.description ?? '',
      createdate: d?.createdate ?? '',
      urlname: d?.urlname ?? d?.href ?? '',
    }));
  }

  // case 2: already array
  if (Array.isArray(raw)) {
    return raw.map((d: any) => ({
      document: d?.document ?? d?.docinfo?.document ?? '',
      description: d?.description ?? '',
      createdate: d?.createdate ?? '',
      urlname: d?.urlname ?? d?.href ?? '',
    }));
  }

  // case 3: single object doclink
  if (typeof raw === 'object') {
    // sometimes doclinks returns link-only object
    if (raw?.href && !raw?.document && !raw?.description) return [];
    return [{
      document: raw?.document ?? raw?.docinfo?.document ?? '',
      description: raw?.description ?? '',
      createdate: raw?.createdate ?? '',
      urlname: raw?.urlname ?? raw?.href ?? '',
    }];
  }

  return [];
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
        // ✅ IMPORTANT: ask Maximo to expand doclinks fields (if supported)
        'oslc.select':
          'wonum,description,status,assetnum,asset.description,location,locationdescription,priority,siteid,workorderid,ishistory,' +
          'scheduledstart,scheduledfinish,' +
          'woactivity{taskid,description,status,labhrs},' +
          'wplabor{taskid,laborcode,description,labhrs,regularhrs,laborhrs},' +
          'wpmaterial{taskid,itemnum,description,itemqty},' +
          'doclinks{document,description,createdate,urlname,href}',
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
    console.log('📥 [getWorkOrderDetails] raw doclinks type:', typeof item.doclinks);
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

      // ✅ correct doclinks
      docLinks: docLinksArr,
    };

    return wo;
  } catch (err: any) {
    console.error('❌ Erreur getWorkOrderDetails:', err?.response?.data || err?.message || err);
    return null;
  }
}