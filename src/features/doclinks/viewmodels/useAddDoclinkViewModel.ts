import { useState } from 'react';
import { addDoclink } from '../services/doclinksService';
import type { DoclinkInput } from '../types/doclink.types';

export interface AddDoclinkOptions {
  ownerid: number;
  siteid: string;
  username: string;
  password: string;
  onSuccess?: () => void;
}

function extractMaximoError(error: any) {
  const err =
    error?.response?.data?.Error ||
    error?.response?.data?.error ||
    error?.response?.data;

  return {
    message:
      err?.message ||
      err?.reason ||
      err?.error ||
      error?.message ||
      'Erreur inconnue',
  };
}

export const useAddDoclinkViewModel = ({
  ownerid,
  siteid,
  username,
  password,
  onSuccess,
}: AddDoclinkOptions) => {
  const [documentName, setDocumentName] = useState('');
  const [base64Data, setBase64Data] = useState('');
  const [localPath, setLocalPath] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [successVisible, setSuccessVisible] = useState(false);
  const [successTitle, setSuccessTitle] = useState('Succès');
  const [successMessage, setSuccessMessage] = useState(
    'Document ajouté avec succès 📎',
  );

  const closeSuccess = () => {
    setSuccessVisible(false);
    onSuccess?.();
  };

  const openSuccess = (title: string, msg: string) => {
    setSuccessTitle(title);
    setSuccessMessage(msg);
    setSuccessVisible(true);
  };

  const addDocument = async () => {
    if (!documentName.trim() || !base64Data.trim()) {
      setMessage('Veuillez fournir un document et son contenu');
      return false;
    }

    if (!username || !password) {
      setMessage('Session invalide. Veuillez vous reconnecter.');
      return false;
    }

    if (!ownerid || !siteid.trim()) {
      setMessage('ownerid ou siteid manquant');
      return false;
    }

    setLoading(true);
    setMessage('');

    const doclink: DoclinkInput = {
      document: documentName.trim(),
      documentdata: base64Data.trim(),
      description: description.trim(),
    };

    try {
      await addDoclink({
        ownerid,
        siteid,
        username,
        password,
        doclink,
      });

      openSuccess('Succès', 'Document ajouté avec succès 📎');
      return true;
    } catch (error: any) {
      const { message } = extractMaximoError(error);
      setMessage(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDocumentName('');
    setBase64Data('');
    setLocalPath('');
    setDescription('');
    setMessage('');
  };

  return {
    documentName,
    setDocumentName,
    base64Data,
    setBase64Data,
    localPath,
    setLocalPath,
    description,
    setDescription,
    loading,
    message,
    setMessage,
    addDocument,
    resetForm,
    successVisible,
    successTitle,
    successMessage,
    closeSuccess,
  };
};