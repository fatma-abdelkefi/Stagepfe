import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import Sound, { RecordBackType } from 'react-native-nitro-sound';

import { useAuth } from '../../../app/providers/AuthProvider';
import { addWorkLog } from '../services/worklogService';
import { transcribeAudio } from '../services/nlpApi';

type WorkLogType = {
  value: string;
  label: string;
};

export const WORKLOG_TYPES: WorkLogType[] = [
  { value: 'APPTNOTE', label: 'Note de rendez-vous' },
  { value: 'CLIENTNOTE', label: 'Note client' },
  { value: 'UPDATE', label: 'Mise à jour' },
  { value: 'WORK', label: 'Travail' },
];

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function getCurrentDateTimeForApi() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(
    d.getHours(),
  )}:${pad2(d.getMinutes())}:00`;
}

function textToHtml(text: string) {
  const safe = String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');

  return `<p>${safe}</p>`;
}

function htmlToPlainText(html: string) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();
}

type Params = {
  wonum?: string;
  worklogCollectionRef?: string;
  woHref?: string;
  mxwoDetailsHref?: string;
  onSuccess?: () => void;
};

export function useWorkLogViewModel(params?: Params) {
  const { username, password, authLoading } = useAuth();

  const wonum = String(params?.wonum || '').trim();

  const modifyworklogUrl = useMemo(
    () =>
      String(
        params?.worklogCollectionRef ||
          params?.woHref ||
          params?.mxwoDetailsHref ||
          '',
      ).trim(),
    [params?.worklogCollectionRef, params?.woHref, params?.mxwoDetailsHref],
  );

  const [createdBy, setCreatedBy] = useState('');
  const [description, setDescription] = useState('');
  const [detailsHtml, setDetailsHtml] = useState('');
  const [selectedType, setSelectedType] = useState<WorkLogType>(WORKLOG_TYPES[1]);
  const [typeOpen, setTypeOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [recording, setRecording] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [recordedFileUri, setRecordedFileUri] = useState('');
  const [transcript, setTranscript] = useState('');
  const [voiceInfo, setVoiceInfo] = useState('');
  const [voiceError, setVoiceError] = useState(false);

  const canSubmit = useMemo(
    () => !!modifyworklogUrl && !!username && !!password,
    [modifyworklogUrl, username, password],
  );

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setErrorVisible(true);
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

      const fileName = `worklog_${Date.now()}.m4a`;
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
      const autoLongText = String(
        payload?.description_longdescription?.ldtext ||
          payload?.description_longdescription ||
          '',
      ).trim();

      setTranscript(transcriptText);

      if (!transcriptText) {
        setVoiceError(true);
        setVoiceInfo('Aucune parole détectée. Veuillez réessayer.');
        return;
      }

      if (autoDescription) {
        setDescription(autoDescription);
      } else if (!description.trim()) {
        setDescription(transcriptText.slice(0, 120));
      }

      if (autoLongText) {
        setDetailsHtml(textToHtml(autoLongText));
      } else {
        setDetailsHtml(textToHtml(transcriptText));
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

  const submit = async () => {
    if (authLoading) return;

    if (!username || !password) {
      showError('Session expirée. Reconnectez-vous.');
      return;
    }

    if (!modifyworklogUrl) {
      showError('URL work log manquante. Retournez et réessayez.');
      return;
    }

    if (!description.trim()) {
      showError('Veuillez saisir le résumé.');
      return;
    }

    setSaving(true);

    try {
      await addWorkLog({
        modifyworklogUrl,
        username,
        password,
        description: description.trim(),
        longText: htmlToPlainText(detailsHtml),
        logtype: selectedType.value,
        createby: createdBy.trim() || undefined,
        createdate: getCurrentDateTimeForApi(),
      });

      setSuccessVisible(true);

      setTimeout(() => {
        setSuccessVisible(false);
        params?.onSuccess?.();
      }, 900);
    } catch (e: any) {
      showError(e?.message || 'Erreur réseau');
    } finally {
      setSaving(false);
    }
  };

  const closeSuccess = () => {
    setSuccessVisible(false);
    params?.onSuccess?.();
  };

  const closeError = () => {
    setErrorVisible(false);
  };

  return {
    wonum,
    modifyworklogUrl,
    canSubmit,

    createdBy,
    setCreatedBy,

    description,
    setDescription,

    detailsHtml,
    setDetailsHtml,

    selectedType,
    setSelectedType,

    typeOpen,
    setTypeOpen,

    saving,
    submit,

    successVisible,
    closeSuccess,

    errorVisible,
    errorMessage,
    closeError,

    recording,
    voiceLoading,
    transcript,
    voiceInfo,
    voiceError,
    onVoicePress,
  };
}