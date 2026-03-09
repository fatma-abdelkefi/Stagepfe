// src/screens/AddActualLaborScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FeatherIcon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';

import { addActualLabor } from '../services/workOrderDetailsService';
import type { RootStackParamList } from '../navigation/AppNavigator';
import SuccessModal from '../components/SuccessModal';
import ErrorModal from '../components/ErrorModal';

type Props = { route: RouteProp<RootStackParamList, 'AddActualLabor'> };

function safeTrim(v: any): string {
  return typeof v === 'string' ? v.trim() : String(v ?? '').trim();
}

export default function AddActualLaborScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const rawParams = (route as any)?.params as Partial<RootStackParamList['AddActualLabor']> | undefined;

  const woHref = safeTrim(rawParams?.woHref);
  const wonum  = safeTrim(rawParams?.wonum);
  const siteid = safeTrim(rawParams?.siteid);

  const [laborcode,  setLaborcode]  = useState('');
  const [regularhrs, setRegularhrs] = useState('1');
  const [saving,     setSaving]     = useState(false);

  const [successVisible, setSuccessVisible] = useState(false);
  const [errorVisible,   setErrorVisible]   = useState(false);
  const [errorMessage,   setErrorMessage]   = useState('');

  const showError = useCallback((msg: string) => {
    setErrorMessage(String(msg || 'Erreur'));
    setErrorVisible(true);
  }, []);

  const submit = async () => {
    if (!woHref)           return showError("Lien OT introuvable (woHref manquant).");
    if (!laborcode.trim()) return showError("Le code main d'œuvre est obligatoire.");
    const hrs = Number(String(regularhrs || '').replace(',', '.'));
    if (!Number.isFinite(hrs) || hrs <= 0) return showError('Les heures doivent être supérieures à 0.');

    try {
      setSaving(true);
      const username = await AsyncStorage.getItem('@username');
      const password = await AsyncStorage.getItem('@password');
      if (!username || !password) throw new Error('Identifiants non trouvés. Veuillez vous reconnecter.');

      console.log('[addActualLabor] woHref:', woHref);
      console.log('[addActualLabor] payload:', { laborcode: laborcode.trim(), regularhrs: hrs });

      await addActualLabor(woHref, username, password, {
        laborcode:  laborcode.trim(),
        regularhrs: hrs,
      });

      setSuccessVisible(true);
    } catch (e: any) {
      showError(String(e?.message ?? "Impossible d'ajouter la main d'œuvre."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* ── HEADER ─────────────────────────────────────────── */}
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
          <Text style={styles.headerTitle}>Main d'œuvre réelle</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.headerCard}>
          <View style={styles.headerCardRow}>
            <View>
              <Text style={styles.headerLabel}>Ordre de travail</Text>
              <Text style={styles.headerValue}>{wonum ? `#${wonum}` : '—'}</Text>
            </View>
            <View style={styles.headerDivider} />
            <View>
              <Text style={styles.headerLabel}>Site</Text>
              <Text style={styles.headerValue}>{siteid || '—'}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* ── BODY ───────────────────────────────────────────── */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Identification ── */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <FeatherIcon name="user-check" size={15} color="#2563eb" />
              <Text style={styles.cardTitle}>Identification de la main d'œuvre</Text>
            </View>

            <Text style={styles.label}>Code main d'œuvre *</Text>
            <TextInput
              style={styles.input}
              value={laborcode}
              onChangeText={setLaborcode}
              placeholder="Ex : TECH-01"
              placeholderTextColor="#94a3b8"
              autoCapitalize="characters"
              returnKeyType="next"
            />

            <Text style={styles.label}>Heures régulières *</Text>
            <View style={styles.hrsRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={regularhrs}
                onChangeText={setRegularhrs}
                keyboardType="numeric"
                placeholder="1"
                placeholderTextColor="#94a3b8"
                returnKeyType="done"
              />
              <View style={styles.hrsBadge}>
                <FeatherIcon name="clock" size={14} color="#2563eb" />
                <Text style={styles.hrsBadgeText}>heures</Text>
              </View>
            </View>

            {/* Saisie rapide */}
            <Text style={styles.quickLabel}>Saisie rapide</Text>
            <View style={styles.quickRow}>
              {['0.5', '1', '2', '4', '8'].map((h) => (
                <TouchableOpacity
                  key={h}
                  onPress={() => setRegularhrs(h)}
                  style={[styles.quickBtn, regularhrs === h && styles.quickBtnActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.quickBtnText, regularhrs === h && styles.quickBtnTextActive]}>
                    {h}h
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

        

          {/* ── Bouton Enregistrer ── */}
          <TouchableOpacity
            onPress={submit}
            disabled={saving}
            activeOpacity={0.9}
            style={[styles.saveButton, saving && { opacity: 0.7 }]}
          >
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.saveGradient}
            >
              {saving ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.saveText}>Enregistrement…</Text>
                </>
              ) : (
                <>
                  <FeatherIcon name="check-circle" size={18} color="#fff" />
                  <Text style={styles.saveText}>Enregistrer</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.requiredNote}>* Champs obligatoires</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <SuccessModal
        visible={successVisible}
        title="Main d'œuvre ajoutée !"
        message="La main d'œuvre réelle a été enregistrée avec succès."
        onClose={() => { setSuccessVisible(false); navigation.goBack(); }}
      />
      <ErrorModal
        visible={errorVisible}
        title="Erreur"
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
    width: 44, height: 44,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerCard: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 12, padding: 12,
  },
  headerCardRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerLabel: { fontSize: 11, color: '#64748b', fontWeight: '700' },
  headerValue: { fontSize: 16, fontWeight: '900', color: '#2563eb', marginTop: 2 },
  headerDivider: { width: 1, height: 32, backgroundColor: '#e2e8f0' },

  content: { padding: 16, paddingBottom: 32, gap: 14 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 4, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  cardTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a' },

  label: { fontSize: 12, color: '#64748b', fontWeight: '800', marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, fontWeight: '600', color: '#0f172a',
    backgroundColor: '#f8fafc',
  },

  hrsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hrsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#eff6ff', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 11,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  hrsBadgeText: { fontSize: 13, fontWeight: '800', color: '#2563eb' },

  quickLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '700', marginTop: 14, marginBottom: 8 },
  quickRow: { flexDirection: 'row', gap: 8 },
  quickBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 9,
    borderRadius: 10, borderWidth: 1.5,
    borderColor: '#e2e8f0', backgroundColor: '#f8fafc',
  },
  quickBtnActive:     { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  quickBtnText:       { fontSize: 13, fontWeight: '800', color: '#64748b' },
  quickBtnTextActive: { color: '#fff' },

  summaryCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#bfdbfe',
    gap: 8,
  },
  summaryTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  summaryTitle:    { fontSize: 12, fontWeight: '800', color: '#2563eb' },
  summaryLine:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryKey:      { fontSize: 12, color: '#64748b', fontWeight: '700' },
  summaryVal:      { fontSize: 13, color: '#0f172a', fontWeight: '900' },

  saveButton:  { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  saveGradient: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10, paddingVertical: 15,
  },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '900' },

  requiredNote: {
    textAlign: 'center', fontSize: 11,
    color: '#94a3b8', fontWeight: '600',
  },
});
