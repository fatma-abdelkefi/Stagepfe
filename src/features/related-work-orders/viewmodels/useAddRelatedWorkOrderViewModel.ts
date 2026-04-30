import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Sound, { RecordBackType } from 'react-native-nitro-sound';

import { useAuth } from '../../../app/providers/AuthProvider';
import { addRelatedWorkOrderRequest } from '../services/relatedWorkOrdersService';
import { transcribeAudio } from '../services/nlpApi';

import type {
  AddRelatedWorkOrderPayload,
  AddRelatedWorkOrderRouteParams,
} from '../types/relatedWorkOrder.types';

function safeTrim(value: unknown): string {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

export function useAddRelatedWorkOrderViewModel(
  params: AddRelatedWorkOrderRouteParams,
) {
  const navigation = useNavigation<any>();
  const { username, password } = useAuth();

  const wonum = safeTrim(params?.wonum);
  const siteidFromParams = safeTrim(params?.siteid);

  const [description, setDescription] = useState(safeTrim(params?.description));
  const [details, setDetails] = useState('');
  const [assetnum, setAssetnum] = useState(safeTrim(params?.assetnum));
  const [location, setLocation] = useState(safeTrim(params?.location));

  const [siteid] = useState(siteidFromParams);

  const [createdWonum, setCreatedWonum] = useState('');
  const [loading, setLoading] = useState(false);

  const [recording, setRecording] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [recordedFileUri, setRecordedFileUri] = useState('');
  const [transcript, setTranscript] = useState('');
  const [voiceInfo, setVoiceInfo] = useState('');
  const [voiceError, setVoiceError] = useState(false);

  const [successVisible, setSuccessVisible] = useState(false);
  const [successTitle] = useState('Succès');

  const successMessage = createdWonum
    ? `L'ordre de travail lié a été créé avec le numéro OT ${createdWonum}.`
    : "L'ordre de travail lié a été ajouté.";

  const [errorVisible, setErrorVisible] = useState(false);
  const [errorTitle] = useState('Erreur');
  const [errorMessage, setErrorMessage] = useState('');

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setErrorVisible(true);
  };

  const closeError = () => {
    setErrorVisible(false);
  };

  useEffect(() => {
    return () => {
      Sound.stopRecorder().catch(() => {});
      Sound.removeRecordBackListener();
    };
  }, []);

  const startRecording = async () => {
    try {
      setTranscript('');
      setVoiceInfo('');
      setVoiceError(false);
      setRecordedFileUri('');

      const fileName = `related_wo_${Date.now()}.m4a`;

      const path =
        Platform.OS === 'android'
          ? `/storage/emulated/0/Download/${fileName}`
          : fileName;

      Sound.removeRecordBackListener();

      Sound.addRecordBackListener((_e: RecordBackType) => {
        return;
      });

      const uri = await Sound.startRecorder(path);

      setRecordedFileUri(String(uri || '').trim());
      setRecording(true);
    } catch (e: any) {
      setRecording(false);
      showError(e?.message || "Impossible de démarrer l'enregistrement.");
    }
  };

  const stopRecordingAndAnalyze = async () => {
    try {
      setVoiceLoading(true);

      const resultUri = await Sound.stopRecorder();

      Sound.removeRecordBackListener();
      setRecording(false);

      const finalUri = String(resultUri || recordedFileUri || '').trim();

      if (!finalUri) {
        showError('Fichier audio introuvable.');
        return;
      }

      const res = await transcribeAudio(finalUri, 'recording.m4a', 'audio/mp4');

      const transcriptText = String(res?.transcript || '').trim();
      const payload = res?.payload || {};

      const autoDescription = String(payload?.description || '').trim();

      const autoDetails = String(
        payload?.description_longdescription?.ldtext ||
          payload?.description_longdescription ||
          transcriptText ||
          '',
      ).trim();

      setTranscript(transcriptText);

      if (!transcriptText) {
        setVoiceError(true);
        setVoiceInfo('Aucune parole détectée. Veuillez réessayer.');
        return;
      }

      if (autoDescription && !safeTrim(description)) {
        setDescription(autoDescription);
      }

      if (autoDetails) {
        setDetails(autoDetails);
      }

      setVoiceError(false);
      setVoiceInfo('La transcription a été effectuée avec succès.');
    } catch (e: any) {
      setVoiceError(true);
      showError(e?.message || "Erreur pendant l'analyse vocale.");
    } finally {
      setVoiceLoading(false);
    }
  };

  const onVoicePress = async () => {
    if (voiceLoading) return;

    if (!recording) {
      await startRecording();
    } else {
      await stopRecordingAndAnalyze();
    }
  };

  const canSubmit = useMemo(() => {
    return !!wonum && !!safeTrim(description) && !!safeTrim(siteid) && !loading;
  }, [wonum, description, siteid, loading]);

  const addRelatedWorkOrder = async () => {
    if (!wonum) {
      showError("Le Work Order d'origine est introuvable.");
      return;
    }

    if (!safeTrim(description)) {
      showError('La description est obligatoire.');
      return;
    }

    if (!safeTrim(siteid)) {
      showError('Le site est obligatoire.');
      return;
    }

    if (!username || !password) {
      showError('Identifiants non trouvés. Veuillez vous reconnecter.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      setErrorVisible(false);

      const payload: AddRelatedWorkOrderPayload = {
        originWonum: wonum,
        siteid: safeTrim(siteid),
        description: safeTrim(description),
        details: safeTrim(details) || undefined,
        assetnum: safeTrim(assetnum) || undefined,
        location: safeTrim(location) || undefined,
        relation: 'FOLLOWUP',
      };

      const result = await addRelatedWorkOrderRequest({
        username,
        password,
        payload,
      });

      setCreatedWonum(String(result?.wonum ?? ''));
      setSuccessVisible(true);
    } catch (e: any) {
      showError(String(e?.message ?? "Impossible d'ajouter le Work Order lié."));
    } finally {
      setLoading(false);
    }
  };

  const closeSuccess = () => {
    setSuccessVisible(false);

    navigation.replace('WorkOrderDetails', {
      workOrder: {
        wonum,
        siteid,
      },
    });
  };

  return {
    wonum,

    description,
    setDescription,

    details,
    setDetails,

    assetnum,
    setAssetnum,

    location,
    setLocation,

    siteid,

    loading,
    canSubmit,
    addRelatedWorkOrder,

    recording,
    voiceLoading,
    transcript,
    voiceInfo,
    voiceError,
    onVoicePress,

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