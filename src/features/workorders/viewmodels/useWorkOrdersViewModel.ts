import { useMemo, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../app/providers/AuthProvider';
import { getWorkOrders } from '../services/workOrdersService';
import type { WorkOrder } from '../types/workOrder.types';

export function useWorkOrdersViewModel() {
  const { username, password, clearSession } = useAuth();

  const [data, setData] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState('Tous');
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [barcodeFilter, setBarcodeFilter] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!username || !password) {
        setError('Veuillez vous reconnecter.');
        await clearSession();
        return;
      }

      const workOrders = await getWorkOrders(username, password);
      setData(workOrders);
    } catch (err: any) {
      const status = err?.response?.status;

      if (status === 401) {
        setError('Session expirée. Veuillez vous reconnecter.');
        await clearSession();
        return;
      }

      setError('Erreur lors du chargement des ordres de travail');
    } finally {
      setLoading(false);
    }
  }, [username, password, clearSession]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const todayCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    return data.filter(item => {
      if (!item.scheduledStart) return false;
      return item.scheduledStart.slice(0, 10) === today;
    }).length;
  }, [data]);

  const filteredData = useMemo(() => {
    let result = [...data];

    if (barcodeFilter) {
      const q = barcodeFilter.trim().toLowerCase();
      result = result.filter(item => item.barcode?.toLowerCase().includes(q));
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(item =>
        item.wonum.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.asset.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q),
      );
    }

    if (selectedDate) {
      result = result.filter(item => {
        if (!item.scheduledStart) return false;
        const d = new Date(item.scheduledStart);
        return (
          d.getDate() === selectedDate.getDate() &&
          d.getMonth() === selectedDate.getMonth() &&
          d.getFullYear() === selectedDate.getFullYear()
        );
      });
    }

    switch (activeFilter) {
      case "Aujourd'hui": {
        const today = new Date();
        result = result.filter(item => {
          if (!item.scheduledStart) return false;
          const d = new Date(item.scheduledStart);
          return (
            d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear()
          );
        });
        break;
      }

      case 'À venir': {
        const now = new Date();
        result = result.filter(item => {
          if (!item.scheduledStart) return false;
          return new Date(item.scheduledStart) > now;
        });
        break;
      }

      case 'Urgent':
        result = result.filter(item => item.isUrgent);
        break;

      case 'Terminés':
        result = result.filter(item => item.completed);
        break;
    }

    return result;
  }, [data, search, activeFilter, selectedDate, barcodeFilter]);

  return {
    data,
    setData,
    filteredData,
    loading,
    error,
    refetch: fetchData,

    activeFilter,
    setActiveFilter,
    search,
    setSearch,
    selectedDate,
    setSelectedDate,
    barcodeFilter,
    setBarcodeFilter,
    todayCount,
    formatDate,
  };
}