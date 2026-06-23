import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../../../app/providers/AuthProvider';
import { getWorkOrderFailureReport } from '../services/failureReportingService';
import type { WorkOrderFailureReport } from '../types/failureReporting.types';

export function useWorkOrderFailureReport(wonum: string, siteid: string) {
  const { username, password } = useAuth();

  const [data, setData] = useState<WorkOrderFailureReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!wonum || !siteid) {
      setData(null);
      setError('');
      return;
    }

    if (!username || !password) {
      setData(null);
      setError('Session expirée. Veuillez vous reconnecter.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const remoteReport = await getWorkOrderFailureReport({
        wonum,
        siteid,
        username,
        password,
      });

      setData(remoteReport || { codes: [] });
    } catch (e: any) {
      console.log('[FAILURE REPORT DETAILS ERROR]', e);
      setError(e?.message || 'Erreur de chargement du failure report');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [wonum, siteid, username, password]);

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