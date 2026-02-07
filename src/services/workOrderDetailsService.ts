// src/services/workOrderDetailsService.ts
import axios from 'axios';
import { Buffer } from 'buffer';
import type { WorkOrder } from '../viewmodels/WorkOrdersViewModel';

const BASE_URL = 'http://demo2.smartech-tn.com/maximo/oslc/os/mxwo';

const toArray = <T>(val?: T | T[]): T[] =>
  !val ? [] : Array.isArray(val) ? val : [val];

const makeMaxAuth = (u: string, p: string) =>
  Buffer.from(`${u}:${p}`).toString('base64');

export const parseLabHrs = (val: string | number | undefined): number => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const p = val.split(':').map(Number);
  return p.length === 2 ? p[0] + p[1] / 60 : Number(val) || 0;
};

/* =======================
   TYPES MAXIMO
======================= */

interface MaximoWorkOrderItem {
  wonum?: string;
  description?: string;
  status?: string;
  assetnum?: string;
  location?: string | { location?: string };
  locationdescription?: string;
  priority?: number | string;
  siteid?: string;
  scheduledstart?: string;
  scheduledfinish?: string;
  woactivity?: any | any[];
  wplabor?: any | any[];
  wpmaterial?: any | any[];
}

interface MaximoResponse {
  member?: MaximoWorkOrderItem[];
}

/* =======================
   MAIN FUNCTION
======================= */

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
          'wonum,description,status,assetnum,location,locationdescription,priority,siteid,' +
          'scheduledstart,scheduledfinish,woactivity{taskid,description,status,labhrs},' +
          'wplabor{taskid,laborcode,description,labhrs,regularhrs,laborhrs},' +
          'wpmaterial{taskid,itemnum,description,itemqty},' +
          'doclinks',
      },
    });

    // ✅ Ici TypeScript sait que member existe
    if (!res.data.member?.length) return null;

    const item = res.data.member[0];

    const wo: WorkOrder = {
      wonum: item.wonum ?? wonum,
      barcode: '',
      description: item.description ?? '',
      details: '',
      location:
        typeof item.location === 'string' ? item.location : item.location?.location ?? '',
      asset: item.assetnum ?? '',
      status: item.status ?? '',
      scheduledStart: item.scheduledstart ?? null,
      scheduledFinish: item.scheduledfinish ?? null,
      priority: Number(item.priority ?? 0),
      isDynamic: false,
      dynamicJobPlanApplied: false,
      site: item.siteid ?? '',
      completed: false,
      isUrgent: false,
      cout: 0,
      activities: toArray(item.woactivity).map(a => ({
        taskid: String(a?.taskid ?? ''),
        description: a?.description ?? '',
        status: a?.status ?? '',
        labhrs: parseLabHrs(a?.labhrs),
      })),
      labor: toArray(item.wplabor).map(l => ({
        taskid: String(l?.taskid ?? ''),
        laborcode: l?.laborcode ?? '',
        description: l?.description ?? '',
        labhrs: parseLabHrs(l?.labhrs ?? l?.regularhrs ?? l?.laborhrs),
      })),
      materials: toArray(item.wpmaterial).map(m => ({
        taskid: String(m?.taskid ?? ''),
        itemnum: m?.itemnum ?? '',
        description: m?.description ?? '',
        quantity: Number(m?.itemqty ?? 0),
      })),
      docLinks: [],
    };

    return wo;
  } catch (err) {
    console.error('Erreur getWorkOrderDetails:', err);
    return null;
  }
}
