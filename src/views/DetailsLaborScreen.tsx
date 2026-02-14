// src/views/DetailsLaborScreen.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = {
  route: RouteProp<RootStackParamList, 'DetailsLabor'>;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'DetailsLabor'>;

export default function DetailsLaborScreen({ route }: Props) {
  const navigation = useNavigation<NavigationProp>();
  const { workOrder } = route.params;
  const labor = workOrder?.labor ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <FeatherIcon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Main d'œuvre - #{workOrder?.wonum}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {labor.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FeatherIcon name="inbox" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>Aucune main d'œuvre enregistrée</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            <Text style={styles.sectionInfo}>
              {labor.length} entr{ labor.length === 1 ? 'ée' : 'ées' }
            </Text>

            {labor.map((item: any, index: number) => (
              <View key={index} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={styles.iconContainer}>
                    <FeatherIcon name="user" size={24} color="#3b82f6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>
                      {item.laborcode || item.taskid || 'Main d\'œuvre'}
                    </Text>
                    {item.labhrs && <Text style={styles.subtitle}>Heures : {item.labhrs} h</Text>}
                  </View>
                </View>
                <Text style={styles.description}>{item.description || 'Aucune description'}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // same styles as DetailsActivitiesScreen
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#3b82f6',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  content: { flex: 1, padding: 16 },
  sectionInfo: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 16,
  },
  listContainer: { paddingBottom: 24 },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#3b82f6', marginTop: 4, fontWeight: '600' },
  description: { fontSize: 15, color: '#334155', lineHeight: 22 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 120,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center',
  },
});