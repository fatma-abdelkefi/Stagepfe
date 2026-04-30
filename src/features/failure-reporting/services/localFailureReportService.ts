import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  SavedFailureReport,
  WorkOrderFailureReport,
} from '../types/failureReporting.types';

const PREFIX = 'failure_report_local_v1';

function buildKey(wonum: string, siteid: string) {
  return `${PREFIX}:${String(wonum).trim()}:${String(siteid).trim()}`;
}

export async function saveLocalFailureReport(
  wonum: string,
  siteid: string,
  report: WorkOrderFailureReport,
): Promise<void> {
  const payload: SavedFailureReport = {
    ...report,
    wonum: String(wonum).trim(),
    siteid: String(siteid).trim(),
  };

  await AsyncStorage.setItem(buildKey(wonum, siteid), JSON.stringify(payload));
}

export async function getLocalFailureReport(
  wonum: string,
  siteid: string,
): Promise<SavedFailureReport | null> {
  const raw = await AsyncStorage.getItem(buildKey(wonum, siteid));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SavedFailureReport;
  } catch {
    return null;
  }
}

export async function removeLocalFailureReport(
  wonum: string,
  siteid: string,
): Promise<void> {
  await AsyncStorage.removeItem(buildKey(wonum, siteid));
}