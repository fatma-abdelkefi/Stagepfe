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
  const [search, setSearchValue] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [barcodeFilter, setBarcodeFilter] = useState<string | null>(null);

  const formatDate = useCallback((dateString: string | null | undefined) => {
  try {
    if (!dateString) return 'Non planifié';

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return String(dateString);
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return String(dateString || 'Non planifié');
  }
}, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('AUTH WORK ORDERS:', {
        username,
        hasPassword: !!password,
      });

      if (!username || !password) {
        setError('Veuillez vous reconnecter.');
        await clearSession();
        return;
      }

      const workOrders = await getWorkOrders(username, password);

      console.log('WORK ORDERS RESULT:', workOrders);

      if (!Array.isArray(workOrders)) {
        console.log('Réponse API invalide:', workOrders);
        setData([]);
        setError('Réponse invalide du serveur.');
        return;
      }

      setData(workOrders);
    } catch (err: any) {
      console.log('===== ERREUR WORK ORDERS =====');
      console.log('err:', err);
      console.log('message:', err?.message);
      console.log('status:', err?.response?.status);
      console.log('data:', err?.response?.data);
      console.log('url:', err?.config?.url);
      console.log('method:', err?.config?.method);

      const status = err?.response?.status;

      if (status === 401) {
        setError('Session expirée. Veuillez vous reconnecter.');
        await clearSession();
        return;
      }

      if (status === 403) {
        setError(
          "Vous n'avez pas l'autorisation d'accéder aux ordres de travail.",
        );
        return;
      }

      if (status === 404) {
        setError("L'endpoint des ordres de travail est introuvable.");
        return;
      }

      if (status >= 500) {
        setError('Erreur serveur. Veuillez réessayer plus tard.');
        return;
      }

      if (err?.message === 'Network Error') {
        setError('Erreur réseau : impossible de contacter le serveur.');
        return;
      }

      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          'Erreur lors du chargement des ordres de travail',
      );
    } finally {
      setLoading(false);
    }
  }, [username, password, clearSession]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const setSearch = useCallback((value: string) => {
    setSearchValue(value);

    const cleanValue = String(value || '').trim();

    if (cleanValue) {
      // Important : quand on recherche, on enlève les filtres qui peuvent cacher le WO
      setActiveFilter('Tous');
      setSelectedDate(null);
      setBarcodeFilter(null);
    }
  }, []);

  const todayCount = useMemo(() => {
    const today = new Date();

    return data.filter(item => {
      if (!item.scheduledStart) return false;

      const d = new Date(item.scheduledStart);

      if (Number.isNaN(d.getTime())) return false;

      return (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    }).length;
  }, [data]);

  const filteredData = useMemo(() => {
    let result = [...data];

    const cleanSearch = search.trim().toLowerCase();

    /**
     * Recherche prioritaire.
     * Quand search n'est pas vide, on cherche seulement par :
     * - wonum
     * - description
     *
     * On ne filtre pas par date, barcode, Aujourd'hui, À venir, Urgent, etc.
     */
    if (cleanSearch) {
      return result.filter(item => {
        const wonum = String(item.wonum || '').toLowerCase();
        const description = String(item.description || '').toLowerCase();

        return wonum.includes(cleanSearch) || description.includes(cleanSearch);
      });
    }

    if (barcodeFilter?.trim()) {
      const q = barcodeFilter.trim().toLowerCase();

      result = result.filter(item =>
        String(item.barcode || '').toLowerCase().includes(q),
      );
    }

    if (selectedDate) {
      result = result.filter(item => {
        if (!item.scheduledStart) return false;

        const d = new Date(item.scheduledStart);

        if (Number.isNaN(d.getTime())) return false;

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

          if (Number.isNaN(d.getTime())) return false;

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

          const d = new Date(item.scheduledStart);

          if (Number.isNaN(d.getTime())) return false;

          return d > now;
        });

        break;
      }

      case 'Urgent':
        result = result.filter(item => !!item.isUrgent);
        break;

      case 'Terminés':
        result = result.filter(item => !!item.completed);
        break;

      default:
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