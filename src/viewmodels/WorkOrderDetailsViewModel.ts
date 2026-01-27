import { useEffect, useState } from 'react';
import { getWorkOrderDetails } from '../services/workOrdersService';
import { WorkOrder } from '../viewmodels/WorkOrdersViewModel';

export function useWorkOrderDetails(wonum: string) {
  const [workOrder, setWorkOrder] = useState<Partial<WorkOrder> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!wonum) {
      setError('Work Order invalide');
      setLoading(false);
      return;
    }

    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        // 🔐 TODO : Remplacer par AuthContext si disponible
        const username = 'YOUR_MAXIMO_USER';
        const password = 'YOUR_MAXIMO_PASSWORD';

        const data = await getWorkOrderDetails(wonum, username, password);
        if (!data) {
          setError('Aucune donnée trouvée pour ce Work Order');
        }
        setWorkOrder(data);
      } catch (err) {
        console.error(err);
        setError('Erreur lors du chargement du Work Order');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [wonum]);

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (start?: string, end?: string) => {
    if (!start || !end) return '-';
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  return { workOrder, loading, error, formatDate, calculateDuration };
}
