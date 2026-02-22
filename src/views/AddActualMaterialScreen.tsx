import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FeatherIcon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { addActualMaterial } from '../services/workOrderDetailsService';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = { route: RouteProp<RootStackParamList, 'AddActualMaterial'> };

export default function AddActualMaterialScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const { woHref } = (route as any).params;

  const [itemnum, setItemnum] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [storeloc, setStoreloc] = useState('CENTRAL');
  const [issuetype, setIssuetype] = useState('ISSUE');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    try {
      if (!itemnum.trim()) {
        Alert.alert('Erreur', 'itemnum obligatoire');
        return;
      }

      const username = await AsyncStorage.getItem('@username');
      const password = await AsyncStorage.getItem('@password');
      if (!username || !password) throw new Error('Identifiants non trouvés');

      setSaving(true);

      await addActualMaterial(woHref, username, password, {
        itemnum: itemnum.trim(),
        quantity: Number(quantity || 0),
        storeloc: storeloc.trim(),
        issuetype: issuetype.trim(),
        });

      Alert.alert('Succès', 'Matériel réel ajouté');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Impossible d’ajouter le matériel');
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
        <Text style={styles.title}>Ajouter matériel réel</Text>
      </LinearGradient>

      <View style={styles.card}>
        <Text style={styles.label}>Item</Text>
        <TextInput style={styles.input} value={itemnum} onChangeText={setItemnum} placeholder="0-0514" />

        <Text style={styles.label}>Quantité</Text>
        <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="numeric" />

        <Text style={styles.label}>Storeloc</Text>
        <TextInput style={styles.input} value={storeloc} onChangeText={setStoreloc} />

        <Text style={styles.label}>Issuetype</Text>
        <TextInput style={styles.input} value={issuetype} onChangeText={setIssuetype} />

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