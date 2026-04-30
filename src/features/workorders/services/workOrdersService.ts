import { maximo, makeToken, authHeaders, ensureOk } from '../../../shared/services/maximoClient';
import { MAXIMO } from '../../../shared/config/maximoUrls';
import type { WorkOrder } from '../types/workOrder.types';

const BASE_URL = `${MAXIMO.OSLC_OS}/mxwo`;

type MaximoResponse<T> = {
  member?: T[];
  [key: string]: any;
};

type MaximoWorkOrderItem = {
  wonum?: string;
  description?: string;
  location?: string | { location?: string };
  locationdescription?: string;
  assetnum?: string;
  asset?: { description?: string };
  status?: string;
  priority?: string | number;
  siteid?: string;
  workorderid?: number;
  ishistory?: boolean;

  scheduledstart?: string;
  targetstart?: string;
  targstartdate?: string;
  scheduledfinish?: string;
};

type MaximoWorkOrderDetails = MaximoWorkOrderItem & {
  worktype?: string;
  glaccount?: string;
  actualstart?: string;
  actualfinish?: string;
  parent?: string;
  failclass?: string;
  problemcode?: string;
};

function buildHeaders(username: string, password: string) {
  const token = makeToken(username, password);
  return authHeaders(token);
}

function mapLocation(item: MaximoWorkOrderItem): string {
  if (typeof item.location === 'object' && item.location !== null) {
    return item.location.location ?? item.locationdescription ?? '';
  }

  return item.locationdescription ?? String(item.location ?? '');
}

function mapScheduledStart(item: MaximoWorkOrderItem): string | null {
  return item.scheduledstart || item.targetstart || item.targstartdate || null;
}

function mapWorkOrder(item: MaximoWorkOrderItem): WorkOrder {
  const status = item.status ?? '';
  const priority = Number(item.priority ?? 0);

  return {
    wonum: item.wonum ?? '',
    barcode: item.wonum ?? '',
    description: item.description ?? '',
    details: '',

    location: mapLocation(item),
    locationDescription: item.locationdescription ?? '',

    asset: item.assetnum ?? '',
    assetDescription: item.asset?.description ?? '',

    status,

    scheduledStart: mapScheduledStart(item),
    scheduledFinish: item.scheduledfinish ?? null,

    priority,
    isDynamic: false,
    dynamicJobPlanApplied: false,

    site: item.siteid ?? '',
    siteid: item.siteid ?? undefined,
    workorderid: item.workorderid ?? undefined,
    ishistory: item.ishistory ?? undefined,

    completed: ['COMP', 'CLOSE'].includes(status.toUpperCase()),
    isUrgent: priority === 1,
    cout: 0,
  };
}

export async function getWorkOrders(
  username: string,
  password: string,
): Promise<WorkOrder[]> {
  const headers = buildHeaders(username, password);

  const response = await maximo.get<MaximoResponse<MaximoWorkOrderItem>>(BASE_URL, {
    headers,
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
  });

  ensureOk(response.status, response.data, 'getWorkOrders');

  const items = response.data?.member ?? [];
  return items.map(mapWorkOrder);
}

export async function getWorkOrderDetails(
  wonum: string,
  username: string,
  password: string,
): Promise<Partial<WorkOrder> | null> {
  const headers = buildHeaders(username, password);

  const response = await maximo.get<MaximoResponse<MaximoWorkOrderDetails>>(BASE_URL, {
    headers,
    params: {
      lean: 1,
      'oslc.where': `wonum="${wonum}"`,
      'oslc.select':
        'wonum,description,status,siteid,location,locationdescription,' +
        'assetnum,worktype,glaccount,scheduledstart,targetstart,targstartdate,' +
        'actualstart,actualfinish,parent,failclass,problemcode',
    },
    timeout: 30000,
  });

  if (response.status >= 400) {
    return null;
  }

  const item = response.data?.member?.[0];
  if (!item) {
    return null;
  }

  return {
    wonum: item.wonum ?? '',
    description: item.description ?? '',
    status: item.status ?? '',
    site: item.siteid ?? '',
    location:
      typeof item.location === 'object' && item.location !== null
        ? item.location.location ?? ''
        : String(item.location ?? ''),
    locationDescription: item.locationdescription ?? '',
    asset: item.assetnum ?? '',
    workType: item.worktype,
    glAccount: item.glaccount,
    scheduledStart: mapScheduledStart(item),
    actualStart: item.actualstart,
    actualFinish: item.actualfinish,
    parentWo: item.parent,
    failureClass: item.failclass,
    problemCode: item.problemcode,
  };
}