import { useState, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWorkOrderDetails } from '../services/workOrderDetailsService';

// ─── Types ───────────────────────────────────────────
export type ActivityItem = { taskid: string; description?: string; status?: string; labhrs?: number };
export type LaborItem = { taskid: string; laborcode?: string; description?: string; labhrs?: number };
export type MaterialItem = { taskid: string; itemnum?: string; description?: string; quantity?: number };
export type DocLinkItem = { document?: string; description?: string; createdate?: string; urlname?: string };

export type WPLaborItem = {
  taskid: string;
  laborcode?: string;
  description?: string;
  labhrs?: number;
};

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
  // dates
  scheduledStart: string | null;
  scheduledFinish?: string | null;

  priority: number;
  isDynamic: boolean;
  dynamicJobPlanApplied: boolean;

  // ✅ You used "site" historically in your UI
  site: string;

  // ✅ Add Maximo keys needed by AddMaterial / errors
  siteid?: string;        // Maximo field
  workorderid?: number;   // Maximo field
  ishistory?: boolean;    // Maximo field

  completed: boolean;
  isUrgent: boolean;
  cout: number;

  activities?: ActivityItem[];
  labor?: LaborItem[];
  wplabor?: WPLaborItem[];
  materials?: MaterialItem[];
  docLinks?: DocLinkItem[];
  wplabor_collectionref?: string;

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

// ─── Helper pour convertir labhrs ─────────────────────
export const parseLabHrs = (val: string | number | undefined): number => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const [h, m] = val.split(':').map(Number);
  return h + (m ? m / 60 : 0);
};
const isSameDay = (d1: Date, d2: Date) => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

// ─── Hook useWorkOrders ─────────────────────────────
export function useWorkOrders() {
  const [data, setData] = useState<WorkOrder[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('Tous');
  const [search, setSearch] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [barcodeFilter, setBarcodeFilter] = useState<string | null>(null);

  const toggleComplete = (wonum: string) => {
    setData(prev =>
      prev.map(item => (item.wonum === wonum ? { ...item, completed: !item.completed } : item))
    );
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Non planifié';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Non planifié';
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const filteredData = useMemo(() => {
    return data.filter(item => {
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
          if (
            woDate.getFullYear() !== selectedDate.getFullYear() ||
            woDate.getMonth() !== selectedDate.getMonth() ||
            woDate.getDate() !== selectedDate.getDate()
          ) {
            return false;
          }
        }
      switch (activeFilter) {
        case 'Tous': return true;
        case "Aujourd'hui":
          return item.scheduledStart ? new Date(item.scheduledStart).toDateString() === new Date().toDateString() : false;
        case 'À venir':
          return item.scheduledStart ? new Date(item.scheduledStart) > new Date() : false;
        case 'Urgent': return item.isUrgent;
        case 'Terminés': return item.completed;
        default: return true;
      }
    });
  }, [data, search, activeFilter, barcodeFilter, selectedDate]);

  const todayCount = useMemo(() => {
    const todayStr = new Date().toDateString();
    return data.filter(item => item.scheduledStart && new Date(item.scheduledStart).toDateString() === todayStr && !item.completed).length;
  }, [data]);

  
  const fetchWorkOrderDetails = async (wonum: string) => {
    try {
      const username = await AsyncStorage.getItem('@username');
      const password = await AsyncStorage.getItem('@password');
      if (!username || !password) throw new Error('Identifiants non trouvés');

      const details = await getWorkOrderDetails(wonum, username, password);
      if (!details || typeof details !== 'object') return;

      const woDetails: WorkOrder = {
        ...details,
        activities: (details.activities ?? []).map(a => ({
          taskid: String((a as any).taskid ?? ''),
          description: (a as any).description ?? '',
          status: (a as any).status ?? '',
          labhrs: (a as any).labhrs ?? 0,
        })),
        wplabor: (details.wplabor ?? []).map(l => ({
          taskid: String((l as any).taskid ?? ''),
          laborcode: (l as any).laborcode ?? '',
          description: (l as any).description ?? '',
          labhrs: parseLabHrs((l as any).labhrs),
        })),
        labor: (details.labor ?? []).map(l => ({
          taskid: String((l as any).taskid ?? ''),
          laborcode: (l as any).laborcode ?? '',
          description: (l as any).description ?? '',
          labhrs: parseLabHrs((l as any).labhrs),
        })),
        materials: (details.materials ?? []).map(m => ({
          taskid: String((m as any).taskid ?? ''),
          itemnum: (m as any).itemnum ?? '',
          description: (m as any).description ?? '',
          quantity: Number((m as any).quantity ?? 0),
        })),
        docLinks: (details.docLinks ?? []).map(d => ({
          document: (d as any).document ?? '',
          description: (d as any).description ?? '',
          createdate: (d as any).createdate ?? '',
          urlname: (d as any).urlname ?? '',
        })),
      };

      setData(prev => prev.map(item => (item.wonum === wonum ? { ...item, ...woDetails } : item)));
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