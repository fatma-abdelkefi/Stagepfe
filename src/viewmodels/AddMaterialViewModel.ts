// src/viewmodels/AddMaterialViewModel.ts
import { useState } from 'react';
import axios from 'axios';

export interface Material {
  description: string;
  quantity: number;
  itemnum: string;
  location: string;
  barcode?: string;
}

export interface AddMaterialOptions {
  workOrderId: number | string;
  username: string;
  password: string;
  onSuccess?: () => void;
  onRefresh?: () => void;
}

export const useAddMaterialViewModel = ({
  workOrderId,
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

  const addMaterial = async () => {
    if (!description || !itemnum || quantity === undefined || !location) {
      setMessage('Veuillez remplir tous les champs requis');
      return;
    }

    setLoading(true);
    setMessage('');

    const payload: Material = {
      description: description.trim(),
      itemnum: itemnum.trim(),
      quantity,
      location: location.trim(),
      barcode: barcode.trim() || undefined,
    };

    try {
      const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        MAXAUTH: `Basic ${btoa(`${username}:${password}`)}`,
        properties: '*',
      };

      console.log('🔹 Headers:', headers);
      console.log('🔹 Payload:', { wpmaterial: [payload] });

      const url = `http://demo2.smartech-tn.com/maximo/oslc/os/SM1122/${workOrderId}/wpmaterial`;

      await axios.post(url, payload, { headers });

      setMessage('Matériel ajouté avec succès');

      // Reset fields
      setDescription('');
      setItemnum('');
      setQuantity(undefined);
      setLocation('');
      setBarcode('');

      onRefresh?.();
      onSuccess?.();
    } catch (error: any) {
      console.error('❌ Material add error:', error.response || error.message);
      setMessage(
        `Erreur lors de l'ajout: ${error?.response?.data?.Error?.message || error.message}`
      );
    } finally {
      setLoading(false);
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
  };
};
