import { useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../../app/providers/AuthProvider';
import {
  addPlannedLaborToWorkOrder,
  resolveLaborWorkOrderIdAndSite,
} from '../services/laborService';

type Params = {
  woKey: string;
  workorderid?: number | string;
  siteid?: string;
};

export function useAddPlannedLaborViewModel({
  woKey,
  workorderid,
  siteid,
}: Params) {
  const navigation = useNavigation<any>();
  const { username, password } = useAuth();

  const [laborCode, setLaborCode] = useState('');
  const [hours, setHours] = useState('1');
  const [quantity, setQuantity] = useState('1');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [successVisible, setSuccessVisible] = useState(false);
  const [successTitle] = useState('Succès');
  const [successMessage] = useState(
    "La main d'œuvre planifiée a été ajoutée avec succès.",
  );

  const [errorVisible, setErrorVisible] = useState(false);
  const [errorTitle] = useState('Erreur');
  const [errorMessage, setErrorMessage] = useState('');

  const showError = (msg: string) => {
    setMessage('');
    setErrorMessage(msg);
    setErrorVisible(true);
  };

  const closeError = () => {
    setErrorVisible(false);
  };

  const canSubmit = useMemo(() => {
    const h = Number(hours);
    const q = Number(quantity);

    return (
      !!laborCode.trim() &&
      !Number.isNaN(h) &&
      h > 0 &&
      !Number.isNaN(q) &&
      q > 0 &&
      !loading
    );
  }, [laborCode, hours, quantity, loading]);

  const addLabor = async () => {
    if (!username || !password) {
      showError('Veuillez vous reconnecter.');
      return;
    }

    if (!woKey.trim()) {
      showError('Numéro OT manquant.');
      return;
    }

    if (!laborCode.trim()) {
      showError("Le code main d'œuvre est obligatoire.");
      return;
    }

    const h = Number(hours);
    if (Number.isNaN(h) || h <= 0) {
      showError('Les heures doivent être supérieures à 0.');
      return;
    }

    const q = Number(quantity);
    if (Number.isNaN(q) || q <= 0) {
      showError('La quantité doit être supérieure à 0.');
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      let finalWorkOrderId: number;
      let finalSiteId: string;

      if (workorderid && siteid) {
        finalWorkOrderId = Number(workorderid);
        finalSiteId = String(siteid);
      } else {
        const resolved = await resolveLaborWorkOrderIdAndSite({
          woKey,
          username,
          password,
        });

        finalWorkOrderId = resolved.workorderid;
        finalSiteId = resolved.siteid;
      }

      await addPlannedLaborToWorkOrder({
        workorderid: finalWorkOrderId,
        siteid: finalSiteId,
        username,
        password,
        labor: {
          laborcode: laborCode.trim(),
          laborhrs: h,
          quantity: q,
        },
      });

      setSuccessVisible(true);
    } catch (e: any) {
      showError(
        String(
          e?.message ??
            "Impossible d'ajouter la main d'œuvre planifiée.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const closeSuccess = () => {
    setSuccessVisible(false);
    navigation.goBack();
  };

  return {
    laborCode,
    setLaborCode,
    hours,
    setHours,
    quantity,
    setQuantity,
    loading,
    message,
    canSubmit,
    addLabor,
    successVisible,
    successTitle,
    successMessage,
    closeSuccess,
    errorVisible,
    errorTitle,
    errorMessage,
    closeError,
  };
}