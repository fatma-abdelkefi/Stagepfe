import axios from 'axios';
import { WorkOrder } from '../viewmodels/WorkOrdersViewModel';

import { MAXIMO } from '../config/maximoUrls';
import { makeToken } from './maximoClient';

const BASE_URL = `${MAXIMO.OSLC_OS}/mxwo`;

interface MaximoResponse {
  member?: any[];
  [key: string]: any;
}

interface MaximoWorkOrderItem {
  wonum?: string;
  description?: string;
  location?: string | { location?: string };
  locationdescription?: string;
  assetnum?: string;
  asset: string;
  status?: string;
  priority?: string | number;
  siteid?: string;
  workorderid?: number;
  ishistory?: boolean;
  assetDescription?: string;

  scheduledstart?: string;
  targetstart?: string;
  targstartdate?: string;
  scheduledfinish?: string;
}

interface MaximoWorkOrderDetails extends MaximoWorkOrderItem {
  worktype?: string;
  glaccount?: string;
  actualstart?: string;
  actualfinish?: string;
  parent?: string;
  failclass?: string;
  problemcode?: string;
}

export async function getWorkOrders(username: string, password: string): Promise<WorkOrder[]> {
  try {
    const token = makeToken(username, password);

    const res = await axios.get<MaximoResponse>(BASE_URL, {
      headers: {
        MAXAUTH: token,
        Authorization: `Basic ${token}`,
        Accept: 'application/json',
      },
      params: {
        lean: 1,
        savedQuery: 'WOTRACK:OWNER IS ME',
        'oslc.select':
          'wonum,description,status,' +
          'assetnum,asset.description,' +
          'location,locationdescription,' +
          'priority,siteid,workorderid,ishistory,' +
          'scheduledstart,targetstart,targstartdate,scheduledfinish',
        'oslc.pageSize': 100,
      },
      timeout: 30000,
      validateStatus: () => true,
    });

    if (res.status >= 400) {
      throw new Error(`HTTP ${res.status}`);
    }

    const items: MaximoWorkOrderItem[] = res.data?.member ?? [];
    console.log(`[getWorkOrders] ${items.length} WO récupérés`);

    return items.map((item): WorkOrder => {
      const scheduledStart: string | null =
        item.scheduledstart || item.targetstart || item.targstartdate || null;

      return {
        wonum: item.wonum ?? '',
        barcode: item.wonum ?? '',
        description: item.description ?? '',
        details: '',
        location:
          typeof item.location === 'object' && item.location !== null
            ? item.location.location ?? item.locationdescription ?? ''
            : item.locationdescription ?? (item.location as any) ?? '',
        locationDescription: item.locationdescription ?? '',
        asset: item.assetnum ?? '',
        assetDescription: (item as any)?.asset?.description ?? '',
        status: item.status ?? '',
        scheduledStart,
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
      };
    });
  } catch (error: any) {
    console.error('[getWorkOrders] Erreur:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
}

export async function getWorkOrderDetails(
  wonum: string,
  username: string,
  password: string
): Promise<Partial<WorkOrder> | null> {
  try {
    const token = makeToken(username, password);

    const res = await axios.get<MaximoResponse>(BASE_URL, {
      headers: {
        MAXAUTH: token,
        Authorization: `Basic ${token}`,
        Accept: 'application/json',
      },
      params: {
        lean: 1,
        'oslc.where': `wonum="${wonum}"`,
        'oslc.select':
          'wonum,description,status,siteid,location,locationdescription,assetnum,worktype,glaccount,scheduledstart,targetstart,targstartdate,actualstart,actualfinish,parent,failclass,problemcode',
      },
      timeout: 30000,
      validateStatus: () => true,
    });

    if (res.status >= 400) return null;

    const item = res.data?.member?.[0] as MaximoWorkOrderDetails | undefined;

    if (!item) {
      console.warn(`[getWorkOrderDetails] Aucun WO trouvé (${wonum})`);
      return null;
    }

    const scheduledStart =
      item.scheduledstart || item.targetstart || item.targstartdate || undefined;

    return {
      wonum: item.wonum ?? '',
      description: item.description ?? '',
      status: item.status ?? '',
      site: item.siteid ?? '',
      location:
        typeof item.location === 'object' && item.location !== null
          ? item.location.location ?? ''
          : item.location ?? '',
      locationDescription: item.locationdescription ?? '',
      asset: item.assetnum ?? '',
      workType: item.worktype,
      glAccount: item.glaccount,
      scheduledStart,
      actualStart: item.actualstart,
      actualFinish: item.actualfinish,
      parentWo: item.parent,
      failureClass: item.failclass,
      problemCode: item.problemcode,
    };
  } catch (error: any) {
    console.error(`[getWorkOrderDetails] Erreur (${wonum})`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    return null;
  }
}
