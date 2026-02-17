import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getWorkOrderDetails,
  getDoclinkDetailsByHref,
  getDoclinkMetaByHref,
} from '../services/workOrderDetailsService';

import type { WorkOrder, DocLinkItem } from './WorkOrdersViewModel';

function safeStr(v: any): string {
  return typeof v === 'string' ? v.trim() : '';
}

function isGenericDesc(desc: string) {
  const d = safeStr(desc).toLowerCase();
  return !d || d === 'aucune description';
}

function needsMoreInfo(doc: any) {
  const created = safeStr(doc?.createdate);
  const desc = safeStr(doc?.description);

  if (!created) return true;
  if (isGenericDesc(desc)) return true;

  return false;
}

export function useWorkOrderDetails(wonum: string) {
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inFlightRef = useRef(false);
  const firstLoadDoneRef = useRef(false);

  const applyExtra = (current: any, extra: any) => {
    const next: any = { ...current };
    if (safeStr(extra?.document)) next.document = extra.document;
    if (safeStr(extra?.description)) next.description = extra.description;
    if (safeStr(extra?.createdate)) next.createdate = extra.createdate;
    if (safeStr(extra?.urlname)) next.urlname = extra.urlname;
    if (safeStr(extra?.href)) next.href = extra.href;
    return next;
  };

  const enrichDocLinks = useCallback(
    async (details: WorkOrder, username: string, password: string) => {
      const docs: DocLinkItem[] = (details as any)?.docLinks ?? [];

      console.log('==============================');
      console.log('✨ [enrichDocLinks] docs length:', docs.length);

      if (!docs.length) {
        console.log('✨ [enrichDocLinks] no docs -> skip');
        console.log('==============================');
        return details;
      }

      const updated = [...docs];

      for (let i = 0; i < docs.length; i++) {
        const d: any = docs[i];

        console.log('------------------------------');
        console.log(`✨ [enrichDocLinks] doc[${i}] title:`, d?.document);
        console.log(`✨ [enrichDocLinks] doc[${i}] href:`, d?.href);
        console.log(`✨ [enrichDocLinks] doc[${i}] describedByHref:`, d?.describedByHref);
        console.log(`✨ [enrichDocLinks] doc[${i}] createdate:`, d?.createdate);
        console.log(`✨ [enrichDocLinks] doc[${i}] description:`, d?.description);

        const hrefToUse =
          safeStr(d?.href) ||
          safeStr(d?.urlname) ||
          safeStr(d?.describedByHref) ||
          '';

        const needs = !!hrefToUse && needsMoreInfo(d);
        console.log(`✨ [enrichDocLinks] doc[${i}] needsMore:`, needs);
        if (!needs) continue;

        // 1) Try /doclinks/{id}
        const extra1 = await getDoclinkDetailsByHref(hrefToUse, username, password);
        console.log(`✨ [enrichDocLinks] doc[${i}] extra1(doclinks):`, extra1);

        let nextDoc: any = { ...updated[i] };
        if (extra1) nextDoc = applyExtra(nextDoc, extra1);

        // If still missing description, try meta endpoint
        const stillMissing =
          isGenericDesc(safeStr(nextDoc?.description)) && isGenericDesc(safeStr(extra1?.description));

        if (stillMissing) {
          const extra2 = await getDoclinkMetaByHref(hrefToUse, username, password);
          console.log(`✨ [enrichDocLinks] doc[${i}] extra2(meta):`, extra2);
          if (extra2) nextDoc = applyExtra(nextDoc, extra2);
        }

        updated[i] = nextDoc;
      }

      console.log('==============================');
      return { ...details, docLinks: updated as any };
    },
    []
  );

  const fetchDetails = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      console.log('==============================');
      console.log('📲 [useWorkOrderDetails] fetchDetails mode:', mode);
      console.log('📲 [useWorkOrderDetails] wonum:', wonum);
      console.log('==============================');

      try {
        mode === 'initial' ? setLoading(true) : setRefreshing(true);
        setError(null);

        const username = await AsyncStorage.getItem('@username');
        const password = await AsyncStorage.getItem('@password');
        if (!username || !password) throw new Error('Identifiants non trouvés');

        const details = await getWorkOrderDetails(wonum, username, password);
        if (!details) throw new Error("Impossible de charger les détails de cet ordre de travail.");

        setWorkOrder(details);
        firstLoadDoneRef.current = true;

        const enriched = await enrichDocLinks(details, username, password);
        setWorkOrder(enriched);
      } catch (e: any) {
        setWorkOrder(null);
        setError(e?.message || 'Une erreur est survenue lors du chargement.');
      } finally {
        mode === 'initial' ? setLoading(false) : setRefreshing(false);
        inFlightRef.current = false;
      }
    },
    [wonum, enrichDocLinks]
  );

  useEffect(() => {
    fetchDetails('initial');
  }, [fetchDetails]);

  const refresh = useCallback(() => {
    if (!firstLoadDoneRef.current) return;
    if (inFlightRef.current) return;
    fetchDetails('refresh');
  }, [fetchDetails]);

  return { workOrder, loading, refreshing, error, refresh };
}