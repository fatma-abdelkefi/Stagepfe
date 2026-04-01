import { useCallback, useEffect, useState } from 'react';
import {
  getWorkOrderFailureReport,
  type WorkOrderFailureReport,
} from '../services/failureReportingService';
import { getLocalFailureReport } from '../services/localFailureReportService';

function safeTrim(value: any): string {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function hasUsefulFailureData(report: WorkOrderFailureReport | null | undefined) {
  if (!report) return false;

  return !!(
    safeTrim(report.failureClass) ||
    safeTrim(report.problem) ||
    safeTrim(report.cause) ||
    safeTrim(report.remedy) ||
    safeTrim(report.remark) ||
    (Array.isArray(report.codes) && report.codes.length > 0)
  );
}

export function useWorkOrderFailureReport(wonum: string, siteid: string) {
  const [data, setData] = useState<WorkOrderFailureReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!wonum || !siteid) {
      setData(null);
      setError('');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const [remoteReport, localReport] = await Promise.all([
        getWorkOrderFailureReport(wonum, siteid).catch(() => ({ codes: [] })),
        getLocalFailureReport(wonum, siteid),
      ]);

      if (hasUsefulFailureData(localReport)) {
        setData({
          ...remoteReport,
          ...localReport,
          codes:
            localReport?.codes && localReport.codes.length > 0
              ? localReport.codes
              : remoteReport?.codes || [],
        });
      } else {
        setData(remoteReport || { codes: [] });
      }
    } catch (e: any) {
      setError(e?.message || 'Erreur de chargement du failure report');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [wonum, siteid]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    data,
    loading,
    error,
    refresh,
  };
}