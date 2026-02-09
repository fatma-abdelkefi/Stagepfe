// src/viewmodels/AddLaborViewModel.ts
import { useState } from 'react';
import { addLaborToWorkOrder, LaborInput } from '../services/laborService';

export interface AddLaborOptions {
  workorderid: number;
  username: string;
  password: string;
  siteid: string;
  onSuccess?: () => void;
  onRefresh?: () => void;
}

function extractMaximoError(error: any): {
  reasonCode?: string;
  errorattrname?: string;
  message?: string;
} {
  const errObj =
    error?.response?.data?.Error ||
    error?.response?.data?.error ||
    error?.response?.data;

  return {
    reasonCode: errObj?.reasonCode,
    errorattrname: errObj?.errorattrname,
    message: errObj?.message || error?.message,
  };
}

export const useAddLaborViewModel = ({
  workorderid,
  username,
  password,
  siteid,
  onSuccess,
  onRefresh,
}: AddLaborOptions) => {
  const [laborCode, setLaborCode] = useState('');
  const [hours, setHours] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // ✅ Success modal state
  const [successVisible, setSuccessVisible] = useState(false);
  const [successTitle, setSuccessTitle] = useState('Succès');
  const [successMessage, setSuccessMessage] = useState('Main d’œuvre ajoutée avec succès ✅');

  const closeSuccess = () => {
    setSuccessVisible(false);
    onSuccess?.(); // ✅ navigate back only when user taps OK (nice UX)
  };

  const openSuccess = (title: string, msg: string) => {
    setSuccessTitle(title);
    setSuccessMessage(msg);
    setSuccessVisible(true);
  };

  const addLabor = async () => {
    if (!laborCode.trim() || hours === undefined || !siteid) {
      setMessage('Veuillez remplir tous les champs requis');
      return;
    }
    if (!username || !password) {
      setMessage('Session invalide. Veuillez vous reconnecter.');
      return;
    }

    setLoading(true);
    setMessage('');

    const labor: LaborInput = {
      laborcode: laborCode.trim().toUpperCase(),
      laborhrs: hours,
      quantity: 1,
    };

    try {
      console.log('==============================');
      console.log('🧾 [VM] addLabor pressed');
      console.log('🧾 [VM] workorderid:', workorderid);
      console.log('🧾 [VM] siteid:', siteid);
      console.log('🧾 [VM] labor:', labor);

      await addLaborToWorkOrder({
        workorderid,
        siteid,
        username,
        password,
        labor,
      });

      // ✅ reset inputs
      setLaborCode('');
      setHours(undefined);

      onRefresh?.();

      // ✅ Show beautiful modal
      openSuccess('Succès', 'Main d’œuvre ajoutée avec succès ✅');
    } catch (error: any) {
      const { reasonCode, errorattrname, message: rawMsg } = extractMaximoError(error);

      // ✅ Friendly message examples (optional)
      if (reasonCode === 'BMXAA1339E' || errorattrname === 'wplaborid') {
        setMessage(
          "Erreur Maximo: clé manquante.\nVérifiez que l’URL et le body utilisent la bonne structure (wplabor)."
        );
      } else {
        const apiMsg =
          rawMsg ||
          error?.response?.data?.Error?.message ||
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          error?.message ||
          "Erreur inconnue.";

        setMessage(`Erreur lors de l'ajout: ${apiMsg}`);
      }
    } finally {
      setLoading(false);
      console.log('==============================');
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

    // ✅ expose modal controls
    successVisible,
    successTitle,
    successMessage,
    closeSuccess,
  };
};