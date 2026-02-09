// src/viewmodels/AddMaterialViewModel.ts
import { useState } from 'react';
import {
  MaterialInput,
  resolveWorkOrderIdAndSite,
  addMaterialToWorkOrder,
} from '@services/materialService';

export interface AddMaterialOptions {
  woKey: string;
  username: string;
  password: string;
  onSuccess?: () => void;
  onRefresh?: () => void;
}

function isReadOnlyWO(status?: string, ishistory?: boolean) {
  const s = (status || '').toUpperCase();
  if (ishistory === true) return true;
  if (['COMP', 'CLOSE', 'CAN', 'CANC'].includes(s)) return true;
  return false;
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

export const useAddMaterialViewModel = ({
  woKey,
  username,
  password,
  onSuccess,
  onRefresh,
}: AddMaterialOptions) => {
  const [description, setDescription] = useState('');
  const [itemnum, setItemnum] = useState('');
  const [quantity, setQuantity] = useState<number | undefined>();
  const [location, setLocation] = useState('');
  const [barcode, setBarcode] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [successVisible, setSuccessVisible] = useState(false);
  const [successTitle, setSuccessTitle] = useState('Succès');
  const [successMessage, setSuccessMessage] = useState('Matériel ajouté avec succès ✅');

  const openSuccess = (title: string, msg: string) => {
    setSuccessTitle(title);
    setSuccessMessage(msg);
    setSuccessVisible(true);
  };

  const closeSuccess = () => {
    setSuccessVisible(false);
    
  };

  const addMaterial = async () => {
    if (!description || !itemnum || quantity === undefined || !location) {
      setMessage('Veuillez remplir tous les champs requis');
      return;
    }

    if (!username || !password) {
      setMessage('Session invalide. Veuillez vous reconnecter.');
      return;
    }

    setLoading(true);
    setMessage('');

    const material: MaterialInput = {
      description: description.trim(),
      itemnum: itemnum.trim(),
      quantity,
      location: location.trim().toUpperCase(),
      barcode: barcode.trim() || undefined,
    };

    try {
      console.log('==============================');
      console.log('🧾 [VM] addMaterial pressed');
      console.log('🧾 [VM] woKey:', woKey);
      console.log('🧾 [VM] material:', material);

      const resolved = await resolveWorkOrderIdAndSite({
        woKey,
        username,
        password,
      });

      console.log('✅ [VM] Resolved WO:', resolved);

      if (isReadOnlyWO(resolved.status, resolved.ishistory)) {
        const st = resolved.status || 'UNKNOWN';
        const text = `OT non modifiable (status=${st}, history=${
          resolved.ishistory ? 'YES' : 'NO'
        })`;
        setMessage(text);
        return;
      }

      await addMaterialToWorkOrder({
        workorderid: resolved.workorderid,
        username,
        password,
        material,
        siteid: resolved.siteid,
      });

      // ✅ reset inputs
      setDescription('');
      setItemnum('');
      setQuantity(undefined);
      setLocation('');
      setBarcode('');

      onRefresh?.();

      // ✅ show beautiful success modal
      openSuccess('Succès', 'Matériel ajouté avec succès ✅');
    } catch (error: any) {
      console.log('❌ [VM] addMaterial error RAW:', error?.response?.data || error?.message);

      const { reasonCode, errorattrname, message: rawMsg } = extractMaximoError(error);

      // ✅ Friendly message (invalid itemnum)
      if (reasonCode === 'BMXAA4191E' || errorattrname === 'itemnum') {
        const friendly =
          "Numéro d'article invalide.\nVeuillez saisir un numéro d’article valide (ex: 0-0514).";
        setMessage(friendly);
        return;
      }

      const apiMsg =
        rawMsg ||
        error?.response?.data?.Error?.message ||
        error?.response?.data?.error?.message ||
        error?.message ||
        'Erreur inconnue.';

      setMessage(`Erreur lors de l'ajout: ${apiMsg}`);
    } finally {
      setLoading(false);
      console.log('==============================');
    }
  };

  return {
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
    addMaterial,

    successVisible,
    successTitle,
    successMessage,
    closeSuccess,
  };
};