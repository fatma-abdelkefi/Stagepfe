import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWorkOrderDetails } from '../services/workOrderDetailsService';
import type { WorkOrder, ActivityItem, LaborItem, MaterialItem, DocLinkItem } from './WorkOrdersViewModel';

export function parseLabHrs(labhrs: string | number | undefined | null): number {
  if (!labhrs) return 0;
  if (typeof labhrs === 'number') return labhrs;
  const parts = String(labhrs).split(':').map(Number);
  return (parts[0] || 0) + (parts[1] ? parts[1] / 60 : 0);
}

export function useWorkOrderDetails(wonum: string) {
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState<boolean>(true);      // first load only
  const [refreshing, setRefreshing] = useState<boolean>(false); // focus refresh
  const [error, setError] = useState<string | null>(null);

  const inFlightRef = useRef(false);
  const firstLoadDoneRef = useRef(false);

  const fetchDetails = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (inFlightRef.current) return; // ✅ prevent loop
    inFlightRef.current = true;

    try {
      if (mode === 'initial') setLoading(true);
      else setRefreshing(true);

      setError(null);

      const username = await AsyncStorage.getItem('@username');
      const password = await AsyncStorage.getItem('@password');
      if (!username || !password) throw new Error('Identifiants non trouvés');

      const details = await getWorkOrderDetails(wonum, username, password);
      if (!details || typeof details !== 'object') {
        setWorkOrder(null);
        setError("Impossible de charger les détails de cet ordre de travail.");
        return;
      }

      const normalized: WorkOrder = {
        ...details,

        // ✅ guarantee required WorkOrder fields
        locationDescription: details.locationDescription ?? '',

        activities: (details.activities ?? []).map((a: any): ActivityItem => ({
          taskid: String(a.taskid ?? ''),
          description: a.description ?? '',
          status: a.status ?? '',
          labhrs: a.labhrs ?? 0,
        })),

        labor: (details.labor ?? []).map((l: any): LaborItem => ({
          taskid: String(l.taskid ?? ''),
          laborcode: l.laborcode ?? '',
          description: l.description ?? '',
          labhrs: parseLabHrs(l.labhrs),
        })),

        materials: (details.materials ?? []).map((m: any): MaterialItem => ({
          taskid: String(m.taskid ?? ''),
          itemnum: m.itemnum ?? '',
          description: m.description ?? '',
          quantity: Number(m.quantity ?? 0),
        })),

        docLinks: (details.docLinks ?? []).map((d: any): DocLinkItem => ({
          document: d.document ?? '',
          description: d.description ?? '',
          createdate: d.createdate ?? '',
          urlname: d.urlname ?? '',
        })),
      };

      setWorkOrder(normalized);
      firstLoadDoneRef.current = true;
    } catch (err: any) {
      setWorkOrder(null);
      setError(err?.message || 'Une erreur est survenue lors du chargement.');
    } finally {
      if (mode === 'initial') setLoading(false);
      else setRefreshing(false);
      inFlightRef.current = false;
    }
  }, [wonum]);

  useEffect(() => {
    fetchDetails('initial');
  }, [fetchDetails]);

  // ✅ refresh only when screen focused AND initial already done AND not in flight
  const refresh = useCallback(() => {
    if (!firstLoadDoneRef.current) return;
    if (inFlightRef.current) return;
    fetchDetails('refresh');
  }, [fetchDetails]);

  const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return 'Non planifié';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Date invalide';
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const calculateDuration = (start?: string | null, end?: string | null): string => {
    if (!start || !end) return 'N/A';
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    if (isNaN(diffMs)) return 'N/A';
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    return diffDays > 0 ? `${diffDays}j ${diffHours % 24}h` : `${diffHours}h`;
  };

  return { workOrder, loading, refreshing, error, formatDate, calculateDuration, refresh };
}