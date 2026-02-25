// src/screens/AddWorkLogScreen.tsx
import React, { useMemo, useState } from 'react';
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
} from 'react-native';import { SafeAreaView } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useAuth } from '../context/AuthContext';
import { addWorkLog } from '../services/worklogService';
import SuccessModal from '../components/SuccessModal';
import ErrorModal from '../components/ErrorModal';

type RootStackParamList = any;
type Props = { route: RouteProp<RootStackParamList, 'AddWorkLog'> };

function pad2(n: number) { return String(n).padStart(2, '0'); }

function formatDateTime(d: Date) {
  // ISO 8601 with T separator and seconds — required by Maximo
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:00`;
}

export default function AddWorkLogScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const { username, password, authLoading } = useAuth();

  const wonum: string = String((route as any)?.params?.wonum || '').trim();

  // ✅ worklog_collectionref from mxapiwo already IS the full modifyworklog URL
  // WorkOrderDetailsScreen passes it as worklogCollectionRef
  const modifyworklogUrl: string = String(
    (route as any)?.params?.worklogCollectionRef ||
    (route as any)?.params?.woHref ||
    (route as any)?.params?.mxwoDetailsHref ||
    ''
  ).trim();

  const [createdBy, setCreatedBy] = useState('');
  const [date, setDate] = useState('');
  const [pickedDate, setPickedDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [description, setDescription] = useState('');
  const [details, setDetails] = useState('');
  const [saving, setSaving] = useState(false);

  const [successVisible, setSuccessVisible] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const canSubmit = useMemo(() => !!modifyworklogUrl && !!username && !!password, [modifyworklogUrl, username, password]);

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setErrorVisible(true);
  };

  const onSave = async () => {
    if (authLoading) return;
    if (!username || !password) { showError('Session expirée. Reconnectez-vous.'); return; }
    if (!modifyworklogUrl) { showError('URL worklog manquante. Retournez et réessayez.'); return; }
    if (!description.trim()) { showError('Veuillez saisir la Description.'); return; }

    setSaving(true);
    try {
      await addWorkLog({
        modifyworklogUrl,
        username,
        password,
        description: description.trim(),
        longText: details.trim(),
        logtype: 'CLIENTNOTE',
        createby: createdBy.trim() || undefined,
        createdate: date.trim() || undefined,
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

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!canSubmit && (
            <View style={styles.warnBox}>
              <FeatherIcon name="alert-triangle" size={18} color="#b45309" />
              <Text style={styles.warnText}>Session ou woHref manquant. Retournez et réessayez.</Text>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.label}>Créé par</Text>
            <TextInput
              value={createdBy}
              onChangeText={setCreatedBy}
              placeholder="Ex: Fatma"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              autoCapitalize="characters"
            />

            <Text style={[styles.label, { marginTop: 14 }]}>Date</Text>
            <TouchableOpacity activeOpacity={0.9} onPress={() => setShowPicker(true)}>
              <View pointerEvents="none">
                <TextInput
                  value={date}
                  placeholder="Choisir une date & heure..."
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                  editable={false}
                />
              </View>
            </TouchableOpacity>

            <DateTimePickerModal
              isVisible={showPicker}
              mode="datetime"
              date={pickedDate ?? new Date()}
              onConfirm={(d) => {
                setPickedDate(d);
                setDate(formatDateTime(d));
                setShowPicker(false);
              }}
              onCancel={() => setShowPicker(false)}
            />

            <Text style={[styles.label, { marginTop: 14 }]}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Ex: Intervention terminée..."
              placeholderTextColor="#94a3b8"
              style={styles.input}
              multiline
            />

            <Text style={[styles.label, { marginTop: 14 }]}>Détails</Text>
            <TextInput
              value={details}
              onChangeText={setDetails}
              placeholder="Texte long (optionnel)..."
              placeholderTextColor="#94a3b8"
              style={[styles.input, { minHeight: 120, textAlignVertical: 'top' }]}
              multiline
            />
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
  headerCard: { backgroundColor: 'rgba(255,255,255,0.98)', borderRadius: 12, padding: 12 },
  headerLabel: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  headerValue: { fontSize: 18, fontWeight: '900', color: '#2563eb', marginTop: 2 },
  content: { padding: 16, paddingBottom: 24 },
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
  warnText: { flex: 1, fontSize: 12, color: '#92400e', fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  label: { fontSize: 12, color: '#64748b', fontWeight: '800' },
  input: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  readOnly: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    minHeight: 48,
  },
  readOnlyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  readOnlyHint: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  saveButton: { marginTop: 14, borderRadius: 14, overflow: 'hidden' },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  saveText: { color: '#fff', fontSize: 14, fontWeight: '900' },
});
