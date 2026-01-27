import { useState, useMemo } from 'react';
import { getWorkOrderDetails } from '../services/workOrdersService';

export type WorkOrder = {
  wonum: string;
  barcode: string;
  description: string;
  details: string;
  location: string;
  asset: string;
  status: string;
  scheduledStart: string;
  priority: number;
  isDynamic: boolean;
  dynamicJobPlanApplied: boolean;
  site: string;
  completed: boolean;
  isUrgent: boolean;
  cout: number;
  materialStatusStoreroom?: string;
  materialStatusDirect?: string;
  materialStatusPackage?: string;
  materialStatusLastUpdated?: string;

  // Additional fields from Maximo details
  actualStart?: string;
  actualFinish?: string;
  parentWo?: string;
  failureClass?: string;
  problemCode?: string;
  workType?: string;
  glAccount?: string;
};

export function useWorkOrders() {
  const [data, setData] = useState<WorkOrder[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('Tous');
  const [search, setSearch] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [barcodeFilter, setBarcodeFilter] = useState<string | null>(null);

  // Toggle completed state
  const toggleComplete = (wonum: string) => {
    setData(prev =>
      prev.map(item =>
        item.wonum === wonum ? { ...item, completed: !item.completed } : item
      )
    );
  };

  // Format date for display
  const formatDate = (dateStr: string | Date | undefined) => {
    // Si vide ou undefined
    if (!dateStr || dateStr === '') {
      return 'Date non planifiée';
    }
    
    try {
      const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
      
      // Vérifier si la date est valide
      if (isNaN(date.getTime())) {
        return 'Date non planifiée';
      }
      
      return date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
    } catch {
      return 'Date non planifiée';
    }
  };

  // Fetch details for a work order from Maximo
  const fetchWorkOrderDetails = async (wonum: string, username: string, password: string) => {
    try {
      const details = await getWorkOrderDetails(wonum, username, password);
      if (details) {
        setData(prev =>
          prev.map(item =>
            item.wonum === wonum ? { ...item, ...details } : item
          )
        );
      }
    } catch (err: any) {
      console.error('Erreur lors de la récupération des détails du Work Order:', err.message);
    }
  };

  // Helper function to check if date is today
  const isToday = (dateStr: string | undefined) => {
    if (!dateStr || dateStr === '') return false;
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return false;
      const today = new Date();
      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    } catch {
      return false;
    }
  };

  // Helper function to check if date is in future
  const isFuture = (dateStr: string | undefined) => {
    if (!dateStr || dateStr === '') return false;
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to compare only dates
      return date > today;
    } catch {
      return false;
    }
  };

  // Helper function to check if dates match
  const datesMatch = (date1: Date, date2: string | undefined) => {
    if (!date2 || date2 === '') return false;
    try {
      const itemDate = new Date(date2);
      if (isNaN(itemDate.getTime())) return false;
      return (
        itemDate.getFullYear() === date1.getFullYear() &&
        itemDate.getMonth() === date1.getMonth() &&
        itemDate.getDate() === date1.getDate()
      );
    } catch {
      return false;
    }
  };

  // Filter work orders based on search, date, barcode, and active filter
  const filteredData = useMemo(() => {
    return data.filter(item => {
      // Barcode search has the highest priority
      if (barcodeFilter) return item.barcode === barcodeFilter;

      // Text search (wonum, description, location, asset, status, site)
      const searchNormalized = search.toLowerCase();
      const matchesSearch =
        searchNormalized === '' ||
        item.wonum.toLowerCase().includes(searchNormalized) ||
        item.description.toLowerCase().includes(searchNormalized) ||
        (item.details && item.details.toLowerCase().includes(searchNormalized)) ||
        item.location.toLowerCase().includes(searchNormalized) ||
        item.asset.toLowerCase().includes(searchNormalized) ||
        item.status.toLowerCase().includes(searchNormalized) ||
        item.site.toLowerCase().includes(searchNormalized);

      if (!matchesSearch) return false;

      // Date filter
      if (selectedDate) {
        if (!datesMatch(selectedDate, item.scheduledStart)) return false;
      }

      // Active filter tabs
      switch (activeFilter) {
        case 'Tous':
          return true;
        case "Aujourd'hui":
          return isToday(item.scheduledStart);
        case 'À venir':
          return isFuture(item.scheduledStart);
        case 'Urgent':
          return item.isUrgent;
        case 'Terminés':
          return item.completed;
        default:
          return true;
      }
    });
  }, [data, search, selectedDate, activeFilter, barcodeFilter]);

  // Count of today's pending tasks
  const todayCount = useMemo(
    () =>
      data.filter(
        item => isToday(item.scheduledStart) && !item.completed
      ).length,
    [data]
  );

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
    toggleComplete,
    formatDate,
    todayCount,
    barcodeFilter,
    setBarcodeFilter,
    fetchWorkOrderDetails,
  };
}