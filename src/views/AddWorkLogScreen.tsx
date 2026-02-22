// src/screens/AddWorkLogScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../context/AuthContext';

type RootStackParamList = any;
type Props = { route: RouteProp<RootStackParamList, 'AddWorkLog'> };

function fixHost(url: string) {
  return String(url || '').replace('http://192.168.1.202:9080', 'http://demo2.smartech-tn.com');
}

function toBasicAuth(username: string, password: string) {
  const token = `${username}:${password}`;

  // React Native doesn't always have btoa; Buffer is the most reliable.
  // Ensure you have: yarn add buffer && add "import { Buffer } from 'buffer';"
  // We'll fallback if btoa exists.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Buffer } = require('buffer');
    return `Basic ${Buffer.from(token, 'utf8').toString('base64')}`;
  } catch {
    // @ts-ignore
    if (typeof btoa === 'function') return `Basic ${btoa(token)}`;
    throw new Error('Base64 encoder not available. Install "buffer" package.');
  }
}

async function maximoPostWorkLog(params: {
  worklogCollectionRef: string;
  username: string;
  password: string;
  logtype: string;
  description: string;
  longText: string;
  clientviewable: boolean;
}) {
  const { worklogCollectionRef, username, password, logtype, description, longText, clientviewable } = params;

  const url = fixHost(worklogCollectionRef);

  // ✅ Working Maximo payload (array root)
  const body = [
    {
      _action: 'AddChange',
      worklog: [
        {
          logtype,
          description,
          description_longdescription: { ldtext: longText },
          clientviewable,
        },
      ],
    },
  ];

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: toBasicAuth(username, password),
    },
    body: JSON.stringify(body),
  });

  // Maximo returns 204 No Content on success
  if (res.status === 204) return { ok: true as const };

  // Sometimes Maximo returns an error body
  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }

  const msg =
    parsed?.Error?.message ||
    parsed?.error?.message ||
    (text ? text : `HTTP ${res.status}`);

  return { ok: false as const, status: res.status, message: msg };
}

export default function AddWorkLogScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const { username, password, authLoading } = useAuth();

  const worklogCollectionRef: string = String((route as any)?.params?.worklogCollectionRef || '').trim();
  const wonum: string = String((route as any)?.params?.wonum || '').trim();

  const canSubmit = useMemo(() => {
    return !!worklogCollectionRef && !!username && !!password;
  }, [worklogCollectionRef, username, password]);

  const [logtype, setLogtype] = useState<'CLIENTNOTE' | 'UPDATE'>('CLIENTNOTE');
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState('');
  const [clientviewable, setClientviewable] = useState(true);
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (authLoading) return;

    if (!username || !password) {
      Alert.alert('Utilisateur non connecté', 'Veuillez vous connecter');
      navigation.replace('Login');
      return;
    }

    if (!worklogCollectionRef) {
      Alert.alert('Erreur', 'worklogCollectionRef manquant');
      return;
    }

    const desc = summary.trim();
    const longText = details.trim();

    if (!desc) {
      Alert.alert('Champs manquants', 'Veuillez saisir le Summary (Description).');
      return;
    }

    setSaving(true);
    try {
      const result = await maximoPostWorkLog({
        worklogCollectionRef,
        username,
        password,
        logtype: (logtype || 'CLIENTNOTE').trim(),
        description: desc,
        longText, // can be ''
        clientviewable,
      });

      if (!result.ok) {
        Alert.alert('Erreur Maximo', result.message || 'Erreur inconnue');
        return;
      }

      Alert.alert('Succès', 'Work Log ajouté.', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Erreur réseau');
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
          <Text style={styles.headerHint} numberOfLines={2}>
            Type: {logtype || 'CLIENTNOTE'} • Visible: {clientviewable ? 'Oui' : 'Non'}
          </Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!canSubmit && (
            <View style={styles.warnBox}>
              <FeatherIcon name="alert-triangle" size={18} color="#b45309" />
              <Text style={styles.warnText}>
                Session ou worklogCollectionRef manquant. Retournez et réessayez.
              </Text>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.label}>Log Type</Text>
            <View style={styles.row}>
              <TouchableOpacity
                onPress={() => setLogtype('CLIENTNOTE')}
                style={[styles.chip, logtype === 'CLIENTNOTE' && styles.chipActive]}
                activeOpacity={0.85}
              >
                <Text style={[styles.chipText, logtype === 'CLIENTNOTE' && styles.chipTextActive]}>
                  CLIENTNOTE
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setLogtype('UPDATE')}
                style={[styles.chip, logtype === 'UPDATE' && styles.chipActive]}
                activeOpacity={0.85}
              >
                <Text style={[styles.chipText, logtype === 'UPDATE' && styles.chipTextActive]}>
                  UPDATE
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { marginTop: 14 }]}>Summary (DESCRIPTION)</Text>
            <TextInput
              value={summary}
              onChangeText={setSummary}
              placeholder="Ex: Nouveau work log depuis mobile..."
              placeholderTextColor="#94a3b8"
              style={styles.input}
              multiline
            />

            <Text style={[styles.label, { marginTop: 14 }]}>Details (LONGDESCRIPTION)</Text>
            <TextInput
              value={details}
              onChangeText={setDetails}
              placeholder="Texte long (optionnel)..."
              placeholderTextColor="#94a3b8"
              style={[styles.input, { minHeight: 120, textAlignVertical: 'top' }]}
              multiline
            />

            <TouchableOpacity
              onPress={() => setClientviewable((v) => !v)}
              style={styles.toggleRow}
              activeOpacity={0.85}
            >
              <View style={[styles.checkbox, clientviewable && styles.checkboxOn]}>
                {clientviewable && <FeatherIcon name="check" size={14} color="#fff" />}
              </View>
              <Text style={styles.toggleText}>Client viewable</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={onSave}
            style={[styles.saveButton, (!canSubmit || saving) && { opacity: 0.7 }]}
            activeOpacity={0.9}
            disabled={!canSubmit || saving}
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

          <View style={styles.debugBox}>
            <Text style={styles.debugTitle}>Debug</Text>
            <Text style={styles.debugText} selectable>
              POST → {fixHost(worklogCollectionRef || '')}
            </Text>
            <Text style={styles.debugText} selectable>
              Payload root: array + _action=AddChange + worklog[]
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
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
  headerHint: { marginTop: 6, fontSize: 12, color: '#334155', fontWeight: '700' },

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

  row: { flexDirection: 'row', gap: 10, marginTop: 10 },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  chipActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  chipText: { fontSize: 12, fontWeight: '900', color: '#334155' },
  chipTextActive: { color: '#2563eb' },

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

  toggleRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 14 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  toggleText: { fontSize: 13, fontWeight: '800', color: '#0f172a' },

  saveButton: { marginTop: 14, borderRadius: 14, overflow: 'hidden' },
  saveButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14 },
  saveText: { color: '#fff', fontSize: 14, fontWeight: '900' },

  debugBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  debugTitle: { fontSize: 12, fontWeight: '900', color: '#0f172a', marginBottom: 6 },
  debugText: { fontSize: 11, fontWeight: '700', color: '#334155' },
});