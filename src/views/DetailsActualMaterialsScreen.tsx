// src/screens/DetailsActualMaterialsScreen.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import FeatherIcon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = { route: RouteProp<RootStackParamList, 'DetailsActualMaterials'> };
type NavProp = NativeStackNavigationProp<RootStackParamList, 'DetailsActualMaterials'>;

export default function DetailsActualMaterialsScreen({ route }: Props) {
  const navigation = useNavigation<NavProp>();
  const workOrder = route.params.workOrder as any;

  const data = useMemo(
    () => (workOrder?.actualMaterials ?? []) as { itemnum: string; itemqty: number; description: string }[],
    [workOrder]
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#005ed1', '#0ea5e9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <FeatherIcon name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Matériel réel</Text>
            <Text style={styles.subtitle}>OT #{workOrder?.wonum || '-'}</Text>
          </View>

          <View style={styles.backBtn} />
        </View>
      </LinearGradient>

      {data.length === 0 ? (
        <View style={styles.empty}>
          <FeatherIcon name="info" size={28} color="#64748b" />
          <Text style={styles.emptyText}>Aucun matériel réel.</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(_, idx) => String(idx)}
          contentContainerStyle={{ padding: 14 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.label}>Article</Text>
                <Text style={styles.value}>{item.itemnum || '-'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Quantité</Text>
                <Text style={styles.value}>{Number(item.itemqty || 0)}</Text>
              </View>
              <Text style={styles.desc}>{item.description || '—'}</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, paddingTop: 10, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.9)', marginTop: 2, fontSize: 13, fontWeight: '600' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { color: '#64748b', fontWeight: '700' },

  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { color: '#64748b', fontWeight: '700' },
  value: { color: '#0f172a', fontWeight: '800' },
  desc: { marginTop: 6, color: '#334155', fontWeight: '600' },
});