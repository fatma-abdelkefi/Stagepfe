import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import Sound from 'react-native-nitro-sound';

import { useAuth } from '../../../app/providers/AuthProvider';
import { createWorkOrderInMaximo } from '../services/addWorkOrderCreateService';
import {
  analyzeAddWorkOrderNLP,
  transcribeAudio,
} from '../services/nlpApi';

import {
  AddWorkOrderSuggestion,
  PlannedActivity,
  PlannedLabor,
  PlannedMaterial,
} from '../types/addWorkOrder.types';

const emptyWorkOrder: AddWorkOrderSuggestion = {
  description: '',
  long_description: '',
  assetnum: '',
  asset_description: '',
  location: '',
  siteid: '',
  status: 'WAPPR',
  priority: undefined,
  worktype: '',
  reportedby: '',
  scheduled_start: '',
  scheduled_finish: '',
  target_start: '',
  target_finish: '',
  activities: [],
  planned_materials: [],
  planned_labor: [],
  needs_review: true,
  auto_save: false,
};

function safeTrim(value: unknown): string {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function appendText(previous: string, next: string): string {
  const a = safeTrim(previous);
  const b = safeTrim(next);

  if (!a) return b;
  if (!b) return a;

  return `${a} ${b}`;
}

function buildRecordPath(prefix: string) {
  const fileName = `${prefix}_${Date.now()}.m4a`;

  return Platform.OS === 'android'
    ? `/storage/emulated/0/Download/${fileName}`
    : fileName;
}

function extractTranscript(result: any): string {
  if (!result) return '';

  if (typeof result === 'string') {
    return safeTrim(result);
  }

  return safeTrim(
    result.text ||
      result.transcript ||
      result.raw_transcript ||
      result.corrected_transcript ||
      result.cleaned_text ||
      result.raw_text ||
      result.data?.text ||
      result.data?.transcript,
  );
}

function normalizeActivityArray(value: unknown): PlannedActivity[] {
  if (!Array.isArray(value)) return [];

  const result: PlannedActivity[] = [];

  value.forEach(item => {
    if (typeof item === 'string') {
      const description = item.trim();

      if (description) {
        result.push({
          taskid: '',
          description,
          status: 'WAPPR',
          source: 'manual',
        });
      }

      return;
    }

    if (item && typeof item === 'object') {
      const obj = item as any;

      const description = String(
        obj.description || obj.value || '',
      ).trim();

      if (!description) return;

      result.push({
        taskid: String(obj.taskid || '').trim(),
        description,
        status: 'WAPPR',
        source: String(obj.source || '').trim(),
      });
    }
  });

  return result;
}

function normalizeMaterialArray(value: unknown): PlannedMaterial[] {
  if (!Array.isArray(value)) return [];

  const result: PlannedMaterial[] = [];

  value.forEach(item => {
    if (typeof item === 'string') {
      const description = item.trim();

      if (description) {
        result.push({
          itemnum: '',
          description,
          quantity: 1,
          location: '',
          source: 'manual',
        });
      }

      return;
    }

    if (item && typeof item === 'object') {
      const obj = item as any;

      const itemnum = String(obj.itemnum || '').trim();
      const description = String(obj.description || '').trim();

      if (!itemnum && !description) return;

      result.push({
        itemnum,
        description,
        quantity:
          obj.quantity !== undefined && obj.quantity !== null
            ? Number(obj.quantity)
            : 1,
        location: String(obj.location || '').trim(),
        source: String(obj.source || '').trim(),
      });
    }
  });

  return result;
}

function normalizeLaborArray(value: unknown): PlannedLabor[] {
  if (!Array.isArray(value)) return [];

  const result: PlannedLabor[] = [];

  value.forEach(item => {
    if (!item || typeof item !== 'object') return;

    const obj = item as any;
    const laborcode = String(obj.laborcode || obj.craft || '').trim();

    if (!laborcode) return;

    result.push({
      laborcode,
      laborhrs:
        obj.laborhrs !== undefined && obj.laborhrs !== null
          ? Number(obj.laborhrs)
          : obj.hours !== undefined && obj.hours !== null
            ? Number(obj.hours)
            : 1,
      quantity:
        obj.quantity !== undefined && obj.quantity !== null
          ? Number(obj.quantity)
          : 1,
      wplaborid: obj.wplaborid,
      source: String(obj.source || '').trim(),
    });
  });

  return result;
}

function buildManualLongDescription(
  workorder: AddWorkOrderSuggestion,
  details: string,
) {
  const cleanDetails = details.trim();

  if (!cleanDetails) {
    return '';
  }

  const location = workorder.location?.trim();

  if (location) {
    return `${cleanDetails.replace(/\.$/, '')} dans l'emplacement ${location}.`;
  }

  return cleanDetails;
}

export function useAddWorkOrderViewModel() {
  const { username } = useAuth();

  const [workorder, setWorkorder] = useState<AddWorkOrderSuggestion>({
    ...emptyWorkOrder,
    reportedby: username || 'TECHNICIEN',
  });

  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const [recording, setRecording] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [recordedFileUri, setRecordedFileUri] = useState('');
  const [voiceInfo, setVoiceInfo] = useState('');
  const [voiceError, setVoiceError] = useState(false);

  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiRequestText, setAiRequestText] = useState('');
  const [aiRecording, setAiRecording] = useState(false);
  const [aiVoiceLoading, setAiVoiceLoading] = useState(false);
  const [aiRecordedFileUri, setAiRecordedFileUri] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInfo, setAiInfo] = useState('');
  const [aiError, setAiError] = useState(false);

  const [showActivities, setShowActivities] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);
  const [showLabor, setShowLabor] = useState(false);

  const [successVisible, setSuccessVisible] = useState(false);
  const [successTitle] = useState('Succès');
  const [successMessage, setSuccessMessage] = useState(
    "L'ordre de travail est prêt.",
  );

  const [errorVisible, setErrorVisible] = useState(false);
  const [errorTitle] = useState('Erreur');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setWorkorder(prev => ({
      ...prev,
      reportedby: prev.reportedby || username || 'TECHNICIEN',
    }));
  }, [username]);

  useEffect(() => {
    return () => {
      Sound.stopRecorder().catch(() => {});
      Sound.removeRecordBackListener();
    };
  }, []);

  const canSubmit = useMemo(() => {
    return Boolean(workorder.description?.trim());
  }, [workorder.description]);

  const updateField = <K extends keyof AddWorkOrderSuggestion>(
    key: K,
    value: AddWorkOrderSuggestion[K],
  ) => {
    setWorkorder(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setErrorVisible(true);
  };

  const closeError = () => {
    setErrorVisible(false);
  };

  const closeSuccess = () => {
    setSuccessVisible(false);
  };

  const openAiModal = () => {
    setAiModalVisible(true);
    setAiInfo('');
    setAiError(false);
  };

  const closeAiModal = () => {
    if (aiLoading || aiVoiceLoading) return;
    setAiModalVisible(false);
  };

  const applySuggestion = (suggestion: AddWorkOrderSuggestion) => {
    const activities = normalizeActivityArray(suggestion.activities);
    const materials = normalizeMaterialArray(suggestion.planned_materials);
    const labor = normalizeLaborArray(suggestion.planned_labor);

    setWorkorder(prev => ({
      ...prev,
      ...suggestion,

      description: suggestion.description || prev.description || '',
      long_description:
        suggestion.long_description || prev.long_description || '',

      siteid: suggestion.siteid || prev.siteid || '',
      status: suggestion.status || prev.status || 'WAPPR',
      worktype: suggestion.worktype || prev.worktype || '',
      priority:
        suggestion.priority !== undefined && suggestion.priority !== null
          ? Number(suggestion.priority)
          : prev.priority,

      reportedby:
        suggestion.reportedby || prev.reportedby || username || 'TECHNICIEN',

      scheduled_start:
        suggestion.scheduled_start || prev.scheduled_start || '',
      scheduled_finish:
        suggestion.scheduled_finish || prev.scheduled_finish || '',
      target_start: suggestion.target_start || prev.target_start || '',
      target_finish: suggestion.target_finish || prev.target_finish || '',

      activities,
      planned_materials: materials,
      planned_labor: labor,

      needs_review: true,
      auto_save: false,
    }));

    if (suggestion.long_description) {
      setDetails(suggestion.long_description);
    }

    // Afficher automatiquement les propositions générées par l'IA.
     setShowActivities(false);
    setShowMaterials(false);
    setShowLabor(false);
  };

  const toggleActivities = () => {
    setShowActivities(prev => !prev);
  };

  const toggleMaterials = () => {
    setShowMaterials(prev => !prev);
  };

  const toggleLabor = () => {
    setShowLabor(prev => !prev);
  };

  const startRecording = async () => {
    try {
      setVoiceInfo('');
      setVoiceError(false);
      setRecordedFileUri('');

      const path = buildRecordPath('add_wo_details');

      await Sound.startRecorder(path);
      Sound.addRecordBackListener(() => {});

      setRecordedFileUri(path);
      setRecording(true);
      setVoiceInfo('Enregistrement en cours...');
    } catch (error) {
      setRecording(false);
      setVoiceError(true);
      setVoiceInfo(
        error instanceof Error
          ? error.message
          : "Impossible de démarrer l'enregistrement.",
      );
    }
  };

  const stopRecording = async () => {
    try {
      setVoiceLoading(true);
      setVoiceError(false);
      setVoiceInfo('Transcription en cours...');

      const uri = await Sound.stopRecorder();
      Sound.removeRecordBackListener();

      setRecording(false);

      const finalUri = safeTrim(uri) || recordedFileUri;

      if (!finalUri) {
        throw new Error('Aucun fichier audio trouvé.');
      }

      const result = await transcribeAudio(finalUri);
      const transcript = extractTranscript(result);

      if (!transcript) {
        throw new Error('Aucune transcription détectée.');
      }

      const nextDetails = appendText(details, transcript);

      setDetails(nextDetails);

      setWorkorder(prev => ({
        ...prev,
        long_description: buildManualLongDescription(prev, nextDetails),
      }));

      setVoiceInfo(`Transcription ajoutée : ${transcript}`);
      setVoiceError(false);
    } catch (error) {
      setVoiceError(true);
      setVoiceInfo(
        error instanceof Error
          ? error.message
          : 'Erreur pendant la transcription.',
      );
    } finally {
      setVoiceLoading(false);
      setRecording(false);
    }
  };

  const onVoicePress = async () => {
    if (voiceLoading) return;

    if (recording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const startAiRecording = async () => {
    try {
      setAiInfo('');
      setAiError(false);
      setAiRecordedFileUri('');

      const path = buildRecordPath('add_wo_ai');

      await Sound.startRecorder(path);
      Sound.addRecordBackListener(() => {});

      setAiRecordedFileUri(path);
      setAiRecording(true);
      setAiInfo('Enregistrement IA en cours...');
    } catch (error) {
      setAiRecording(false);
      setAiError(true);
      setAiInfo(
        error instanceof Error
          ? error.message
          : "Impossible de démarrer l'enregistrement IA.",
      );
    }
  };

  const stopAiRecording = async () => {
    try {
      setAiVoiceLoading(true);
      setAiError(false);
      setAiInfo('Transcription IA en cours...');

      const uri = await Sound.stopRecorder();
      Sound.removeRecordBackListener();

      setAiRecording(false);

      const finalUri = safeTrim(uri) || aiRecordedFileUri;

      if (!finalUri) {
        throw new Error('Aucun fichier audio IA trouvé.');
      }

      const result = await transcribeAudio(finalUri);
      const transcript = extractTranscript(result);

      if (!transcript) {
        throw new Error('Aucune transcription IA détectée.');
      }

      setAiRequestText(prev => appendText(prev, transcript));
      setAiInfo(`Transcription IA ajoutée : ${transcript}`);
      setAiError(false);
    } catch (error) {
      setAiError(true);
      setAiInfo(
        error instanceof Error
          ? error.message
          : 'Erreur pendant la transcription IA.',
      );
    } finally {
      setAiVoiceLoading(false);
      setAiRecording(false);
    }
  };

  const onAiVoicePress = async () => {
    if (aiVoiceLoading || aiLoading) return;

    if (aiRecording) {
      await stopAiRecording();
    } else {
      await startAiRecording();
    }
  };

  const generateWithAI = async () => {
    if (!aiRequestText.trim()) {
      setAiError(true);
      setAiInfo('Veuillez écrire ou dicter une demande IA.');
      return;
    }

    try {
      setAiLoading(true);
      setAiError(false);
      setAiInfo('');

      const response = await analyzeAddWorkOrderNLP({
        text: aiRequestText,
        context: {
          reportedby: workorder.reportedby || username || 'TECHNICIEN',
          siteid: workorder.siteid || 'BEDFORD',
          assetnum: workorder.assetnum || undefined,
          location: workorder.location || undefined,
          scheduled_start: workorder.scheduled_start || undefined,
          scheduled_finish: workorder.scheduled_finish || undefined,
          target_start: workorder.target_start || undefined,
          target_finish: workorder.target_finish || undefined,
          source: 'text',
        },
      });

      const suggestion = response.workorder;

      if (!suggestion) {
        console.log('ADD WO RAW RESPONSE:', JSON.stringify(response.raw, null, 2));
        setAiError(true);
        setAiInfo(
          response.message ||
            "L'IA n'a pas retourné de Work Order. Vérifiez la réponse backend.",
        );
        return;
      }

      applySuggestion(suggestion);

      setAiInfo('Champs remplis avec succès par IA.');
      setAiError(false);
      setAiModalVisible(false);
    } catch (error) {
      setAiError(true);
      setAiInfo(error instanceof Error ? error.message : 'Erreur IA inconnue.');
    } finally {
      setAiLoading(false);
    }
  };

  const addActivity = () => {
    setShowActivities(true);
    updateField('activities', [
      ...(workorder.activities || []),
      {
        taskid: '',
        description: '',
        status: 'WAPPR',
        source: 'manual',
      },
    ]);
  };

  const updateActivity = <K extends keyof PlannedActivity>(
    index: number,
    key: K,
    value: PlannedActivity[K],
  ) => {
    const next = [...(workorder.activities || [])];

    next[index] = {
      ...next[index],
      [key]: value,
    };

    updateField('activities', next);
  };

  const removeActivity = (index: number) => {
    updateField(
      'activities',
      (workorder.activities || []).filter((_, i) => i !== index),
    );
  };

  const addMaterial = () => {
    setShowMaterials(true);
    updateField('planned_materials', [
      ...(workorder.planned_materials || []),
      {
        itemnum: '',
        description: '',
        quantity: 1,
        location: '',
        source: 'manual',
      },
    ]);
  };

  const updateMaterial = <K extends keyof PlannedMaterial>(
    index: number,
    key: K,
    value: PlannedMaterial[K],
  ) => {
    const next = [...(workorder.planned_materials || [])];

    next[index] = {
      ...next[index],
      [key]: value,
    };

    updateField('planned_materials', next);
  };

  const removeMaterial = (index: number) => {
    updateField(
      'planned_materials',
      (workorder.planned_materials || []).filter((_, i) => i !== index),
    );
  };

  const addLabor = () => {
    setShowLabor(true);
    updateField('planned_labor', [
      ...(workorder.planned_labor || []),
      {
        laborcode: '',
        laborhrs: 1,
        quantity: 1,
        source: 'manual',
      },
    ]);
  };

  const updateLabor = <K extends keyof PlannedLabor>(
    index: number,
    key: K,
    value: PlannedLabor[K],
  ) => {
    const next = [...(workorder.planned_labor || [])];

    next[index] = {
      ...next[index],
      [key]: value,
    };

    updateField('planned_labor', next);
  };

  const removeLabor = (index: number) => {
    updateField(
      'planned_labor',
      (workorder.planned_labor || []).filter((_, i) => i !== index),
    );
  };

  const addWorkOrder = async () => {
  if (!workorder.description?.trim()) {
    showError('La description est obligatoire.');
    return null;
  }

  try {
    setLoading(true);

    const payload: AddWorkOrderSuggestion = {
      ...workorder,
      siteid: workorder.siteid || 'BEDFORD',
      status: workorder.status || 'WAPPR',
      reportedby: workorder.reportedby || username || 'maxadmin',
      activities: workorder.activities || [],
      planned_materials: workorder.planned_materials || [],
      planned_labor: workorder.planned_labor || [],
      needs_review: false,
      auto_save: true,
    };

    const created = await createWorkOrderInMaximo(payload);

    if (!created.success) {
      throw new Error(created.message || 'Création Maximo échouée.');
    }

    return {
    ...payload,
    ...(created.workorder || {}),

    wonum: String(
      created.wonum ||
        created.workorder?.wonum ||
        '',
    ).trim(),

    siteid: String(
      created.siteid ||
        created.workorder?.siteid ||
        payload.siteid ||
        'BEDFORD',
    ).trim(),

    workorderid:
      created.workorderid ||
      created.workorder?.workorderid,

    href:
      created.href ||
      created.workorder?.href,

    scheduled_start:
      created.workorder?.scheduled_start ||
      payload.scheduled_start ||
      '',

    scheduled_finish:
      created.workorder?.scheduled_finish ||
      payload.scheduled_finish ||
      '',

    target_start:
      created.workorder?.target_start ||
      payload.target_start ||
      '',

    target_finish:
      created.workorder?.target_finish ||
      payload.target_finish ||
      '',

    scheduledStart:
      created.workorder?.scheduled_start ||
      payload.scheduled_start ||
      '',

    scheduledFinish:
      created.workorder?.scheduled_finish ||
      payload.scheduled_finish ||
      '',

    isDraft: false,
  };
  } catch (error) {
    showError(
      error instanceof Error
        ? error.message
        : 'Erreur inconnue pendant la création du Work Order.',
    );

    return null;
  } finally {
    setLoading(false);
  }
};

  return {
    workorder,
    details,
    setDetails,
    updateField,

    showActivities,
    showMaterials,
    showLabor,
    toggleActivities,
    toggleMaterials,
    toggleLabor,

    aiModalVisible,
    openAiModal,
    closeAiModal,
    aiRequestText,
    setAiRequestText,
    aiLoading,
    aiInfo,
    aiError,
    aiRecording,
    aiVoiceLoading,
    generateWithAI,
    onAiVoicePress,

    recording,
    voiceLoading,
    voiceInfo,
    voiceError,
    onVoicePress,

    addActivity,
    updateActivity,
    removeActivity,
    addMaterial,
    updateMaterial,
    removeMaterial,
    addLabor,
    updateLabor,
    removeLabor,

    addWorkOrder,
    canSubmit,
    loading,

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