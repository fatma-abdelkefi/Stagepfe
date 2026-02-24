import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getWorkOrderDetails,
  getDoclinkDetailsByHref,
  getActualsFromWoHref,
  type ActualLaborItem,
  type ActualMaterialItem,
} from '../services/workOrderDetailsService';

import { rewriteMaximoUrl } from '../services/rewriteMaximoUrl';
import { getWorkLogsForWonum } from '../services/worklogService';

import type { WorkOrder, ActivityItem, LaborItem, MaterialItem, DocLinkItem } from './WorkOrdersViewModel';

export function parseLabHrs(labhrs: string | number | undefined | null): number {
  if (labhrs === undefined || labhrs === null || labhrs === '') return 0;
  if (typeof labhrs === 'number') return labhrs;

  const s = String(labhrs).trim();
  if (!s) return 0;

  if (s.includes(':')) {
    const [h, m] = s.split(':').map((x) => Number(x));
    return (h || 0) + ((m || 0) / 60);
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function looksLikeId(v?: string) {
  const s = String(v || '').trim();
  return !!s && /^\d+$/.test(s);
}

function getHref(doc: any) {
  return String(doc?.href || doc?.urlname || '').trim();
}

function getActivityHref(a: any): string {
  if (!a) return '';
  if (typeof a.href === 'string') return a.href.trim();
  if (a?.href && typeof a.href === 'object' && typeof a.href.href === 'string') return String(a.href.href).trim();
  if (typeof a?._href === 'string') return a._href.trim();
  return '';
}

type FetchMode = 'initial' | 'refresh';

export function useWorkOrderDetails(wonum: string) {
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inFlightRef = useRef(false);
  const pendingRefreshRef = useRef(false);

  // ✅ Keep latest wonum in a ref (prevents stale closures during fast refresh)
  const wonumRef = useRef<string>(wonum);
  useEffect(() => {
    wonumRef.current = wonum;
  }, [wonum]);

  const enrichDocLinks = useCallback(async (details: WorkOrder, username: string, password: string) => {
    const docs: DocLinkItem[] = (details as any).docLinks ?? [];
    if (!docs.length) return details;

    const needs = docs
      .map((d, idx) => ({ d, idx, href: getHref(d) }))
      .filter((x) => !!x.href && (looksLikeId((x.d as any).document) || !String((x.d as any).createdate || '').trim()));

    if (!needs.length) return details;

    const updated = [...docs];

    for (const n of needs) {
      try {
        const extra = await getDoclinkDetailsByHref(n.href, username, password);
        if (!extra) continue;

        updated[n.idx] = {
          ...updated[n.idx],
          document: (extra as any).document || (updated[n.idx] as any).document,
          description: (extra as any).description || (updated[n.idx] as any).description,
          createdate: (extra as any).createdate || (updated[n.idx] as any).createdate,
          urlname: (extra as any).urlname || (updated[n.idx] as any).urlname,
          href: (extra as any).href || (updated[n.idx] as any).href,
        } as any;
      } catch {
        // ignore single doc errors
      }
    }

    return { ...(details as any), docLinks: updated } as any;
  }, []);

  const fetchDetails = useCallback(
    async (mode: FetchMode) => {
      const currentWonum = String(wonumRef.current || '').trim();

      // ✅ Do not “return” without cleaning state for initial mode
      if (!currentWonum) {
        setWorkOrder(null);
        setError('wonum manquant');
        setLoading(false);
        setRefreshing(false);
        return;
      }

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

        const details = await getWorkOrderDetails(currentWonum, username, password);
        if (!details) throw new Error("Impossible de charger les détails de cet ordre de travail.");

        const safeWoHref = rewriteMaximoUrl((details as any).href);

        let worklog_collectionref = '';
        let workLogs: any[] = [];

        try {
          const wlPack = await getWorkLogsForWonum({ wonum: currentWonum, username, password });
          worklog_collectionref = String(wlPack.worklog_collectionref || '').trim();
          workLogs = Array.isArray(wlPack.worklogs) ? wlPack.worklogs : [];
        } catch {
          worklog_collectionref = '';
          workLogs = [];
        }

        // ✅ actuals always from mxwo href
        let actualLabor: ActualLaborItem[] = [];
        let actualMaterials: ActualMaterialItem[] = [];

        const woHrefForActuals = safeWoHref || (details as any).href || '';
        if (String(woHrefForActuals).trim()) {
          const actual = await getActualsFromWoHref(woHrefForActuals, username, password);
          actualLabor = actual.actualLabor || [];
          actualMaterials = actual.actualMaterials || [];
        }

        const normalized: WorkOrder = {
          ...(details as any),
          href: safeWoHref || (details as any).href,
          ...(worklog_collectionref ? { worklog_collectionref } : {}),
          ...(workLogs.length ? { workLogs } : {}),

          activities: ((details as any).activities ?? []).map((a: any): ActivityItem => ({
            href: rewriteMaximoUrl(getActivityHref(a)),
            taskid: String(a.taskid ?? ''),
            description: a.description ?? '',
            status: String(a.status ?? a.statut ?? '').trim(),
            statut: String(a.statut ?? a.status ?? '').trim(),
            labhrs: a.labhrs ?? 0,
          })),

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

          actualLabor,
          actualMaterials,
        };

        setWorkOrder(normalized);

        const enriched = await enrichDocLinks(normalized, username, password);
        setWorkOrder(enriched);
      } catch (e: any) {
        setWorkOrder(null);
        setError(e?.message || 'Une erreur est survenue lors du chargement.');
      } finally {
        mode === 'initial' ? setLoading(false) : setRefreshing(false);
        inFlightRef.current = false;

        // ✅ safe queued refresh (wonum comes from wonumRef)
        if (pendingRefreshRef.current) {
          pendingRefreshRef.current = false;
          // fire-and-forget; avoid recursive await chain
          fetchDetails('refresh');
        }
      }
    },
    [enrichDocLinks]
  );

  useEffect(() => {
    // ✅ Always call fetchDetails; it will handle missing wonum safely
    fetchDetails('initial');
  }, [fetchDetails, wonum]);

  const refresh = useCallback(() => fetchDetails('refresh'), [fetchDetails]);

  return { workOrder, loading, refreshing, error, refresh };
}