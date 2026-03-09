// src/screens/AddActualMaterialScreen.tsx
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

import { addActualMaterial } from '../services/workOrderDetailsService';
import type { RootStackParamList } from '../navigation/AppNavigator';
import SuccessModal from '../components/SuccessModal';
import ErrorModal from '../components/ErrorModal';

type Props = { route: RouteProp<RootStackParamList, 'AddActualMaterial'> };

const ISSUE_TYPES = [
  { value: 'ISSUE',    label: 'Sortie',    icon: 'arrow-up-circle'   },
  { value: 'RETURN',   label: 'Retour',    icon: 'arrow-down-circle' },
];

export default function AddActualMaterialScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const rawParams = (route as any)?.params as Partial<RootStackParamList['AddActualMaterial']> | undefined;

  const woHref = String(rawParams?.woHref ?? '').trim();
  const wonum  = String(rawParams?.wonum  ?? '');
  const siteid = String(rawParams?.siteid ?? '');

  const [itemnum,   setItemnum]   = useState('');
  const [quantity,  setQuantity]  = useState('1');
  const [storeloc,  setStoreloc]  = useState('');
  const [issuetype, setIssuetype] = useState('ISSUE');
  const [saving,    setSaving]    = useState(false);

  const [successVisible, setSuccessVisible] = useState(false);
  const [errorVisible,   setErrorVisible]   = useState(false);
  const [errorMessage,   setErrorMessage]   = useState('');

  const showError = useCallback((msg: string) => {
    setErrorMessage(msg);
    setErrorVisible(true);
  }, []);

  const submit = async () => {
    if (!woHref)          return showError('Lien OT introuvable (woHref manquant).');
    if (!itemnum.trim())  return showError('Le code article est obligatoire.');
    const q = Number(quantity || 0);
    if (Number.isNaN(q) || q <= 0) return showError('La quantité doit être supérieure à 0.');
    if (!storeloc.trim()) return showError('Le magasin est obligatoire (ex : CENTRAL).');
    if (!siteid.trim())   return showError('Identifiant de site manquant.');

    try {
      setSaving(true);
      const username = await AsyncStorage.getItem('@username');
      const password = await AsyncStorage.getItem('@password');
      if (!username || !password) throw new Error('Identifiants non trouvés. Veuillez vous reconnecter.');

      await addActualMaterial(woHref, username, password, {
        itemnum:   itemnum.trim(),
        itemqty:   q,
        storeroom: storeloc.trim(),
        issuetype: issuetype || 'ISSUE',
        siteid:    siteid.trim(),
      });

      setSuccessVisible(true);
    } catch (e: any) {
      showError(String(e?.message ?? "Impossible d'ajouter le matériel."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* ── HEADER — même style que AddWorkLog/AddActualLabor ── */}
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
          <Text style={styles.headerTitle}>Ajouter Matériel Réel</Text>
          <View style={styles.backButton} />
        </View>

        {/* OT card */}
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

      {/* ── BODY ─────────────────────────────────────────────── */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Article + Quantité ── */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <FeatherIcon name="package" size={15} color="#2563eb" />
              <Text style={styles.cardTitle}>Identification de l'article</Text>
            </View>

            <Text style={styles.label}>Code article *</Text>
            <TextInput
              style={styles.input}
              value={itemnum}
              onChangeText={setItemnum}
              placeholder="Ex : PUMP-001"
              placeholderTextColor="#94a3b8"
              autoCapitalize="characters"
              returnKeyType="next"
            />

            <Text style={styles.label}>Quantité consommée *</Text>
            <TextInput
              style={styles.input}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor="#94a3b8"
              returnKeyType="next"
            />
          </View>

          {/* ── Magasin ── */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <FeatherIcon name="archive" size={15} color="#2563eb" />
              <Text style={styles.cardTitle}>Emplacement de stockage</Text>
            </View>

            <Text style={styles.label}>Magasin *</Text>
            <TextInput
              style={styles.input}
              value={storeloc}
              onChangeText={setStoreloc}
              placeholder="Ex : CENTRAL"
              placeholderTextColor="#94a3b8"
              autoCapitalize="characters"
              returnKeyType="done"
            />
          </View>

          {/* ── Type de mouvement ── */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <FeatherIcon name="refresh-cw" size={15} color="#2563eb" />
              <Text style={styles.cardTitle}>Type de mouvement *</Text>
            </View>

            <View style={styles.pillRow}>
              {ISSUE_TYPES.map((t) => {
                const active = issuetype === t.value;
                return (
                  <TouchableOpacity
                    key={t.value}
                    onPress={() => setIssuetype(t.value)}
                    style={[styles.pill, active && styles.pillActive]}
                    activeOpacity={0.8}
                  >
                    <FeatherIcon
                      name={t.icon as any}
                      size={14}
                      color={active ? '#fff' : '#2563eb'}
                    />
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
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
        title="Matériel ajouté !"
        message="Le matériel réel a été enregistré avec succès."
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

  // Header
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
    borderRadius: 12,
    padding: 12,
  },
  headerCardRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerLabel: { fontSize: 11, color: '#64748b', fontWeight: '700' },
  headerValue: { fontSize: 16, fontWeight: '900', color: '#2563eb', marginTop: 2 },
  headerDivider: { width: 1, height: 32, backgroundColor: '#e2e8f0' },

  // Content
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
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a' },

  label: { fontSize: 12, color: '#64748b', fontWeight: '800', marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },

  // Pills
  pillRow: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5, borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
  },
  pillActive:     { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  pillText:       { fontSize: 13, fontWeight: '800', color: '#2563eb' },
  pillTextActive: { color: '#fff' },

  // Save
  saveButton: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  saveGradient: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10,
    paddingVertical: 15,
  },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '900' },

  requiredNote: {
    textAlign: 'center', fontSize: 11,
    color: '#94a3b8', fontWeight: '600',
  },
});
