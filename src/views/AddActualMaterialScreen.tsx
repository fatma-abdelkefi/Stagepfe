import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { addActualMaterial, getActualsFromWoHref } from '../services/workOrderDetailsService';
import type { RootStackParamList } from '../navigation/AppNavigator';

import DetailsHeader from '../ui/details/DetailsHeader';
import { detailsStyles } from '../ui/details/detailsStyles';
import SuccessModal from '../components/SuccessModal';
import ErrorModal from '../components/ErrorModal';

type Props = { route: RouteProp<RootStackParamList, 'AddActualMaterial'> };

export default function AddActualMaterialScreen({ route }: Props) {
  const navigation = useNavigation<any>();

  const rawParams = (route as any)?.params as Partial<RootStackParamList['AddActualMaterial']> | undefined;
  const woHref = String(rawParams?.woHref ?? '').trim();
  const wonum = String(rawParams?.wonum ?? '');
  const siteid = String(rawParams?.siteid ?? '');

  const [itemnum, setItemnum] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [storeloc, setStoreloc] = useState('');
  const [issuetype, setIssuetype] = useState('ISSUE');
  const [saving, setSaving] = useState(false);

  const [successVisible, setSuccessVisible] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setErrorVisible(true);
  };

  const submit = async () => {
    if (!woHref) return showError("woHref manquant (lien OT introuvable).");
    if (!itemnum.trim()) return showError('Item obligatoire');

    const q = Number(quantity || 0);
    if (Number.isNaN(q) || q <= 0) return showError('Quantité invalide (doit être > 0)');

    try {
      setSaving(true);

      const username = await AsyncStorage.getItem('@username');
      const password = await AsyncStorage.getItem('@password');
      if (!username || !password) throw new Error('Identifiants non trouvés');

      // ✅ before
      const before = await getActualsFromWoHref(woHref, username, password);
      console.log('[addActualMaterial] before count:', before.actualMaterials?.length ?? 0);

      const res = await addActualMaterial(woHref, username, password, {
        itemnum: itemnum.trim(),
        quantity: q,
        storeloc: storeloc.trim(),
        issuetype: issuetype.trim(),
      });

      console.log('[addActualMaterial] status:', res.status);
      console.log('[addActualMaterial] data:', res.data ?? '');

      // ✅ after
      const after = await getActualsFromWoHref(woHref, username, password);
      console.log('[addActualMaterial] after count:', after.actualMaterials?.length ?? 0);

      setSuccessVisible(true);
    } catch (e: any) {
      showError(String(e?.message ?? "Impossible d'ajouter le matériel"));
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
      <DetailsHeader title="Ajouter matériel réel" />

      <View style={detailsStyles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Item</Text>
          <TextInput
            style={styles.input}
            value={itemnum}
            onChangeText={setItemnum}
            placeholder="ITEM001"
            autoCapitalize="characters"
          />

          <Text style={styles.label}>Quantité</Text>
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Storeloc</Text>
          <TextInput
            style={styles.input}
            value={storeloc}
            onChangeText={setStoreloc}
            placeholder="MAG1"
          />

          <Text style={styles.label}>Issuetype</Text>
          <TextInput
            style={styles.input}
            value={issuetype}
            onChangeText={setIssuetype}
            placeholder="ISSUE"
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
          <Text style={styles.debug} selectable>
            woHref: {woHref}
          </Text>
        </View>
      </View>

      <SuccessModal
        visible={successVisible}
        title="Ajouté !"
        message="Matériel réel ajouté avec succès."
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
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  label: { fontSize: 12, color: '#64748b', fontWeight: '700', marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 6, backgroundColor: '#fff' },
  btn: { marginTop: 16, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800' },
  debug: { marginTop: 12, fontSize: 11, color: '#94a3b8', fontWeight: '600' },
});