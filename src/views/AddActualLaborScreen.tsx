// src/views/AddActualLaborScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { addActualLabor } from '../services/workOrderDetailsService';
import type { RootStackParamList } from '../navigation/AppNavigator';

import DetailsHeader from '../ui/details/DetailsHeader';
import { detailsStyles } from '../ui/details/detailsStyles';
import SuccessModal from '../components/SuccessModal';
import ErrorModal from '../components/ErrorModal';

type Props = { route: RouteProp<RootStackParamList, 'AddActualLabor'> };

export default function AddActualLaborScreen({ route }: Props) {
  const navigation = useNavigation<any>();

  const rawParams: any = (route as any)?.params ?? {};
  const woHref = String(rawParams?.woHref ?? '').trim();
  const wonum = String(rawParams?.wonum ?? '');
  const siteid = String(rawParams?.siteid ?? '');

  const [laborcode, setLaborcode] = useState('');
  const [regularhrs, setRegularhrs] = useState('1');
  const [saving, setSaving] = useState(false);

  const [successVisible, setSuccessVisible] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setErrorVisible(true);
  };

  const submit = async () => {
    if (!woHref) { showError("woHref manquant (lien OT introuvable)."); return; }
    if (!laborcode.trim()) { showError('Labor code obligatoire'); return; }

    const hrs = Number(regularhrs || 0);
    if (Number.isNaN(hrs) || hrs <= 0) { showError('Heures invalides (doit être > 0)'); return; }

    try {
      setSaving(true);
      const username = await AsyncStorage.getItem('@username');
      const password = await AsyncStorage.getItem('@password');
      if (!username || !password) throw new Error('Identifiants non trouvés');

      await addActualLabor(woHref, username, password, {
        laborcode: laborcode.trim(),
        regularhrs: hrs,
      });

      setSuccessVisible(true);
    } catch (e: any) {
      showError(String(e?.message ?? "Impossible d'ajouter la main d'œuvre"));
    } finally {
      setSaving(false);
    }
  };

  const handleSuccessClose = () => {
    setSuccessVisible(false);
    navigation.goBack();
  };

  return (
    <View style={detailsStyles.container}>
      <DetailsHeader title="Ajouter main d'œuvre réelle" />

      <View style={detailsStyles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Labor code</Text>
          <TextInput
            style={styles.input}
            value={laborcode}
            onChangeText={setLaborcode}
            placeholder="BARRY"
            autoCapitalize="characters"
          />

          <Text style={styles.label}>Heures</Text>
          <TextInput
            style={styles.input}
            value={regularhrs}
            onChangeText={setRegularhrs}
            keyboardType="numeric"
          />

          <TouchableOpacity
            style={[styles.btn, saving && { opacity: 0.7 }]}
            onPress={submit}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>{saving ? 'Envoi...' : 'Ajouter'}</Text>
          </TouchableOpacity>

          <Text style={styles.debug} selectable>
            wonum: {wonum} | siteid: {siteid}
          </Text>
        </View>
      </View>

      <SuccessModal
        visible={successVisible}
        title="Ajouté !"
        message="Main d'œuvre réelle ajoutée avec succès."
        onClose={handleSuccessClose}
      />

      <ErrorModal
        visible={errorVisible}
        title="Erreur"
        message={errorMessage}
        onClose={() => setErrorVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  label: { fontSize: 12, color: '#64748b', fontWeight: '700', marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
    backgroundColor: '#fff',
  },
  btn: {
    marginTop: 16,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '800' },
  debug: { marginTop: 12, fontSize: 11, color: '#94a3b8', fontWeight: '600' },
});
