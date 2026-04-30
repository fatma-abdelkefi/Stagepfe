import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MAXIMO } from '../../../shared/config/maximoUrls';
import { makeToken } from '../../../shared/config/maximoClient';
import type { WorkOrderFailureReport } from '../types/failureReporting.types';
import { safeTrim, toArray } from '../utils/failureFormatters';

type MaximoOsResponse<T> = {
  member?: T[];
};

type MaximoWorklog = {
  createdate?: string;
  description?: string;
  longdescription?: string;
  description_longdescription?: string;
};

type MaximoWorkOrderFailure = {
  wonum?: string;
  siteid?: string;
  faildate?: string;
  problemcode?: string;
  failurecode?: string;
  worklog?: MaximoWorklog[] | MaximoWorklog;
};

function getLatestWorklog(worklogs: MaximoWorklog[]): MaximoWorklog | null {
  if (!worklogs.length) return null;

  const sorted = [...worklogs].sort((a, b) =>
    safeTrim(a.createdate).localeCompare(safeTrim(b.createdate)),
  );

  return sorted[sorted.length - 1] ?? null;
}

export async function getWorkOrderFailureReport(
  wonum: string,
  siteid: string,
): Promise<WorkOrderFailureReport> {
  const username = await AsyncStorage.getItem('username');
  const password = await AsyncStorage.getItem('password');

  const headers = {
    Authorization: makeToken(username || '', password || ''),
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  try {
    const url =
      `${MAXIMO.OSLC_OS}/mxapiwo?lean=1` +
      `&oslc.where=wonum="${wonum}" and siteid="${siteid}"` +
      `&oslc.select=` +
      [
        'wonum',
        'siteid',
        'faildate',
        'problemcode',
        'failurecode',
        'worklog{description,longdescription,description_longdescription,createdate}',
      ].join(',');

    console.log('✅ FAILURE SERVICE SIMPLIFIED');
    console.log('🔥 FAILURE LIST URL:', url);

    const res = await axios.get<MaximoOsResponse<MaximoWorkOrderFailure>>(url, {
      headers,
    });

    console.log('🔥 FAILURE LIST BODY:', JSON.stringify(res.data, null, 2));

    const wo = toArray<MaximoWorkOrderFailure>(res.data?.member)[0];

    if (!wo) {
      return { codes: [] };
    }

    const result: WorkOrderFailureReport = {
      failureDate: safeTrim(wo.faildate),
      failureClass: safeTrim(wo.failurecode),
      problem: safeTrim(wo.problemcode),
      codes: [],
    };

    const worklogs = toArray<MaximoWorklog>(wo.worklog);
    const lastWorklog = getLatestWorklog(worklogs);

    if (lastWorklog) {
      result.remark = safeTrim(
        lastWorklog.description ||
          lastWorklog.longdescription ||
          lastWorklog.description_longdescription,
      );

      result.remarkDate = safeTrim(lastWorklog.createdate);
    }

    if (result.problem) {
      result.codes.push({
        type: 'PROBLEM',
        code: result.problem,
        description: '',
      });
    }

    return result;
  } catch (error: any) {
    console.error(
      '❌ FAILURE REPORT ERROR:',
      error?.response?.data || error?.message,
    );

    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        'Erreur de chargement du failure report',
    );
  }
}