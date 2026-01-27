import axios from 'axios';
import { Buffer } from 'buffer';
import { WorkOrder } from '../viewmodels/WorkOrdersViewModel';

const BASE_URL = 'http://demo2.smartech-tn.com/maximo/oslc/os/mxwo';

/**
 * Types pour les réponses Maximo
 */
interface MaximoResponse {
  member?: any[];
  [key: string]: any;
}

interface MaximoWorkOrderItem {
  wonum?: string;
  description?: string;
  location?: string | { location?: string };
  assetnum?: string;
  status?: string;
  priority?: string | number;
  siteid?: string;
  // Champs de date
  scheduledstart?: string;
  targetstart?: string;
  targstartdate?: string;
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

function makeMaxAuth(username: string, password: string): string {
  try {
    return btoa(`${username}:${password}`);
  } catch {
    return Buffer.from(`${username}:${password}`).toString('base64');
  }
}

export async function getWorkOrders(
  username: string,
  password: string
): Promise<WorkOrder[]> {
  try {
    const token = makeMaxAuth(username, password);

    const res = await axios.get<MaximoResponse>(BASE_URL, {
      headers: {
        MAXAUTH: token,
        Accept: 'application/json',
      },
      params: {
        lean: 1,
        'oslc.select': 'wonum,description,location,assetnum,status,priority,siteid,scheduledstart,targetstart,targstartdate',
        'oslc.pageSize': 100,
      },
      timeout: 30000,
    });

    const data = res.data?.member ?? [];

    if (data.length > 0) {
      console.log('\n=== VÉRIFICATION DATES MAXIMO ===');
      console.log('Premier WO:', data[0].wonum);
      console.log('scheduledstart:', data[0].scheduledstart);
      console.log('targetstart:', data[0].targetstart);
      console.log('targstartdate:', data[0].targstartdate);
    }

    return data.map((item: MaximoWorkOrderItem): WorkOrder => {
    
      const scheduledStart = 
        item.scheduledstart || 
        item.targetstart || 
        item.targstartdate || 
        ''; 

      return {
        wonum: item.wonum ?? '',
        barcode: item.wonum ?? '',
        description: item.description ?? '',
        details: '',
        location: typeof item.location === 'object'
          ? item.location?.location ?? ''
          : item.location ?? '',
        asset: item.assetnum ?? '',
        status: item.status ?? '',
        scheduledStart: scheduledStart, 
        priority: Number(item.priority ?? 0),
        isDynamic: false,
        dynamicJobPlanApplied: false,
        site: item.siteid ?? '',
        completed: ['COMP', 'CLOSE'].includes(item.status?.toUpperCase() ?? ''),
        isUrgent: Number(item.priority) === 1,
        cout: 0,
      };
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des work orders:', error.message);
    throw error;
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
        'oslc.where': `wonum="${wonum}"`,
        'oslc.select': 'wonum,description,status,siteid,location,assetnum,worktype,glaccount,actualstart,actualfinish,parent,failclass,problemcode,scheduledstart,targetstart,targstartdate',
      },
      timeout: 30000,
    });

    const item: MaximoWorkOrderDetails | undefined = res.data?.member?.[0];
    
    if (!item) return null;

    const scheduledStart = 
      item.scheduledstart || 
      item.targetstart || 
      item.targstartdate || 
      '';

    return {
      wonum: item.wonum,
      description: item.description,
      status: item.status,
      site: item.siteid,
      location:
        typeof item.location === 'object'
          ? item.location?.location
          : item.location,
      asset: item.assetnum,
      workType: item.worktype,
      glAccount: item.glaccount,
      scheduledStart: scheduledStart,
      actualStart: item.actualstart,
      actualFinish: item.actualfinish,
      parentWo: item.parent,
      failureClass: item.failclass,
      problemCode: item.problemcode,
    };
  } catch (error: any) {
    console.error(`Erreur lors de la récupération des détails du WO ${wonum}:`, error.message);
    return null;
  }
}