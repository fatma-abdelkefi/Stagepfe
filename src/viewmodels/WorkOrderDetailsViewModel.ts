// src/viewmodels/WorkOrderDetailsViewModel.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getWorkOrderDetails,
  getDoclinkDetailsByHref,
  getActualMaterialAndLabor,
  type ActualLaborItem,
  type ActualMaterialItem,
} from '../services/workOrderDetailsService';
import { rewriteMaximoUrl } from '../services/rewriteMaximoUrl';
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
  return String(doc?.href || doc?.urlname || '').trim();
}

/** ✅ Always return string (never undefined) */
function getActivityHref(a: any): string {
  if (!a) return '';
  if (typeof a.href === 'string') return a.href.trim();
  if (a?.href && typeof a.href === 'object' && typeof a.href.href === 'string') return String(a.href.href).trim();
  if (typeof a?._href === 'string') return a._href.trim();
  return '';
}

export function useWorkOrderDetails(wonum: string) {
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Avoid parallel calls
  const inFlightRef = useRef(false);

  // ✅ If refresh called while request in flight, queue one refresh
  const pendingRefreshRef = useRef(false);

  const enrichDocLinks = useCallback(
    async (details: WorkOrder, username: string, password: string) => {
      const docs: DocLinkItem[] = (details as any).docLinks ?? [];
      if (!docs.length) return details;

      const needs = docs
        .map((d, idx) => ({ d, idx, href: getHref(d) }))
        .filter(
          (x) =>
            !!x.href &&
            (looksLikeId((x.d as any).document) || !String((x.d as any).createdate || '').trim())
        );

      if (!needs.length) return details;

      const updated = [...docs];

      for (const n of needs) {
        const extra = await getDoclinkDetailsByHref(n.href, username, password);
        if (!extra) continue;

        updated[n.idx] = {
          ...(updated[n.idx] as any),
          document: (extra as any).document || (updated[n.idx] as any).document,
          description: (extra as any).description || (updated[n.idx] as any).description,
          createdate: (extra as any).createdate || (updated[n.idx] as any).createdate,
          urlname: (extra as any).urlname || (updated[n.idx] as any).urlname,
          href: (extra as any).href || (updated[n.idx] as any).href,
        } as any;
      }

      return { ...(details as any), docLinks: updated } as any;
    },
    []
  );

  const fetchDetails = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (!wonum) return;

      // If already running, queue refresh if requested
      if (inFlightRef.current) {
        if (mode === 'refresh') pendingRefreshRef.current = true;
        return;
      }

      inFlightRef.current = true;

      try {
        mode === 'initial' ? setLoading(true) : setRefreshing(true);
        setError(null);

        const username = await AsyncStorage.getItem('@username');
        const password = await AsyncStorage.getItem('@password');
        if (!username || !password) throw new Error('Identifiants non trouvés');

        // 1) base details
        const details = await getWorkOrderDetails(wonum, username, password);
        if (!details) throw new Error("Impossible de charger les détails de cet ordre de travail.");

        const safeWoHref = rewriteMaximoUrl((details as any)?.href);

        // 2) actuals (requires siteid)
        let actualLabor: ActualLaborItem[] = [];
        let actualMaterials: ActualMaterialItem[] = [];

        const siteid = (details as any)?.siteid;
        if (siteid) {
          const actual = await getActualMaterialAndLabor(wonum, siteid, username, password);
          actualLabor = actual.actualLabor;
          actualMaterials = actual.actualMaterials;
        }

        // 3) normalize for UI
        // ✅ IMPORTANT: cast as WorkOrder at the end so it compiles even if WorkOrder type
        // does not yet include actualLabor/actualMaterials (workaround).
        const normalized = {
          ...(details as any),

          href: safeWoHref || (details as any)?.href,
          locationDescription: (details as any).locationDescription ?? '',

          activities: ((details as any).activities ?? []).map((a: any): ActivityItem => {
            const rawHref = getActivityHref(a);
            const safeHref = rewriteMaximoUrl(rawHref);

            const status = String(a.status ?? a.statut ?? '').trim();
            const statut = String(a.statut ?? a.status ?? '').trim();

            return {
              href: safeHref,
              taskid: String(a.taskid ?? ''),
              description: a.description ?? '',
              status,
              statut,
              labhrs: a.labhrs ?? 0,
            };
          }),

          labor: ((details as any).labor ?? []).map((l: any): LaborItem => ({
            taskid: String(l.taskid ?? ''),
            laborcode: l.laborcode ?? '',
            description: l.description ?? '',
            labhrs: parseLabHrs(l.labhrs),
          })),

          materials: ((details as any).materials ?? []).map((m: any): MaterialItem => ({
            taskid: String(m.taskid ?? ''),
            itemnum: m.itemnum ?? '',
            description: m.description ?? '',
            quantity: Number(m.quantity ?? 0),
          })),

          docLinks: (details as any).docLinks ?? [],

          // ✅ actual fields (réel)
          actualLabor,
          actualMaterials,
        } as WorkOrder;

        setWorkOrder(normalized);

        // 4) optional doclink enrichment
        const enriched = await enrichDocLinks(normalized, username, password);
        setWorkOrder(enriched);
      } catch (e: any) {
        setWorkOrder(null);
        setError(e?.message || 'Une erreur est survenue lors du chargement.');
      } finally {
        mode === 'initial' ? setLoading(false) : setRefreshing(false);
        inFlightRef.current = false;

        // If refresh was requested during in-flight request, run it now
        if (pendingRefreshRef.current) {
          pendingRefreshRef.current = false;
          fetchDetails('refresh');
        }
      }
    },
    [wonum, enrichDocLinks]
  );

  useEffect(() => {
    if (!wonum) {
      setWorkOrder(null);
      setLoading(false);
      setError('wonum manquant');
      return;
    }
    fetchDetails('initial');
  }, [fetchDetails, wonum]);

  const refresh = useCallback(() => {
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