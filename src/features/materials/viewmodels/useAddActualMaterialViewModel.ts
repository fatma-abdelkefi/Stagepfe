import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../../app/providers/AuthProvider';
import type {
  AddActualMaterialPayload,
  AddActualMaterialRouteParams,
} from '../types/material.types';
import { addActualMaterialRequest } from '../services/actualMaterialsService';

type FocusedField = 'itemnum' | 'qty' | 'store' | 'barcode' | null;

export function useAddActualMaterialViewModel(
  routeParams: AddActualMaterialRouteParams,
) {
  const navigation = useNavigation<any>();
  const { username, password } = useAuth();

  const woHref = String(routeParams?.woHref ?? '').trim();
  const siteid = String(routeParams?.siteid ?? '').trim();
  const wonum = routeParams?.wonum;

  const [itemnum, setItemnum] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [storeloc, setStoreloc] = useState('');
  const [barcode, setBarcode] = useState('');
  const [issuetype, setIssuetype] = useState<'ISSUE' | 'RETURN'>('ISSUE');

  const [saving, setSaving] = useState(false);
  const [focused, setFocused] = useState<FocusedField>(null);

  const [successVisible, setSuccessVisible] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setErrorVisible(true);
  };

  const validate = (): AddActualMaterialPayload | null => {
    if (!woHref) {
      showError('Lien OT introuvable (woHref manquant).');
      return null;
    }

    if (!itemnum.trim()) {
      showError('Le code article est obligatoire.');
      return null;
    }

    const q = Number(quantity || 0);
    if (Number.isNaN(q) || q <= 0) {
      showError('La quantité doit être supérieure à 0.');
      return null;
    }

    if (!storeloc.trim()) {
      showError('Le magasin est obligatoire.');
      return null;
    }

    if (!siteid) {
      showError('Identifiant de site manquant.');
      return null;
    }

    return {
      itemnum: itemnum.trim(),
      itemqty: q,
      storeroom: storeloc.trim(),
      issuetype,
      siteid,
      barcode: barcode.trim() || undefined,
    };
  };

  const submit = async () => {
    const payload = validate();
    if (!payload) return;

    if (!username || !password) {
      showError('Identifiants non trouvés. Veuillez vous reconnecter.');
      return;
    }

    try {
      setSaving(true);

      await addActualMaterialRequest({
        woHref,
        wonum,
        username,
        password,
        payload,
      });

      setSuccessVisible(true);
    } catch (e: any) {
      showError(String(e?.message ?? "Impossible d'ajouter le matériel."));
    } finally {
      setSaving(false);
    }
  };

  const closeSuccess = () => {
    setSuccessVisible(false);
    navigation.goBack();
  };

  const closeError = () => {
    setErrorVisible(false);
  };

  return {
    itemnum,
    quantity,
    storeloc,
    barcode,
    issuetype,
    saving,
    focused,
    successVisible,
    errorVisible,
    errorMessage,

    setItemnum,
    setQuantity,
    setStoreloc,
    setBarcode,
    setIssuetype,
    setFocused,

    submit,
    closeSuccess,
    closeError,
  };
}