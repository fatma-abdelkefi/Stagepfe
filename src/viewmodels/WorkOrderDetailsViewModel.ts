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

export function useWorkOrderDetails(wonum: string) {
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inFlightRef = useRef(false);
  const pendingRefreshRef = useRef(false);

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
        // keep original doc
      }
    }

    return { ...(details as any), docLinks: updated } as any;
  }, []);

  const fetchDetails = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (!wonum) return;

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

        // 1) Base WO details
        const details = await getWorkOrderDetails(wonum, username, password);
        if (!details) throw new Error("Impossible de charger les détails de cet ordre de travail.");

        // Normalize WO href (avoid 192.168.*)
        const safeWoHref = rewriteMaximoUrl((details as any).href);

        // 2) Worklogs (collectionref + list)
        let worklog_collectionref = '';
        let workLogs: any[] = [];

        try {
          const wlPack = await getWorkLogsForWonum({ wonum, username, password });
          worklog_collectionref = String(wlPack.worklog_collectionref || '').trim();
          workLogs = Array.isArray(wlPack.worklogs) ? wlPack.worklogs : [];

          console.log('[WORKLOG] collectionref:', worklog_collectionref);
          console.log('[WORKLOG] count:', workLogs.length);
        } catch (e: any) {
          console.log('[WORKLOG] ERROR:', e?.message || e);
          worklog_collectionref = '';
          workLogs = [];
        }

        // 3) Actuals + mxwoDetailsHref (needs siteid)
        let actualLabor: ActualLaborItem[] = [];
        let actualMaterials: ActualMaterialItem[] = [];
        let mxwoDetailsHref = '';

        const siteid = String((details as any).siteid || '').trim();
        if (siteid) {
          const actual = await getActualMaterialAndLabor(wonum, siteid, username, password);

          actualLabor = actual.actualLabor || [];
          actualMaterials = actual.actualMaterials || [];

          // ✅ IMPORTANT for AddActualMaterial/AddActualLabor screens
          mxwoDetailsHref = String((actual as any).mxwoDetailsHref || '').trim();
        }

        const normalized: WorkOrder = {
          ...(details as any),

          // normalized wo href
          href: safeWoHref || (details as any).href,

          // ✅ required by AddWorkLogScreen
          ...(worklog_collectionref ? { worklog_collectionref } : {}),

          // ✅ required by DetailsWorkLogScreen
          ...(workLogs.length ? { workLogs } : {}),

          // ✅ required by AddActualMaterial/AddActualLabor screens
          ...(mxwoDetailsHref ? { mxwoDetailsHref } : {}),

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

          actualLabor,
          actualMaterials,
        };

        setWorkOrder(normalized);

        // 4) Doclink enrich (after UI render)
        const enriched = await enrichDocLinks(normalized, username, password);
        setWorkOrder(enriched);
      } catch (e: any) {
        setWorkOrder(null);
        setError(e?.message || 'Une erreur est survenue lors du chargement.');
      } finally {
        mode === 'initial' ? setLoading(false) : setRefreshing(false);
        inFlightRef.current = false;

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

  return { workOrder, loading, refreshing, error, refresh };
}