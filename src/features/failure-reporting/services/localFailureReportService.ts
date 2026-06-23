import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  SavedFailureReport,
  WorkOrderFailureReport,
} from '../types/failureReporting.types';

function buildKey(wonum: string, siteid: string) {
  return `failure-report:${siteid}:${wonum}`;
}

export async function saveLocalFailureReport(
  wonum: string,
  siteid: string,
  report: WorkOrderFailureReport,
) {
  const data: SavedFailureReport = {
    ...report,
    wonum,
    siteid,
  };

  await AsyncStorage.setItem(buildKey(wonum, siteid), JSON.stringify(data));
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