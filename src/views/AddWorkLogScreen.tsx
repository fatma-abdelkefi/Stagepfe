import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  PermissionsAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import Sound, { RecordBackType } from 'react-native-nitro-sound';

import { useAuth } from '../context/AuthContext';
import { addWorkLog } from '../services/worklogService';
import { transcribeAudio } from '../services/nlpApi';
import SuccessModal from '../components/SuccessModal';
import ErrorModal from '../components/ErrorModal';
import RichHtmlEditor from '../components/RichHtmlEditor';

type RootStackParamList = any;
type Props = { route: RouteProp<RootStackParamList, 'AddWorkLog'> };

type WorkLogType = {
  value: string;
  label: string;
};

const WORKLOG_TYPES: WorkLogType[] = [
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
    d.getHours()
  )}:${pad2(d.getMinutes())}:00`;
}

function getCurrentDateTimeForDisplay() {
  const d = new Date();
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(
    d.getHours()
  )}:${pad2(d.getMinutes())}`;
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

export default function AddWorkLogScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const { username, password, authLoading } = useAuth();

  const wonum: string = String((route as any)?.params?.wonum || '').trim();

  const modifyworklogUrl: string = String(
    (route as any)?.params?.worklogCollectionRef ||
      (route as any)?.params?.woHref ||
      (route as any)?.params?.mxwoDetailsHref ||
      ''
  ).trim();

  const [createdBy, setCreatedBy] = useState('');
  const [description, setDescription] = useState('');
  const [detailsHtml, setDetailsHtml] = useState('');
  const [selectedType, setSelectedType] = useState<WorkLogType>(WORKLOG_TYPES[1]);
  const [typeOpen, setTypeOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [successVisible, setSuccessVisible] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [voiceError, setVoiceError] = useState(false);

  const [recording, setRecording] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [recordedFileUri, setRecordedFileUri] = useState('');
  const [transcript, setTranscript] = useState('');
  const [voiceInfo, setVoiceInfo] = useState('');

  const canSubmit = useMemo(
    () => !!modifyworklogUrl && !!username && !!password,
    [modifyworklogUrl, username, password]
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

  const requestMicPermission = async () => {
    if (Platform.OS !== 'android') return true;

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Permission microphone',
          message: "L'application a besoin du microphone pour enregistrer la dictée.",
          buttonPositive: 'Autoriser',
          buttonNegative: 'Refuser',
        }
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  };

  const startRecording = async () => {
    try {
      const ok = await requestMicPermission();
      if (!ok) {
        showError('Permission microphone refusée.');
        return;
      }

      setTranscript('');
      setVoiceInfo('');
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

      setRecordedFileUri(uri);
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
      payload?.description_longdescription?.ldtext || ''
    ).trim();

    setTranscript(transcriptText);

    if (!transcriptText) {
      setVoiceError(true);
      setVoiceInfo('Aucune parole détectée. Veuillez réessayer.');
      return;
    }

    if (autoDescription) {
      setDescription(autoDescription);
    }

    if (autoLongText) {
      setDetailsHtml(textToHtml(autoLongText));
    } else {
      setDetailsHtml(textToHtml(transcriptText));
    }
    setVoiceError(false);
    setVoiceInfo('La transcription a été effectuée avec succès.');
  } catch (e: any) {
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

  const onSave = async () => {
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
    } catch (e: any) {
      showError(e?.message || 'Erreur réseau');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#3b82f6', '#2563eb', '#1e40af']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <FeatherIcon name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ajouter Work Log</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.headerCard}>
          <Text style={styles.headerLabel}>OT</Text>
          <Text style={styles.headerValue}>{wonum ? `#${wonum}` : '-'}</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!canSubmit && (
            <View style={styles.warnBox}>
              <FeatherIcon name="alert-triangle" size={18} color="#b45309" />
              <Text style={styles.warnText}>
                Session ou URL work log manquante. Retournez et réessayez.
              </Text>
            </View>
          )}

          <View style={styles.maximoPanel}>
            <View style={styles.topBar}>
              <Text style={styles.topBarTitle}>Détails</Text>
            </View>

            <View style={styles.panelBody}>
              <View style={styles.voiceSection}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={onVoicePress}
                  style={[
                    styles.voiceButton,
                    recording && styles.voiceButtonRecording,
                    voiceLoading && styles.voiceButtonDisabled,
                  ]}
                  disabled={voiceLoading}
                >
                  {voiceLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <FeatherIcon name="mic" size={18} color="#fff" />
                      <Text style={styles.voiceButtonText}>
                        {recording ? 'Arrêter et analyser' : 'Dicter'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {voiceInfo ? (
                  <View style={[styles.infoBox, voiceError && styles.errorBox]}>
                    <FeatherIcon
                      name={voiceError ? 'alert-circle' : 'check-circle'}
                      size={16}
                      color={voiceError ? '#dc2626' : '#16a34a'}
                    />
                    <Text style={[styles.infoText, voiceError && styles.errorText]}>
                      {voiceInfo}
                    </Text>
                  </View>
                ) : null}
                {transcript ? (
                  <View style={styles.transcriptBox}>
                    <Text style={styles.fieldLabel}>Transcription :</Text>
                    <Text style={styles.transcriptText}>{transcript}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.topGrid}>
                <View style={styles.leftPanel}>
                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>Classe :</Text>
                    <Text style={styles.fieldValue}>WORKORDER</Text>
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>Créé par :</Text>
                    <TextInput
                      value={createdBy}
                      onChangeText={setCreatedBy}
                      placeholder=""
                      placeholderTextColor="#94a3b8"
                      style={styles.metaInput}
                      autoCapitalize="characters"
                    />
                  </View>

                  <View style={styles.fieldBlockNoBorder}>
                    <Text style={styles.fieldLabel}>Date :</Text>
                    <View style={styles.readOnlyMetaBox}>
                      <Text style={styles.fieldValue}>{getCurrentDateTimeForDisplay()}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.rightPanel}>
                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>Type :</Text>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setTypeOpen((prev) => !prev)}
                      style={styles.typePicker}
                    >
                      <Text style={styles.typePickerText}>{selectedType.label}</Text>
                      <FeatherIcon
                        name={typeOpen ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color="#2563eb"
                      />
                    </TouchableOpacity>

                    {typeOpen && (
                      <View style={styles.inlineDropdown}>
                        {WORKLOG_TYPES.map((item) => {
                          const active = item.value === selectedType.value;
                          return (
                            <TouchableOpacity
                              key={item.value}
                              activeOpacity={0.85}
                              onPress={() => {
                                setSelectedType(item);
                                setTypeOpen(false);
                              }}
                              style={[styles.inlineOption, active && styles.inlineOptionActive]}
                            >
                              <Text
                                style={[
                                  styles.inlineOptionText,
                                  active && styles.inlineOptionTextActive,
                                ]}
                              >
                                {item.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>

                  <View style={styles.fieldBlockNoBorder}>
                    <Text style={styles.fieldLabel}>Résumé :</Text>
                    <TextInput
                      value={description}
                      onChangeText={setDescription}
                      placeholder=""
                      placeholderTextColor="#94a3b8"
                      style={styles.summaryInput}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.detailsSection}>
                <Text style={styles.fieldLabel}>Détails :</Text>

                <View style={styles.editorShell}>
                  <RichHtmlEditor
                    value={detailsHtml}
                    onChange={setDetailsHtml}
                    height={360}
                  />
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={onSave}
            style={[styles.saveButton, (!canSubmit || saving || authLoading) && { opacity: 0.7 }]}
            activeOpacity={0.9}
            disabled={!canSubmit || saving || authLoading}
          >
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.saveButtonGradient}
            >
              {saving ? (
                <>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.saveText}>Enregistrement...</Text>
                </>
              ) : (
                <>
                  <FeatherIcon name="save" size={18} color="#fff" />
                  <Text style={styles.saveText}>Enregistrer</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <SuccessModal
        visible={successVisible}
        title="Work Log ajouté !"
        message="Le work log a été enregistré avec succès."
        onClose={() => {
          setSuccessVisible(false);
          navigation.goBack();
        }}
      />

      <ErrorModal
        visible={errorVisible}
        title="Erreur Maximo"
        message={errorMessage}
        onClose={() => setErrorVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    paddingTop: Platform.OS === 'android' ? 10 : 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerCard: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 12,
    padding: 12,
  },
  headerLabel: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  headerValue: { fontSize: 18, fontWeight: '900', color: '#2563eb', marginTop: 2 },

  content: {
    padding: 16,
    paddingBottom: 24,
  },

  warnBox: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  warnText: {
    flex: 1,
    fontSize: 12,
    color: '#92400e',
    fontWeight: '700',
  },

  maximoPanel: {
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    overflow: 'visible',
    borderWidth: 1,
    borderColor: '#cfd8e3',
  },
  topBar: {
    height: 36,
    backgroundColor: '#e5e7eb',
    borderBottomWidth: 1,
    borderBottomColor: '#cfd8e3',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  topBarTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },

  panelBody: {
    padding: 12,
  },

  voiceSection: {
    marginBottom: 16,
  },
  voiceButton: {
    backgroundColor: '#00319c',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  voiceButtonRecording: {
    backgroundColor: '#dc2626',
  },
  voiceButtonDisabled: {
    opacity: 0.7,
  },
  voiceButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },

  infoBox: {
    marginTop: 10,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    flex: 1,
    color: '#166534',
    fontSize: 13,
    fontWeight: '600',
  },

  transcriptBox: {
    marginTop: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe2ea',
    borderRadius: 10,
    padding: 10,
  },
  transcriptText: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 20,
  },

  topGrid: {
    flexDirection: 'row',
    gap: 18,
    alignItems: 'flex-start',
  },

  leftPanel: {
    width: 145,
  },

  rightPanel: {
    flex: 1,
  },

  detailsSection: {
    marginTop: 18,
  },

  fieldBlock: {
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#dbe2ea',
  },
  fieldBlockNoBorder: {
    paddingBottom: 10,
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#4b5563',
    marginBottom: 6,
  },
  fieldValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },

  metaInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingVertical: 4,
    paddingHorizontal: 0,
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    backgroundColor: 'transparent',
  },

  readOnlyMetaBox: {
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingBottom: 4,
  },
  errorBox: {
  backgroundColor: '#fef2f2',
  borderColor: '#fca5a5',
},

errorText: {
  color: '#dc2626',
},
  typePicker: {
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  typePickerText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    flex: 1,
    paddingRight: 8,
  },

  inlineDropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#cfd8e3',
    backgroundColor: '#fff',
  },
  inlineOption: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  inlineOptionActive: {
    backgroundColor: '#dbeef7',
  },
  inlineOptionText: {
    fontSize: 14,
    color: '#0f172a',
  },
  inlineOptionTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },

  summaryInput: {
    minHeight: 34,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingVertical: 4,
    paddingHorizontal: 0,
    fontSize: 15,
    color: '#111827',
    backgroundColor: 'transparent',
  },

  editorShell: {
    borderWidth: 1,
    borderColor: '#bfc7d1',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },

  saveButton: {
    marginTop: 14,
    borderRadius: 14,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  saveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
});