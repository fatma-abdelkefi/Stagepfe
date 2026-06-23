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

const MAXIMO_WORKLOG_DESCRIPTION_MAX = 100;

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function getCurrentDateTimeForApi() {
  const d = new Date();

  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(
    d.getDate(),
  )}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:00`;
}

function cleanTranscript(text: string) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/([,.!?;:])([^\s])/g, '$1 $2')
    .replace(/\bControle\b/gi, 'Contrôle')
    .replace(/\bcontrole\b/gi, 'contrôle')
    .replace(/\beffectuée\b/gi, 'effectué')
    .replace(/\bà normal\b/gi, 'anormal')
    .replace(/\ba normal\b/gi, 'anormal')
    .replace(/\bbruit à normal\b/gi, 'bruit anormal')
    .replace(/\bbruit a normal\b/gi, 'bruit anormal')
    .trim();
}

function truncateMaximoDescription(
  text: string,
  maxLen = MAXIMO_WORKLOG_DESCRIPTION_MAX,
) {
  const cleaned = cleanTranscript(text);

  if (cleaned.length <= maxLen) {
    return cleaned;
  }

  return cleaned.slice(0, maxLen).trim();
}

function buildWorkLogSummary(text: string) {
  const cleaned = cleanTranscript(text);

  if (!cleaned) return '';

  const firstSentence = cleaned.split(/[.!?]/)[0]?.trim();

  if (firstSentence && firstSentence.length >= 10) {
    return truncateMaximoDescription(firstSentence);
  }

  return truncateMaximoDescription(cleaned);
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
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
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
  const [selectedType, setSelectedType] = useState<WorkLogType>(
    WORKLOG_TYPES[1],
  );
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

  const descriptionLength = description.length;

  const descriptionTooLong =
    descriptionLength > MAXIMO_WORKLOG_DESCRIPTION_MAX;

  const descriptionLimitMessage = descriptionTooLong
    ? `Le résumé ne doit pas dépasser ${MAXIMO_WORKLOG_DESCRIPTION_MAX} caractères.`
    : '';

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

      console.log('[WORKLOG VOICE] start uri:', uri);

      setRecordedFileUri(String(uri || '').trim());
      setRecording(true);
    } catch (e: any) {
      setRecording(false);
      setVoiceError(true);
      setVoiceInfo("Impossible de démarrer l'enregistrement.");
      showError(e?.message || "Impossible de démarrer l'enregistrement.");
    }
  };

  const stopRecordingAndAnalyze = async () => {
    try {
      setVoiceLoading(true);
      setVoiceError(false);
      setVoiceInfo('');

      const resultUri = await Sound.stopRecorder();

      Sound.removeRecordBackListener();
      setRecording(false);

      console.log('[WORKLOG VOICE] stop resultUri:', resultUri);
      console.log('[WORKLOG VOICE] recordedFileUri:', recordedFileUri);

      const finalUri = String(resultUri || recordedFileUri || '').trim();

      if (!finalUri) {
        setVoiceError(true);
        setVoiceInfo('Fichier audio introuvable.');
        showError('Fichier audio introuvable.');
        return;
      }

      const res = await transcribeAudio(
        finalUri,
        'recording.m4a',
        'audio/mp4',
      );

      console.log('[WORKLOG VOICE] transcription response:', res);

      const rawTranscript =
        res?.corrected_transcript ||
        res?.cleaned_text ||
        res?.transcript ||
        res?.raw_transcript ||
        '';

      const transcriptText = cleanTranscript(String(rawTranscript));

      const payload = res?.payload || {};

      const rawDescription = payload?.description || '';

      const rawLongDescription =
        typeof payload?.description_longdescription === 'string'
          ? payload.description_longdescription
          : payload?.description_longdescription?.ldtext || '';

      const autoDescription = truncateMaximoDescription(
        String(rawDescription || ''),
      );

      const autoLongText = cleanTranscript(String(rawLongDescription || ''));

      setTranscript(transcriptText);

      if (!transcriptText) {
        setVoiceError(true);
        setVoiceInfo('Aucune parole détectée. Veuillez réessayer.');
        return;
      }

      const summary = truncateMaximoDescription(
        autoDescription || buildWorkLogSummary(transcriptText),
      );

      const details = cleanTranscript(autoLongText || transcriptText);

      setDescription(summary);
      setDetailsHtml(textToHtml(details));

      setVoiceError(false);
      setVoiceInfo('La transcription a été effectuée avec succès.');
    } catch (e: any) {
      console.log('[WORKLOG VOICE] error:', e);

      setVoiceError(true);
      setVoiceInfo("Erreur pendant l'analyse vocale.");
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

    if (descriptionTooLong) {
      showError(
        `Le résumé dépasse ${MAXIMO_WORKLOG_DESCRIPTION_MAX} caractères. Veuillez le raccourcir.`,
      );
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
    descriptionLength,
    descriptionTooLong,
    descriptionLimitMessage,
    maxDescriptionLength: MAXIMO_WORKLOG_DESCRIPTION_MAX,

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