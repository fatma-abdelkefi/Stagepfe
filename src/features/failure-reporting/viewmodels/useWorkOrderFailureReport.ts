import { useCallback, useEffect, useState } from 'react';
import { getWorkOrderFailureReport } from '../services/failureReportingService';
import { getLocalFailureReport } from '../services/localFailureReportService';
import type { WorkOrderFailureReport } from '../types/failureReporting.types';
import { hasUsefulFailureData } from '../utils/failureFormatters';

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