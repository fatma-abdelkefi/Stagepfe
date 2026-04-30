  import { useCallback, useEffect, useState } from 'react';
  import { useFocusEffect } from '@react-navigation/native';
  import { useAuth } from '../../../app/providers/AuthProvider';
  import { getWorkOrderSummary } from '../services/workOrderDetailsService';
  import { getWorkLogsForWonum } from '../../worklog/services/worklogService';
import { getRelatedWorkOrdersByOrigin } from '../../related-work-orders/services/getRelatedWorkOrdersService';

import type {
    WorkOrderDetailsSummary,
    WorkOrderSectionCounts,
  } from '../types/workOrderDetails.types';
  import { isValidDoclink } from '../../doclinks/utils/mapDoclink';
  import {
  getPlannedMaterialBarcode,
  getLocalActualMaterials,
} from '../../materials/services/barcodeStorage';

  function countArray(value: unknown): number {
    return Array.isArray(value) ? value.length : 0;
  }

  function mapRelatedWorkOrders(value: unknown) {
    if (!Array.isArray(value)) return [];

    return value
      .map((item: any, index: number) => ({
        id:
          item?.id ??
          item?.relatedrecordid ??
          item?.relatedreckey ??
          item?.wonum ??
          `related-${index}`,
        wonum: String(item?.wonum ?? item?.relatedreckey ?? '').trim(),
        relationship: String(item?.relationship ?? item?.relation ?? '').trim(),
        description: String(item?.description ?? '').trim(),
        status: String(item?.status ?? '').trim(),
        siteid: String(item?.siteid ?? '').trim(),
        class: String(
          item?.class ?? item?.relatedrecordclass ?? 'WORKORDER',
        ).trim().toUpperCase(),
      }))
      .filter(item => !!item.wonum && item.class === 'WORKORDER');
  }

  export function useWorkOrderDetailsViewModel(wonum: string, siteid: string) {
    const { username, password } = useAuth();

    const [relatedWorkOrders, setRelatedWorkOrders] = useState<any[]>([]);
    const [summary, setSummary] = useState<WorkOrderDetailsSummary | null>(null);
    const [counts, setCounts] = useState<WorkOrderSectionCounts>({
      plannedMaterials: 0,
      actualMaterials: 0,
      plannedLabor: 0,
      actualLabor: 0,
      activities: 0,
      doclinks: 0,
      worklogs: 0,
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
      if (!username || !password) {
        setError('Veuillez vous reconnecter.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const [woSummary, wlPack] = await Promise.all([
          getWorkOrderSummary(wonum, siteid, username, password),
          getWorkLogsForWonum({ wonum, username, password }),
        ]);

        if (!woSummary) {
          setSummary(null);
          setRelatedWorkOrders([]);
          setCounts({
            plannedMaterials: 0,
            actualMaterials: 0,
            plannedLabor: 0,
            actualLabor: 0,
            activities: 0,
            doclinks: 0,
            worklogs: 0,
          });
          setError('Aucune donnée trouvée pour cet OT.');
          return;
        }

        console.log(
          'WO SUMMARY RELATEDRECORD =',
          JSON.stringify((woSummary as any)?.relatedrecord, null, 2),
        );

        const rawDocLinks = Array.isArray(woSummary.docLinks)
          ? woSummary.docLinks
          : [];
        const validDocLinks = rawDocLinks.filter(isValidDoclink);

        const workLogs = Array.isArray(wlPack.worklogs) ? wlPack.worklogs : [];
        const worklog_collectionref = wlPack.worklog_collectionref ?? '';

        const related = await getRelatedWorkOrdersByOrigin(
          wonum,
          username,
          password,
        );

        setRelatedWorkOrders(related);

        const plannedMaterials = await Promise.all(
          (woSummary.materials ?? []).map(async (item: any) => ({
            ...item,
           barcode: await getPlannedMaterialBarcode({
            wonum: woSummary.wonum,
            itemnum: item.itemnum,
            description: item.description,
            quantity: item.quantity,
          }),
          })),
        );

        const maximoActualMaterials = Array.isArray(woSummary.actualMaterials)
  ? woSummary.actualMaterials
  : [];

        const localActualMaterials = await getLocalActualMaterials({
          wonum: woSummary.wonum,
        });

        const actualMaterials = [
          ...localActualMaterials,
          ...maximoActualMaterials,
        ];
        const actualLabor = Array.isArray((woSummary as any).actualLabor)
          ? (woSummary as any).actualLabor
          : Array.isArray((woSummary as any).labtrans)
          ? (woSummary as any).labtrans
          : [];

        console.log('🧮 ACTUAL LABOR LOADED =', actualLabor.length);

        console.log('🧮 ACTUAL MATERIALS LOADED =', actualMaterials.length);
        const normalizedSummary: WorkOrderDetailsSummary = {
          ...woSummary,
          docLinks: validDocLinks,
          actualMaterials,
          actualLabor,
          workLogs,
          materials: plannedMaterials,
          worklog_collectionref:
            worklog_collectionref || woSummary.worklog_collectionref,
          relatedWorkOrders: related,
        } as WorkOrderDetailsSummary & { relatedWorkOrders: any[] };

        setSummary(normalizedSummary);

        setCounts({
        plannedMaterials: countArray(normalizedSummary.materials),
        actualMaterials: countArray(normalizedSummary.actualMaterials),
        plannedLabor: countArray(normalizedSummary.labor),
        actualLabor: countArray(normalizedSummary.actualLabor),
        activities: countArray(normalizedSummary.activities),
        doclinks: countArray(validDocLinks),
        worklogs: workLogs.length,
      }); 
      } catch (e: any) {
        setError(e?.message ?? 'Erreur lors du chargement du détail OT');
        setSummary(null);
        setRelatedWorkOrders([]);
        setCounts({
          plannedMaterials: 0,
          actualMaterials: 0,
          plannedLabor: 0,
          actualLabor: 0,
          activities: 0,
          doclinks: 0,
          worklogs: 0,
        });
      } finally {
        setLoading(false);
      }
    }, [wonum, siteid, username, password]);

    useEffect(() => {
      load();
    }, [load]);

    useFocusEffect(
      useCallback(() => {
        load();
      }, [load]),
    );

    const updateSummaryStatus = useCallback((nextStatus: string) => {
      setSummary(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          status: nextStatus,
        };
      });
    }, []);

    return {
      summary,
      relatedWorkOrders,
      counts,
      loading,
      error,
      reload: load,
      updateSummaryStatus,
    };
  }