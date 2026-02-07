import { useState } from 'react';
import { addLaborToWorkOrder, Labor } from '../services/laborService';

export interface AddLaborOptions {
  workOrderId: number;
  username: string;
  password: string;
  site: string;
  onSuccess?: () => void;
  onRefresh?: () => void;
}

export const useAddLaborViewModel = ({
  workOrderId,
  username,
  password,
  site,
  onSuccess,
  onRefresh,
}: AddLaborOptions) => {
  const [laborCode, setLaborCode] = useState('');
  const [hours, setHours] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const addLabor = async () => {
    if (!laborCode.trim() || hours === undefined || !site) {
      setMessage('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    setMessage('');

    const payload: Labor = {
      laborcode: laborCode.trim(),
      laborhrs: hours,
      wonum: workOrderId.toString(),
      siteid: site,
    };

    try {
      await addLaborToWorkOrder(payload, username, password);

      setMessage('Labor ajouté avec succès!');
      setLaborCode('');
      setHours(undefined);

      onRefresh?.();
      onSuccess?.();
    } catch (error: any) {
      setMessage(
        `Erreur lors de l'ajout: ${error?.response?.data?.message || error.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    laborCode,
    setLaborCode,
    hours,
    setHours,
    loading,
    message,
    addLabor,
  };
};
