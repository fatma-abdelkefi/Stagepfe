import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FeatherIcon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { addActualLabor } from '../services/workOrderDetailsService';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = { route: RouteProp<RootStackParamList, 'AddActualLabor'> };

export default function AddActualLaborScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const { woHref } = (route as any).params;

  const [laborcode, setLaborcode] = useState('');
  const [regularhrs, setRegularhrs] = useState('1');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    try {
      if (!laborcode.trim()) {
        Alert.alert('Erreur', 'laborcode obligatoire');
        return;
      }

      const username = await AsyncStorage.getItem('@username');
      const password = await AsyncStorage.getItem('@password');
      if (!username || !password) throw new Error('Identifiants non trouvés');

      setSaving(true);

      await addActualLabor(woHref, username, password, {
        laborcode: laborcode.trim(),
        regularhrs: Number(regularhrs || 0),
        });

      Alert.alert('Succès', "Main d'oeuvre réelle ajoutée");
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || "Impossible d’ajouter la main d'oeuvre");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#3b82f6', '#2563eb', '#1e40af']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <FeatherIcon name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Ajouter main d'œuvre réelle</Text>
      </LinearGradient>

      <View style={styles.card}>
        <Text style={styles.label}>Labor code</Text>
        <TextInput style={styles.input} value={laborcode} onChangeText={setLaborcode} placeholder="BARRY" />

        <Text style={styles.label}>Heures (regularhrs)</Text>
        <TextInput style={styles.input} value={regularhrs} onChangeText={setRegularhrs} keyboardType="numeric" />

        <TouchableOpacity style={styles.btn} onPress={submit} disabled={saving}>
          <Text style={styles.btnText}>{saving ? 'Envoi...' : 'Ajouter'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingTop: 40, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  card: { margin: 16, backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  label: { fontSize: 12, color: '#64748b', fontWeight: '700', marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 6 },
  btn: { marginTop: 16, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800' },
});