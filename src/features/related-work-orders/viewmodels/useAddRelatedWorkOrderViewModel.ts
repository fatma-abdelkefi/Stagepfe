import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Sound, { RecordBackType } from 'react-native-nitro-sound';

import { useAuth } from '../../../app/providers/AuthProvider';
import { addRelatedWorkOrderRequest } from '../services/relatedWorkOrdersService';
import { transcribeAudio } from '../services/nlpApi';
import {
  generateRelatedWorkOrderSmart,
  getRelatedWorkOrderAIResult,
} from '../services/relatedWorkOrderAiService';

import type {
  AddRelatedWorkOrderPayload,
  AddRelatedWorkOrderRouteParams,
  RelatedWorkOrderAIResult,
} from '../types/relatedWorkOrder.types';

import type { CommonChatbotQuestion } from '../../../shared/components/common/CommonChatbotModal';

function safeTrim(value: unknown): string {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function normalizeAiText(value: unknown): string {
  return safeTrim(value)
    .replace(/\s+/g, ' ')
    .replace(/fuite de huile/gi, "fuite d’huile")
    .replace(/fuite d huile/gi, "fuite d’huile")
    .replace(/fuite d'huile/gi, "fuite d’huile")
    .replace(/photoïne/gi, "fuite d’huile")
    .replace(/photoine/gi, "fuite d’huile")
    .replace(/fuit de l'huile/gi, "fuite d’huile")
    .replace(/fuite huile/gi, "fuite d’huile")
    .replace(/bruit normale/gi, 'bruit anormal')
    .replace(/bruit normal/gi, 'bruit anormal')
    .replace(/vibration normale/gi, 'vibration anormale')
    .replace(/vibration normal/gi, 'vibration anormale')
    .replace(/vibre normalement/gi, 'vibre anormalement')
    .replace(/vibre normal/gi, 'vibre anormalement')
    .replace(/vibre normale/gi, 'vibre anormalement')
    .replace(/faune forte vibration/gi, 'une forte vibration')
    .replace(/faune vibration/gi, 'une vibration')
    .replace(/moteur principale/gi, 'moteur principal')
    .replace(/moteur principale convoyeur/gi, 'moteur principal convoyeur')
    .replace(/pompe hydraulique/gi, 'pompe hydraulique')
    .replace(/pompe hydrolique/gi, 'pompe hydraulique')
    .replace(/équipement concerné/gi, "l’équipement concerné")
    .replace(/equipement concerné/gi, "l’équipement concerné")
    .replace(/équipement concerner/gi, "l’équipement concerné")
    .replace(/equipement concerner/gi, "l’équipement concerné")
    .replace(/équiper$/gi, 'équipement')
    .trim();
}
function capitalizeFirst(value: string): string {
  const text = safeTrim(value);

  if (!text) {
    return '';
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function buildProfessionalDescription(requestText: string, related: any): string {
  const text = normalizeAiText(
    `${requestText} ${related?.description ?? ''} ${
      related?.suggested_description ?? ''
    }`,
  ).toLowerCase();

  if ((text.includes('fuite') || text.includes('huile')) && text.includes('moteur')) {
    return "Inspection fuite d’huile moteur";
  }

  if ((text.includes('fuite') || text.includes('huile')) && text.includes('pompe')) {
    return "Inspection fuite d’huile pompe";
  }

  if (text.includes('vibration') && text.includes('bruit')) {
    return 'Inspection vibration et bruit anormal';
  }

  if (text.includes('vibration')) {
    return 'Inspection vibration anormale équipement';
  }

  if (text.includes('bruit')) {
    return 'Diagnostic bruit anormal équipement';
  }

  if (text.includes('fuite') || text.includes('huile')) {
    return "Inspection fuite d’huile équipement";
  }

  return 'Inspection complémentaire équipement';
}

function buildProfessionalDetails(
  requestText: string,
  related: any,
  assetLabel: string,
): string {
  const text = normalizeAiText(
    `${requestText} ${related?.details ?? ''} ${
      related?.suggested_details ?? ''
    }`,
  ).toLowerCase();

  const observations: string[] = [];

  if (text.includes('fuite') || text.includes('huile')) {
    observations.push("fuite d’huile");
  }

  if (text.includes('vibration')) {
    observations.push('vibration anormale');
  }

  if (text.includes('bruit')) {
    observations.push('bruit anormal');
  }

  if (text.includes('surchauffe')) {
    observations.push('surchauffe possible');
  }

  const observationText =
    observations.length > 0
      ? capitalizeFirst(
          `${observations.join(', ')} constatée${
            observations.length > 1 ? 's' : ''
          }`,
        )
      : 'Anomalie complémentaire constatée';

  const target = safeTrim(assetLabel) || "l’équipement concerné";

  return (
    `${observationText} sur ${target}.\n` +
    'Inspection nécessaire pour identifier la cause racine, vérifier l’état mécanique et planifier l’action corrective.'
  );
}

function getCandidateByAssetnum(related: any, value: string): any | null {
  const assetnum = safeTrim(value);

  if (!assetnum) {
    return null;
  }

  const candidates =
    related?.candidates ||
    related?.asset_candidates ||
    related?.nlp_result?.candidates ||
    [];

  if (!Array.isArray(candidates)) {
    return null;
  }

  return (
    candidates.find(
      item => safeTrim(item?.assetnum).toUpperCase() === assetnum.toUpperCase(),
    ) || null
  );
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
  const [assetnum, setAssetnum] = useState(safeTrim((params as any)?.assetnum));
  const [assetDescription, setAssetDescription] = useState(
    safeTrim((params as any)?.asset_description),
  );
  const [location, setLocation] = useState(safeTrim((params as any)?.location));
  const [siteid] = useState(siteidFromParams);

  const [createdWonum, setCreatedWonum] = useState('');
  const [loading, setLoading] = useState(false);

  const [recording, setRecording] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [recordedFileUri, setRecordedFileUri] = useState('');
  const [transcript, setTranscript] = useState('');
  const [voiceInfo, setVoiceInfo] = useState('');
  const [voiceError, setVoiceError] = useState(false);

  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiRequestText, setAiRequestText] = useState('');
  const [aiRecording, setAiRecording] = useState(false);
  const [aiVoiceLoading, setAiVoiceLoading] = useState(false);
  const [aiRecordedFileUri, setAiRecordedFileUri] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<RelatedWorkOrderAIResult | null>(
    null,
  );
  const [aiInfo, setAiInfo] = useState('');
  const [aiError, setAiError] = useState(false);

  const [chatbotVisible, setChatbotVisible] = useState(false);
  const [chatbotQuestion, setChatbotQuestion] =
    useState<CommonChatbotQuestion | null>(null);
  const [chatbotAnswer, setChatbotAnswer] = useState('');
  const [pendingAIResult, setPendingAIResult] =
    useState<RelatedWorkOrderAIResult | null>(null);

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

  const buildRecordPath = (prefix: string) => {
    const fileName = `${prefix}_${Date.now()}.m4a`;

    return Platform.OS === 'android'
      ? `/storage/emulated/0/Download/${fileName}`
      : fileName;
  };

  const startRecording = async () => {
    try {
      setTranscript('');
      setVoiceInfo('');
      setVoiceError(false);
      setRecordedFileUri('');

      const path = buildRecordPath('related_wo_details');

      Sound.removeRecordBackListener();
      Sound.addRecordBackListener((_e: RecordBackType) => {});

      const uri = await Sound.startRecorder(path);

      setRecordedFileUri(String(uri || '').trim());
      setRecording(true);
    } catch (e: any) {
      setRecording(false);
      showError(e?.message || "Impossible de démarrer l'enregistrement.");
    }
  };

  const stopRecordingAndTranscribeDetails = async () => {
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

      setTranscript(transcriptText);

      if (!transcriptText) {
        setVoiceError(true);
        setVoiceInfo('Aucune parole détectée. Veuillez réessayer.');
        return;
      }

      setDetails(transcriptText);
      setVoiceError(false);
      setVoiceInfo('Détails remplis par transcription vocale.');
    } catch (e: any) {
      setVoiceError(true);
      showError(e?.message || "Erreur pendant l'analyse vocale.");
    } finally {
      setVoiceLoading(false);
    }
  };

  const onVoicePress = async () => {
    if (voiceLoading || aiVoiceLoading || aiLoading) return;

    if (!recording) {
      await startRecording();
    } else {
      await stopRecordingAndTranscribeDetails();
    }
  };

  const openAiModal = () => {
    setAiModalVisible(true);
    setAiRequestText('');
    setAiResult(null);
    setAiInfo('');
    setAiError(false);
  };

  const closeAiModal = async () => {
    if (aiRecording) {
      await Sound.stopRecorder().catch(() => {});
      Sound.removeRecordBackListener();
      setAiRecording(false);
    }

    setAiModalVisible(false);
  };

  const closeChatbot = () => {
    setChatbotVisible(false);
    setChatbotQuestion(null);
    setChatbotAnswer('');
  };

  const openAssetClarification = (related: RelatedWorkOrderAIResult | null) => {
  setPendingAIResult(related);

  const originalAsset = safeTrim((params as any)?.assetnum);
  const originalAssetDescription = safeTrim((params as any)?.asset_description);

  const candidates = related?.candidates || [];

  const candidateOptions = candidates
    .filter(item => safeTrim(item?.assetnum))
    .slice(0, 5)
    .map(item => ({
      label: `${safeTrim(item.assetnum)}${
        item.description ? ` - ${safeTrim(item.description)}` : ''
      }`,
      value: `candidate:${safeTrim(item.assetnum)}`,
      icon: 'cpu',
    }));

  const options = [
    ...(originalAsset
      ? [
          {
            label: originalAssetDescription
              ? `Même asset que le WO d'origine : ${originalAsset} - ${originalAssetDescription}`
              : `Même asset que le WO d'origine : ${originalAsset}`,
            value: 'same_asset',
            icon: 'check-circle',
          },
        ]
      : []),
    ...candidateOptions,
    {
      label: 'Je vais saisir manuellement',
      value: 'manual_asset',
      icon: 'edit-3',
    },
    {
      label: 'Je ne sais pas',
      value: 'unknown_asset',
      icon: 'help-circle',
    },
  ];

  setChatbotQuestion({
    title: 'Asset à confirmer',
    message: 'Quel asset voulez-vous utiliser pour ce Work Order lié ?',
    options,
  });

  setChatbotAnswer('');
  setChatbotVisible(true);
};
  const openLocationClarification = () => {
    setChatbotQuestion({
      title: 'Location manquante',
      message: 'Quelle est la location de la panne ?',
      inputPlaceholder: 'Exemple : SHIPPING, BR430, ZONE-A...',
    });

    setChatbotAnswer('');
    setChatbotVisible(true);
  };

  const openClarificationIfNeeded = (
    related: RelatedWorkOrderAIResult | null,
  ) => {
    const aiAsset = safeTrim(related?.assetnum);
    const aiLocation = safeTrim(related?.location);
    const assetReliable = related?.asset_match_reliable === true;

    if (!aiAsset || !assetReliable) {
      openAssetClarification(related);
      return true;
    }

    if (!aiLocation && !safeTrim(location)) {
      openLocationClarification();
      return true;
    }

    return false;
  };

  const submitChatbotAnswer = (answerValue?: string) => {
    const value = safeTrim(answerValue || chatbotAnswer);

    if (!chatbotQuestion) return;

    if (value === 'same_asset') {
      const originalAsset = safeTrim((params as any)?.assetnum);
      const originalAssetDescription = safeTrim(
        (params as any)?.asset_description,
      );
      const originalLocation = safeTrim((params as any)?.location);

      if (!originalAsset) {
        setAssetnum('');
        setAssetDescription('');

        setAiError(false);
        setAiInfo(
          "Le Work Order d'origine n'a pas d'asset. Veuillez sélectionner ou saisir l’asset.",
        );

        closeChatbot();
        return;
      }

      setAssetnum(originalAsset);

      if (originalAssetDescription) {
        setAssetDescription(originalAssetDescription);
      }

      if (originalLocation) {
        setLocation(originalLocation);
      }

      setAiError(false);
      setAiInfo("Asset rempli avec l'asset du Work Order d'origine.");
      closeChatbot();
      return;
    }

    if (value === 'manual_asset') {
      setAssetnum('');
      setAssetDescription('');

      setAiError(false);
      setAiInfo('Saisissez le code asset manuellement.');
      closeChatbot();
      return;
    }

    if (value === 'unknown_asset') {
      setAssetnum('');
      setAssetDescription('');

      setAiError(false);
      setAiInfo(
        'Asset non confirmé. Veuillez vérifier ou saisir l’asset avant l’enregistrement.',
      );

      closeChatbot();
      return;
    }

    if (value.startsWith('candidate:')) {
      const candidateAssetnum = safeTrim(value.replace('candidate:', ''));
      const candidate = getCandidateByAssetnum(pendingAIResult, candidateAssetnum);

      setAssetnum(candidateAssetnum);

      if (candidate?.description) {
        setAssetDescription(safeTrim(candidate.description));
      } else {
        setAssetDescription('');
      }

      if (candidate?.location) {
        setLocation(safeTrim(candidate.location));
      }

      setAiError(false);
      setAiInfo('Asset rempli depuis le candidat sélectionné.');
      closeChatbot();
      return;
    }

    if (chatbotQuestion.title === 'Location manquante') {
      setLocation(value);
      setAiError(false);
      setAiInfo('Location remplie depuis votre réponse.');
      closeChatbot();
      return;
    }

    setAiError(false);
    closeChatbot();
  };

  const buildAIContext = (requestText: string) => {
    return {
      description: safeTrim(params?.description) || safeTrim(description),
      assetnum: safeTrim((params as any)?.assetnum) || safeTrim(assetnum),
      asset_description:
        safeTrim((params as any)?.asset_description) ||
        safeTrim(assetDescription),
      location: safeTrim((params as any)?.location) || safeTrim(location),
      worktype: safeTrim((params as any)?.worktype),
      priority: (params as any)?.priority,
      worklog: requestText,

      related_assets:
        (params as any)?.related_assets ||
        (params as any)?.relatedAssets ||
        (params as any)?.assets ||
        [],

      failure: {
        problem: safeTrim((params as any)?.failure?.problem),
        cause: safeTrim((params as any)?.failure?.cause),
        remedy: safeTrim((params as any)?.failure?.remedy),
      },
    };
  };

  const applyAIResult = (
    requestText: string,
    related: RelatedWorkOrderAIResult | null,
  ) => {
    if (!related) {
      setAiError(true);
      setAiInfo('Aucune recommandation NLP reçue.');
      return;
    }

    const relatedAny = related as any;
    setAiResult(related);

    if (!relatedAny.needed) {
      setAiError(false);
      setAiInfo("NLP : aucun Work Order lié n'est nécessaire.");
      return;
    }

    const assetReliable = relatedAny.asset_match_reliable === true;

    const aiAsset = safeTrim(relatedAny.assetnum);
    const aiLocation = safeTrim(relatedAny.location);

    const aiAssetDescription =
      safeTrim(relatedAny.asset_description) ||
      safeTrim(relatedAny.suggested_asset_description) ||
      safeTrim(relatedAny.nlp_result?.asset_description);

    const nextAsset = assetReliable ? aiAsset : '';
    const nextLocation = assetReliable ? aiLocation : '';
    const nextAssetDescription = assetReliable ? aiAssetDescription : '';

    const assetLabel =
      nextAsset && nextAssetDescription
        ? `${nextAsset} - ${nextAssetDescription}`
        : nextAsset || "l’équipement concerné";

    const rawDescription =
      safeTrim(relatedAny.description) ||
      safeTrim(relatedAny.suggested_description);

    const finalDescription =
      rawDescription && rawDescription.length <= 60
        ? normalizeAiText(rawDescription)
        : buildProfessionalDescription(requestText, relatedAny);

    const rawDetails =
      safeTrim(relatedAny.details) || safeTrim(relatedAny.suggested_details);

    const finalDetails =
      rawDetails && rawDetails.length <= 300 && !rawDetails.includes('Raison IA')
        ? capitalizeFirst(normalizeAiText(rawDetails))
        : buildProfessionalDetails(requestText, relatedAny, assetLabel);

    setDescription(finalDescription || 'Inspection complémentaire équipement');
    setDetails(finalDetails);

    setAssetnum(nextAsset);

    if (nextAssetDescription) {
      setAssetDescription(nextAssetDescription);
    } else {
      setAssetDescription('');
    }

    if (nextLocation) {
      setLocation(nextLocation);
    }

    const openedClarification = openClarificationIfNeeded(related);

    if (openedClarification) {
      setAiError(false);
      setAiInfo('Des informations supplémentaires sont nécessaires.');
      return;
    }

    setAiError(false);

    if (!nextAsset && !nextLocation) {
      setAiInfo(
        'NLP : description et détails remplis. Asset et location à sélectionner.',
      );
    } else if (!nextAsset) {
      setAiInfo('NLP : champs remplis. Asset à sélectionner.');
    } else {
      setAiInfo('NLP : champs remplis automatiquement.');
    }
  };

  const generateWithAI = async (requestText?: string) => {
    const cleanRequest = safeTrim(requestText || aiRequestText);

    if (!cleanRequest) {
      setAiError(true);
      setAiInfo('Veuillez saisir ou dicter une demande.');
      return;
    }

    try {
      setAiLoading(true);
      setAiResult(null);
      setAiInfo('');
      setAiError(false);

      const data = await generateRelatedWorkOrderSmart({
        request: cleanRequest,
        context: buildAIContext(cleanRequest),
      });

      const related = getRelatedWorkOrderAIResult(data);

      applyAIResult(cleanRequest, related);

      if (related?.needed) {
        setAiModalVisible(false);
      }
    } catch (e: any) {
      setAiError(true);
      setAiInfo(e?.message || 'Erreur pendant la génération NLP.');
    } finally {
      setAiLoading(false);
    }
  };

  const startAiRecording = async () => {
    try {
      setAiRequestText('');
      setAiInfo('');
      setAiError(false);
      setAiRecordedFileUri('');

      const path = buildRecordPath('related_wo_ai');

      Sound.removeRecordBackListener();
      Sound.addRecordBackListener((_e: RecordBackType) => {});

      const uri = await Sound.startRecorder(path);

      setAiRecordedFileUri(String(uri || '').trim());
      setAiRecording(true);
    } catch (e: any) {
      setAiRecording(false);
      setAiError(true);
      setAiInfo(e?.message || "Impossible de démarrer l'enregistrement.");
    }
  };

  const stopAiRecordingAndGenerate = async () => {
    try {
      setAiVoiceLoading(true);

      const resultUri = await Sound.stopRecorder();

      Sound.removeRecordBackListener();
      setAiRecording(false);

      const finalUri = String(resultUri || aiRecordedFileUri || '').trim();

      if (!finalUri) {
        setAiError(true);
        setAiInfo('Fichier audio introuvable.');
        return;
      }

      const res = await transcribeAudio(finalUri, 'ai_request.m4a', 'audio/mp4');
      const transcriptText = String(res?.transcript || '').trim();

      if (!transcriptText) {
        setAiError(true);
        setAiInfo('Aucune parole détectée.');
        return;
      }

      setAiRequestText(transcriptText);
      setAiError(false);
      setAiInfo('Demande transcrite. Analyse en cours...');

      await generateWithAI(transcriptText);
    } catch (e: any) {
      setAiError(true);
      setAiInfo(e?.message || "Erreur pendant l'analyse vocale.");
    } finally {
      setAiVoiceLoading(false);
    }
  };

  const onAiVoicePress = async () => {
    if (aiVoiceLoading || aiLoading || voiceLoading) return;

    if (!aiRecording) {
      await startAiRecording();
    } else {
      await stopAiRecordingAndGenerate();
    }
  };

  const canSubmit = useMemo(() => {
    return (
      !!wonum &&
      !!safeTrim(description) &&
      !!safeTrim(siteid) &&
      !loading &&
      !aiLoading &&
      !voiceLoading &&
      !aiVoiceLoading
    );
  }, [
    wonum,
    description,
    siteid,
    loading,
    aiLoading,
    voiceLoading,
    aiVoiceLoading,
  ]);

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
    assetDescription,
    setAssetDescription,
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

    aiModalVisible,
    aiRequestText,
    setAiRequestText,
    aiRecording,
    aiVoiceLoading,
    aiLoading,
    aiResult,
    aiInfo,
    aiError,
    openAiModal,
    closeAiModal,
    onAiVoicePress,
    generateWithAI,

    chatbotVisible,
    chatbotQuestion,
    chatbotAnswer,
    setChatbotAnswer,
    submitChatbotAnswer,
    closeChatbot,

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