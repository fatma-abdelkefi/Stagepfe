import { useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../../app/providers/AuthProvider';
import { addPlannedMaterialRequest } from '../services/plannedMaterialsService';

type Params = {
  woKey?: string;
  wonum?: string | number;
  workorderid?: string | number;
  siteid?: string;
};

export function useAddPlannedMaterialViewModel(params: Params) {
  const navigation = useNavigation<any>();
  const { username, password } = useAuth();

  const woKey = String(params?.woKey ?? '').trim();
  const wonum = params?.wonum;
  const workorderid = params?.workorderid;
  const siteid = String(params?.siteid ?? '').trim();

  const [description, setDescription] = useState('');
  const [itemnum, setItemnum] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [location, setLocation] = useState('');
  const [barcode, setBarcode] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [successVisible, setSuccessVisible] = useState(false);
  const [successTitle] = useState('Succès');
  const [successMessage] = useState('Le matériel planifié a été ajouté.');

  const [errorVisible, setErrorVisible] = useState(false);
  const [errorTitle] = useState('Erreur');
  const [errorMessage, setErrorMessage] = useState('');

  const showError = (msg: string) => {
    setMessage(msg);
    setErrorMessage(msg);
    setErrorVisible(true);
  };

  const closeError = () => {
    setErrorVisible(false);
  };

  const canSubmit = useMemo(() => {
    const q = Number(quantity || 0);

    return (
      !!String(itemnum).trim() &&
      !!String(location).trim() &&
      !!siteid &&
      !!workorderid &&
      !Number.isNaN(q) &&
      q > 0 &&
      !loading
    );
  }, [itemnum, quantity, location, siteid, workorderid, loading]);

  const addMaterial = async () => {
    if (!workorderid) {
      showError('workorderid manquant.');
      return;
    }

    if (!itemnum.trim()) {
      showError("Le numéro d'article est obligatoire.");
      return;
    }

    const q = Number(quantity || 0);
    if (Number.isNaN(q) || q <= 0) {
      showError('La quantité doit être supérieure à 0.');
      return;
    }

    if (!location.trim()) {
      showError("L'emplacement est obligatoire.");
      return;
    }

    if (!siteid) {
      showError('siteid manquant.');
      return;
    }

    if (!username || !password) {
      showError('Identifiants non trouvés. Veuillez vous reconnecter.');
      return;
    }

    try {
      setLoading(true);
      setMessage('');
      setErrorMessage('');
      setErrorVisible(false);

      await addPlannedMaterialRequest({
        wonum: params.wonum,
        workorderid,
        username,
        password,
        payload: {
          description: description.trim() || 'Sans description',
          itemnum: itemnum.trim(),
          itemqty: q,
          location: location.trim(),
          siteid,
          barcode: barcode.trim() || undefined,
        },
      });

      setSuccessVisible(true);
    } catch (e: any) {
      showError(
        String(e?.message ?? "Impossible d'ajouter le matériel planifié."),
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
    woKey,

    description,
    setDescription,

    itemnum,
    setItemnum,

    quantity,
    setQuantity,

    location,
    setLocation,

    barcode,
    setBarcode,

    loading,
    message,
    canSubmit,
    addMaterial,

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