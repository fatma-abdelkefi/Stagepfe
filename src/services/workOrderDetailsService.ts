import axios from 'axios';
import { Buffer } from 'buffer';
import { WorkOrder } from '../viewmodels/WorkOrdersViewModel';

const BASE_URL = 'http://demo2.smartech-tn.com/maximo/oslc/os/mxwo';

interface MaximoResponse {
  member?: Array<{
    wonum?: string;
    description?: string;
    location?: string | { location?: string };
    assetnum?: string;
    status?: string;
    worktype?: string;
    glaccount?: string;
    siteid?: string;
    scheduledstart?: string;
    targetstart?: string;
    targstartdate?: string;
    actualstart?: string;
    actualfinish?: string;
  }>;
}

function makeMaxAuth(username: string, password: string): string {
  try {
    return btoa(`${username}:${password}`);
  } catch {
    return Buffer.from(`${username}:${password}`).toString('base64');
  }
}

export async function getWorkOrderDetails(
  wonum: string,
  username: string,
  password: string
): Promise<Partial<WorkOrder> | null> {
  try {
    const token = makeMaxAuth(username, password);

    const res = await axios.get<MaximoResponse>(BASE_URL, {
      headers: {
        MAXAUTH: token,
        Accept: 'application/json',
      },
      params: {
        lean: 1,
        'oslc.pageSize': 1,
        'oslc.where': `wonum="${wonum}"`,
        'oslc.select': [
          'wonum',
          'description',
          'status',
          'siteid',
          'location',
          'assetnum',
          'worktype',
          'glaccount',
          'scheduledstart',
          'targetstart',
          'targstartdate',
          'actualstart',
          'actualfinish',
        ].join(','),
      },
      timeout: 30000,
    });

    const item = res.data?.member?.[0];
    if (!item) return null;

    const scheduledStart =
      item.scheduledstart || item.targetstart || item.targstartdate || '';

    return {
      wonum: item.wonum ?? '',
      description: item.description ?? '',
      status: item.status ?? '',
      site: item.siteid ?? '',
      location:
        typeof item.location === 'object'
          ? item.location?.location ?? ''
          : item.location ?? '',
      asset: item.assetnum ?? '',
      workType: item.worktype ?? '',
      glAccount: item.glaccount ?? '',
      scheduledStart,
      actualStart: item.actualstart ?? '',
      actualFinish: item.actualfinish ?? '',
    };
  } catch (error: any) {
    console.error(`Erreur fetch détails WO ${wonum}:`, error.message || error);
    return null;
  }
}
