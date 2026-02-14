import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWorkOrderDetails, getDoclinkDetailsByHref } from '../services/workOrderDetailsService';
import type { WorkOrder, ActivityItem, LaborItem, MaterialItem, DocLinkItem } from './WorkOrdersViewModel';

export function parseLabHrs(labhrs: string | number | undefined | null): number {
  if (!labhrs) return 0;
  if (typeof labhrs === 'number') return labhrs;
  const parts = String(labhrs).split(':').map(Number);
  return (parts[0] || 0) + (parts[1] ? parts[1] / 60 : 0);
}

function looksLikeId(v?: string) {
  const s = String(v || '').trim();
  return !!s && /^\d+$/.test(s);
}

function getHref(doc: any) {
  return String(doc?.href || doc?.urlname || '');
}

export function useWorkOrderDetails(wonum: string) {
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inFlightRef = useRef(false);
  const firstLoadDoneRef = useRef(false);

  const enrichDocLinks = useCallback(async (details: WorkOrder, username: string, password: string) => {
    const docs: DocLinkItem[] = details.docLinks ?? [];
    if (!docs.length) return details;

    // Only enrich docs with missing metadata
    const needs = docs
      .map((d, idx) => ({ d, idx, href: getHref(d) }))
      .filter(x => !!x.href && (looksLikeId(x.d.document) || !String(x.d.createdate || '').trim()));

    if (!needs.length) return details;

    // Fetch with a small concurrency (avoid server overload)
    const updated = [...docs];

    for (const n of needs) {
      const extra = await getDoclinkDetailsByHref(n.href, username, password);
      if (!extra) continue;

      updated[n.idx] = {
        ...updated[n.idx],
        document: extra.document || updated[n.idx].document,
        description: extra.description || updated[n.idx].description,
        createdate: extra.createdate || updated[n.idx].createdate,
        urlname: extra.urlname || updated[n.idx].urlname,
        href: extra.href || (updated[n.idx] as any).href,
      } as any;
    }

    return { ...details, docLinks: updated };
  }, []);

  const fetchDetails = useCallback(async (mode: 'initial' | 'refresh') => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      mode === 'initial' ? setLoading(true) : setRefreshing(true);
      setError(null);

      const username = await AsyncStorage.getItem('@username');
      const password = await AsyncStorage.getItem('@password');
      if (!username || !password) throw new Error('Identifiants non trouvés');

      const details = await getWorkOrderDetails(wonum, username, password);
      if (!details) throw new Error("Impossible de charger les détails de cet ordre de travail.");

      const normalized: WorkOrder = {
        ...details,
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

        docLinks: details.docLinks ?? [],
      };

      // Show quickly first
      setWorkOrder(normalized);
      firstLoadDoneRef.current = true;

      // Then enrich metadata
      const enriched = await enrichDocLinks(normalized, username, password);
      setWorkOrder(enriched);
    } catch (e: any) {
      setWorkOrder(null);
      setError(e?.message || 'Une erreur est survenue lors du chargement.');
    } finally {
      mode === 'initial' ? setLoading(false) : setRefreshing(false);
      inFlightRef.current = false;
    }
  }, [wonum, enrichDocLinks]);

  useEffect(() => {
    fetchDetails('initial');
  }, [fetchDetails]);

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
