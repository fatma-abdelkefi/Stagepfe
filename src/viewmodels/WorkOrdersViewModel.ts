// src/viewmodels/WorkOrdersViewModel.ts
import { useState, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWorkOrderDetails } from '../services/workOrderDetailsService';

// ─── Types ───────────────────────────────────────────
export type ActivityItem = {
  taskid: string;
  description?: string;
  status?: string;
  labhrs?: number;
  href?: string;
  statut?: string;
};

export type LaborItem = { taskid: string; laborcode?: string; description?: string; labhrs?: number };
export type MaterialItem = { taskid: string; itemnum?: string; description?: string; quantity?: number };
export type DocLinkItem = { document?: string; description?: string; createdate?: string; urlname?: string; docinfo?: any };

export type WPLaborItem = {
  taskid: string;
  laborcode?: string;
  description?: string;
  labhrs?: number;
};

// ✅ NEW: Actual types
export type ActualLaborItem = { laborcode: string; regularhrs: number };
export type ActualMaterialItem = { itemnum: string; itemqty: number; description?: string };

export type WorkOrder = {
  wonum: string;
  barcode: string;
  description: string;
  details: string;
  location: string;
  asset: string;
  assetDescription?: string;
  status: string;
  locationDescription: string;

  href?: string;

  scheduledStart: string | null;
  scheduledFinish?: string | null;

  priority: number;
  isDynamic: boolean;
  dynamicJobPlanApplied: boolean;

  site: string;

  siteid?: string;
  workorderid?: number;
  ishistory?: boolean;

  completed: boolean;
  isUrgent: boolean;
  cout: number;

  activities?: ActivityItem[];
  labor?: LaborItem[];
  wplabor?: WPLaborItem[];
  materials?: MaterialItem[];
  docLinks?: DocLinkItem[];
  wplabor_collectionref?: string;

  // ✅ NEW: these fix your TypeScript error
  actualLabor?: ActualLaborItem[];
  actualMaterials?: ActualMaterialItem[];

  actualStart?: string | null;
  actualFinish?: string | null;
  parentWo?: string;
  failureClass?: string;
  problemCode?: string;
  workType?: string;
  glAccount?: string;

  materialStatusStoreroom?: string;
  materialStatusDirect?: string;
  materialStatusPackage?: string;
  materialStatusLastUpdated?: string;

};

// ─── Helpers ─────────────────────────────────────────
function safeStr(v: any): string {
  return typeof v === 'string' ? v.trim() : '';
}

export const parseLabHrs = (val: string | number | undefined): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const [h, m] = String(val).split(':').map(Number);
  return (h || 0) + ((m || 0) / 60);
};

const isSameDay = (d1: Date, d2: Date) =>
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

/** ✅ NEW: safe activity href getter */
function getActivityHref(a: any): string {
  if (!a) return '';
  if (typeof a.href === 'string') return a.href.trim();
  if (typeof a?.href?.href === 'string') return a.href.href.trim();
  return '';
}

/**
 * ✅ IMPORTANT:
 * Convert ANY details object into a safe WorkOrder (wonum never undefined)
 * ✅ AND NEVER DROP href
 */
function ensureWorkOrder(details: any, wonumFallback: string): WorkOrder {
  const wonum = safeStr(details?.wonum) || wonumFallback;

  return {
    wonum,
    barcode: safeStr(details?.barcode) || wonum,

    href: safeStr(details?.href) || undefined, // ✅ keep WO href

    description: safeStr(details?.description) || '',
    details: safeStr(details?.details) || '',

    location: safeStr(details?.location) || '',
    locationDescription: safeStr(details?.locationDescription) || safeStr(details?.location) || '',

    asset: safeStr(details?.asset) || safeStr(details?.assetnum) || '',
    assetDescription: safeStr(details?.assetDescription) || safeStr(details?.asset?.description) || '',

    status: safeStr(details?.status) || '',

    scheduledStart: details?.scheduledStart ?? details?.scheduledstart ?? null,
    scheduledFinish: details?.scheduledFinish ?? details?.scheduledfinish ?? null,

    priority: Number(details?.priority ?? 0),
    isDynamic: Boolean(details?.isDynamic ?? false),
    dynamicJobPlanApplied: Boolean(details?.dynamicJobPlanApplied ?? false),

    site: safeStr(details?.site) || safeStr(details?.siteid) || '',
    siteid: details?.siteid ?? undefined,
    workorderid: details?.workorderid ?? undefined,
    ishistory: details?.ishistory ?? undefined,

    completed: Boolean(details?.completed ?? false),
    isUrgent: Boolean(details?.isUrgent ?? Number(details?.priority) === 1),
    cout: Number(details?.cout ?? 0),

    activities: Array.isArray(details?.activities) ? details.activities : [],
    labor: Array.isArray(details?.labor) ? details.labor : [],
    wplabor: Array.isArray(details?.wplabor) ? details.wplabor : [],
    materials: Array.isArray(details?.materials) ? details.materials : [],
    docLinks: Array.isArray(details?.docLinks) ? details.docLinks : [],

    wplabor_collectionref: details?.wplabor_collectionref,

    actualStart: details?.actualStart ?? null,
    actualFinish: details?.actualFinish ?? null,
    parentWo: details?.parentWo,
    failureClass: details?.failureClass,
    problemCode: details?.problemCode,
    workType: details?.workType,
    glAccount: details?.glAccount,

    materialStatusStoreroom: details?.materialStatusStoreroom,
    materialStatusDirect: details?.materialStatusDirect,
    materialStatusPackage: details?.materialStatusPackage,
    materialStatusLastUpdated: details?.materialStatusLastUpdated,

    // ✅ defaults so screens never crash
    actualLabor: Array.isArray(details?.actualLabor) ? details.actualLabor : [],
    actualMaterials: Array.isArray(details?.actualMaterials) ? details.actualMaterials : [],
  };
}

// ─── Hook useWorkOrders ─────────────────────────────
export function useWorkOrders() {
  const [data, setData] = useState<WorkOrder[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('Tous');
  const [search, setSearch] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [barcodeFilter, setBarcodeFilter] = useState<string | null>(null);

  const toggleComplete = (wonum: string) => {
    setData((prev) =>
      prev.map((item) => (item.wonum === wonum ? { ...item, completed: !item.completed } : item))
    );
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Non planifié';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Non planifié';
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (barcodeFilter && item.barcode !== barcodeFilter) return false;

      const q = search.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        item.wonum.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.details.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.asset.toLowerCase().includes(q) ||
        item.status.toLowerCase().includes(q) ||
        item.site.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (selectedDate) {
        if (!item.scheduledStart) return false;
        const woDate = new Date(item.scheduledStart);
        if (!isSameDay(woDate, selectedDate)) return false;
      }

      switch (activeFilter) {
        case 'Tous':
          return true;
        case "Aujourd'hui":
          return item.scheduledStart
            ? new Date(item.scheduledStart).toDateString() === new Date().toDateString()
            : false;
        case 'À venir':
          return item.scheduledStart ? new Date(item.scheduledStart) > new Date() : false;
        case 'Urgent':
          return item.isUrgent;
        case 'Terminés':
          return item.completed;
        default:
          return true;
      }
    });
  }, [data, search, activeFilter, barcodeFilter, selectedDate]);

  const todayCount = useMemo(() => {
    const todayStr = new Date().toDateString();
    return data.filter(
      (item) =>
        item.scheduledStart &&
        new Date(item.scheduledStart).toDateString() === todayStr &&
        !item.completed
    ).length;
  }, [data]);

  const fetchWorkOrderDetails = async (wonum: string) => {
    try {
      const username = await AsyncStorage.getItem('@username');
      const password = await AsyncStorage.getItem('@password');
      if (!username || !password) throw new Error('Identifiants non trouvés');

      const detailsRaw = await getWorkOrderDetails(wonum, username, password);
      if (!detailsRaw || typeof detailsRaw !== 'object') return;

      const base = ensureWorkOrder(detailsRaw as any, wonum);

      const woDetails: WorkOrder = {
        ...base,

        /** ✅ FIX: keep href in activities */
        activities: (base.activities ?? []).map((a: any) => ({
          href: getActivityHref(a) || undefined,
          taskid: String(a?.taskid ?? ''),
          description: a?.description ?? '',
          status: a?.status ?? a?.statut ?? '',
          statut: a?.statut ?? a?.status ?? '',
          labhrs: a?.labhrs ?? 0,
        })),

        wplabor: (base.wplabor ?? []).map((l: any) => ({
          taskid: String(l?.taskid ?? ''),
          laborcode: l?.laborcode ?? '',
          description: l?.description ?? '',
          labhrs: parseLabHrs(l?.labhrs),
        })),

        labor: (base.labor ?? []).map((l: any) => ({
          taskid: String(l?.taskid ?? ''),
          laborcode: l?.laborcode ?? '',
          description: l?.description ?? '',
          labhrs: parseLabHrs(l?.labhrs),
        })),

        materials: (base.materials ?? []).map((m: any) => ({
          taskid: String(m?.taskid ?? ''),
          itemnum: m?.itemnum ?? '',
          description: m?.description ?? '',
          quantity: Number(m?.quantity ?? 0),
        })),

        docLinks: (base.docLinks ?? []).map((d: any) => ({
          document: d?.document ?? '',
          description: d?.description ?? '',
          createdate: d?.createdate ?? '',
          urlname: d?.urlname ?? '',
          docinfo: d?.docinfo,
        })),
      };

      setData((prev) => prev.map((item) => (item.wonum === wonum ? { ...item, ...woDetails } : item)));
    } catch (err: any) {
      console.error('Erreur fetch WO:', err.message);
    }
  };

  return {
    data,
    setData,
    filteredData,
    activeFilter,
    setActiveFilter,
    search,
    setSearch,
    selectedDate,
    setSelectedDate,
    barcodeFilter,
    setBarcodeFilter,
    toggleComplete,
    formatDate,
    todayCount,
    fetchWorkOrderDetails,
  };
}