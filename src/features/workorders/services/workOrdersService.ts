import { maximo, makeToken, ensureOk, authHeaders } from '../../../shared/services/maximoClient';
import { MAXIMO } from '../../../shared/config/maximoUrls';
import type { WorkOrder } from '../types/workOrder.types';

const BASE_URL = `${MAXIMO.OSLC_OS}/mxwo`;
const LOGIN_URL = `${MAXIMO.OSLC}/login?lean=1`;

type MaximoResponse<T> = {
  member?: T[];
  'rdfs:member'?: T[];
  rdfs_member?: T[];
  Error?: {
    message?: string;
    reasonCode?: string;
    statusCode?: string;
  };
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
  istask?: boolean;

  schedstart?: string;
  schedfinish?: string;
  scheduledstart?: string;
  scheduledfinish?: string;
  targetstart?: string;
  targetfinish?: string;
  targstartdate?: string;
  targcompdate?: string;
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

async function loginToMaximo(username: string, password: string) {
  const headers = buildHeaders(username, password);

  const response = await maximo.post(
    LOGIN_URL,
    null,
    {
      headers,
      timeout: 30000,
    },
  );

  if (response.status >= 400 || response.data?.Error) {
    const message = getMaximoErrorMessage(response.data);
    throw new Error(`loginToMaximo: HTTP ${response.status} - ${message}`);
  }

  return response.data;
}

async function requestWithLogin<T>(
  username: string,
  password: string,
  request: () => Promise<{ status: number; data: T }>,
): Promise<{ status: number; data: T }> {
  await loginToMaximo(username, password);

  let response = await request();

  if (response.status === 401 || (response.data as any)?.Error?.statusCode === '401') {
    await loginToMaximo(username, password);
    response = await request();
  }

  return response;
}

function getMaximoErrorMessage(data: any): string {
  return (
    data?.Error?.message ||
    data?.error?.message ||
    data?.message ||
    'Erreur Maximo inconnue'
  );
}

function getMembers<T>(data: MaximoResponse<T>): T[] {
  return data?.member || data?.['rdfs:member'] || data?.rdfs_member || [];
}

function mapLocation(item: MaximoWorkOrderItem): string {
  if (typeof item.location === 'object' && item.location !== null) {
    return item.location.location ?? item.locationdescription ?? '';
  }

  return item.locationdescription ?? String(item.location ?? '');
}

function mapScheduledStart(item: MaximoWorkOrderItem): string | null {
  return (
    item.schedstart ||
    item.scheduledstart ||
    item.targetstart ||
    item.targstartdate ||
    null
  );
}

function mapScheduledFinish(item: MaximoWorkOrderItem): string | null {
  return (
    item.schedfinish ||
    item.scheduledfinish ||
    item.targetfinish ||
    item.targcompdate ||
    null
  );
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
    scheduledFinish: mapScheduledFinish(item),

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

  console.log('getWorkOrders URL:', BASE_URL);
  console.log('getWorkOrders username:', username.trim());

  const response = await requestWithLogin<MaximoResponse<MaximoWorkOrderItem>>(
    username,
    password,
    () =>
      maximo.get<MaximoResponse<MaximoWorkOrderItem>>(
        BASE_URL,
        {
          headers,
          params: {
            lean: 1,
            savedQuery: 'WOTRACK:OWNER IS ME',
            'oslc.pageSize': 500,
            'oslc.where': 'istask=0',
            'oslc.select':
              'wonum,description,status,' +
              'assetnum,asset.description,' +
              'location,locationdescription,' +
              'priority,siteid,workorderid,ishistory,' +
              'schedstart,schedfinish,' +
              'scheduledstart,scheduledfinish,' +
              'targetstart,targetfinish,' +
              'targstartdate,targcompdate',
          },
          timeout: 30000,
        },
      ),
  );

  console.log('getWorkOrders response status:', response.status);
  console.log('getWorkOrders response data:', response.data);

  if (response.status >= 400 || response.data?.Error) {
    const message = getMaximoErrorMessage(response.data);
    throw new Error(`getWorkOrders: HTTP ${response.status} - ${message}`);
  }

  ensureOk(response.status, response.data, 'getWorkOrders');

  const items = getMembers(response.data);

  return items.map(mapWorkOrder);
}

export async function getWorkOrderDetails(
  wonum: string,
  username: string,
  password: string,
): Promise<Partial<WorkOrder> | null> {
  try {
    const headers = buildHeaders(username, password);

    const response = await requestWithLogin<MaximoResponse<MaximoWorkOrderDetails>>(
      username,
      password,
      () =>
        maximo.get<MaximoResponse<MaximoWorkOrderDetails>>(
          BASE_URL,
          {
            headers,
            params: {
              lean: 1,
              'oslc.where': `wonum="${wonum}"`,
              'oslc.orderBy': '-workorderid',
              'oslc.select':
                'wonum,description,status,siteid,location,locationdescription,' +
                'assetnum,worktype,glaccount,scheduledstart,targetstart,targstartdate,' +
                'actualstart,actualfinish,parent,failclass,problemcode',
            },
            timeout: 30000,
          },
        ),
    );

    console.log('getWorkOrderDetails response status:', response.status);
    console.log('getWorkOrderDetails response data:', response.data);

    if (response.status >= 400 || response.data?.Error) {
      console.log(
        'getWorkOrderDetails error:',
        getMaximoErrorMessage(response.data),
      );
      return null;
    }

    const item = getMembers(response.data)[0];

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
  } catch (err: any) {
    console.log('===== getWorkOrderDetails ERROR =====');
    console.log('message:', err?.message);
    console.log('status:', err?.response?.status);
    console.log('data:', err?.response?.data);

    return null;
  }
}
export async function searchWorkOrderByWonum(params: {
  wonum: string;
  username: string;
  password: string;
  siteid?: string;
}): Promise<WorkOrder[]> {
  const { wonum, username, password, siteid = 'BEDFORD' } = params;

  const cleanWonum = String(wonum || '').trim();

  if (!cleanWonum) {
    return [];
  }

  const headers = buildHeaders(username, password);

  const response = await requestWithLogin<MaximoResponse<MaximoWorkOrderItem>>(
    username,
    password,
    () =>
      maximo.get<MaximoResponse<MaximoWorkOrderItem>>(BASE_URL, {
        headers,
        params: {
          lean: 1,
          'oslc.pageSize': 10,
          'oslc.where': `wonum="${cleanWonum}" and siteid="${siteid}"`,
          'oslc.select':
            'wonum,description,status,' +
            'assetnum,asset.description,' +
            'location,locationdescription,' +
            'priority,siteid,workorderid,ishistory,' +
            'scheduledstart,targetstart,targstartdate,scheduledfinish',
          _ts: Date.now(),
        },
        timeout: 30000,
      }),
  );

  console.log('SEARCH WO BY WONUM response data:', response.data);

  if (response.status >= 400 || response.data?.Error) {
    const message = getMaximoErrorMessage(response.data);
    throw new Error(`searchWorkOrderByWonum: HTTP ${response.status} - ${message}`);
  }

  const items = getMembers(response.data);

  return items.map(mapWorkOrder);
}