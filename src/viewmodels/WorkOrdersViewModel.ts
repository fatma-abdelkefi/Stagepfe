import { useState, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWorkOrderDetails } from '../services/workOrderDetailsService';

// ─── Types ───────────────────────────────────────────
export type ActivityItem = { taskid: string; description?: string; status?: string };
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
  status: string;
  scheduledStart: string | null;
  scheduledFinish?: string | null;
  priority: number;
  isDynamic: boolean;
  dynamicJobPlanApplied: boolean;
  site: string;
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
  }, [data, search, activeFilter, barcodeFilter]);

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
          taskid: String(a.taskid ?? ''),
          description: a.description ?? '',
          status: a.status ?? '',
        })),
        wplabor: (details.wplabor ?? []).map(l => ({
          taskid: String(l.taskid ?? ''),
          laborcode: l.laborcode ?? '',
          description: l.description ?? '',
          labhrs: parseLabHrs(l.labhrs),
        })),
        labor: (details.labor ?? []).map(l => ({
          taskid: String(l.taskid ?? ''),
          laborcode: l.laborcode ?? '',
          description: l.description ?? '',
          labhrs: parseLabHrs(l.labhrs),
        })),
        materials: (details.materials ?? []).map(m => ({
          taskid: String(m.taskid ?? ''),
          itemnum: m.itemnum ?? '',
          description: m.description ?? '',
          quantity: Number(m.quantity ?? 0),
        })),
        docLinks: (details.docLinks ?? []).map(d => ({
          document: d.document ?? '',
          description: d.description ?? '',
          createdate: d.createdate ?? '',
          urlname: d.urlname ?? '',
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
