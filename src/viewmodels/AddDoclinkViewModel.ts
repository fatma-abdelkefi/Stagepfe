import { useState } from 'react';
import { addDoclink, DoclinkInput } from '../services/doclinksService';

export interface AddDoclinkOptions {
  ownerid: number;
  siteid: string;
  username: string;
  password: string;
  onSuccess?: () => void;
  onRefresh?: () => void;
}

function extractMaximoError(error: any) {
  const err =
    error?.response?.data?.Error ||
    error?.response?.data?.error ||
    error?.response?.data;

  return {
    message: err?.message || error?.message || 'Erreur inconnue',
  };
}

export const useAddDoclinkViewModel = ({
  ownerid,
  siteid,
  username,
  password,
  onSuccess,
  onRefresh,
}: AddDoclinkOptions) => {
  const [documentName, setDocumentName] = useState('');
  const [base64Data, setBase64Data] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // ✅ success modal
  const [successVisible, setSuccessVisible] = useState(false);
  const [successTitle, setSuccessTitle] = useState('Succès');
  const [successMessage, setSuccessMessage] = useState(
    'Document ajouté avec succès 📎'
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
    if (!documentName || !base64Data) {
      setMessage('Veuillez fournir un document et son contenu');
      return;
    }

    setLoading(true);
    setMessage('');

    const doclink: DoclinkInput = {
      document: documentName,
      documentdata: base64Data,
      description,
    };

    try {
      await addDoclink({
        ownerid,
        siteid,
        username,
        password,
        doclink,
      });

      setDocumentName('');
      setBase64Data('');
      setDescription('');

      onRefresh?.();
      openSuccess('Succès', 'Document ajouté avec succès 📎');
    } catch (error: any) {
      const { message } = extractMaximoError(error);
      setMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return {
    documentName,
    setDocumentName,
    base64Data,
    setBase64Data,
    description,
    setDescription,
    loading,
    message,
    addDocument,

    successVisible,
    successTitle,
    successMessage,
    closeSuccess,
  };
};
