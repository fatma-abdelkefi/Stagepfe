import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import FeatherIcon from 'react-native-vector-icons/Feather';

import { RootStackParamList } from '../navigation/AppNavigator';
import { useWorkOrderFailureReport } from '../viewmodels/useWorkOrderFailureReport';

type Props = {
  route: RouteProp<RootStackParamList, 'FailureReportingDetails'>;
};

type NavProp = NativeStackNavigationProp<RootStackParamList>;

function safeTrim(v: any): string {
  return typeof v === 'string' ? v.trim() : String(v ?? '').trim();
}

export default function FailureReportingDetailsScreen({ route }: Props) {
  const navigation = useNavigation<NavProp>();
  const workOrder = route.params.workOrder;

  const wonum = safeTrim(workOrder?.wonum || '');
  const siteid = safeTrim((workOrder as any)?.siteid || '');

  const {
    data,
    loading,
    error,
    refresh,
  } = useWorkOrderFailureReport(wonum, siteid);

  const rows = useMemo(() => {
    return data?.codes || [];
  }, [data]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.8}
        >
          <FeatherIcon name="chevron-left" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Failure Reporting</Text>
          <Text style={styles.headerSubTitle}>OT #{wonum || '-'}</Text>
        </View>

        <TouchableOpacity
          onPress={refresh}
          style={styles.refreshButton}
          activeOpacity={0.8}
        >
          <FeatherIcon name="refresh-cw" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.helperText}>Chargement du failure reporting...</Text>
          </View>
        ) : error ? (
          <View style={styles.card}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Classe de panne</Text>

              <View style={styles.rowBlock}>
                <Text style={styles.label}>Code</Text>
                <Text style={styles.value}>{safeTrim(data?.failureClass) || '-'}</Text>
              </View>

              <View style={styles.rowBlock}>
                <Text style={styles.label}>Description</Text>
                <Text style={styles.value}>
                  {safeTrim(data?.failureClassDescription) || '-'}
                </Text>
              </View>

              <View style={styles.rowBlock}>
                <Text style={styles.label}>Date de défaillance</Text>
                <Text style={styles.value}>{safeTrim(data?.failureDate) || '-'}</Text>
              </View>

              <View style={styles.rowBlock}>
                <Text style={styles.label}>Date de remarque</Text>
                <Text style={styles.value}>{safeTrim(data?.remarkDate) || '-'}</Text>
              </View>

              <View style={styles.rowBlock}>
                <Text style={styles.label}>Remarque</Text>
                <Text style={styles.value}>{safeTrim(data?.remark) || '-'}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Codes de panne existants</Text>

              {rows.length === 0 ? (
                <Text style={styles.helperText}>Aucun code failure trouvé.</Text>
              ) : (
                rows.map((row, index) => (
                  <View key={`${row.type}-${row.code}-${index}`} style={styles.failureItem}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{row.type}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.code}>{row.code}</Text>
                      <Text style={styles.desc}>{row.description || '-'}</Text>
                    </View>

                    <FeatherIcon name="check-circle" size={16} color="#10b981" />
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  header: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  refreshButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubTitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#dbeafe',
  },
  container: {
    padding: 14,
    paddingBottom: 24,
  },
  centerBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  helperText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748b',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  rowBlock: {
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 3,
  },
  value: {
    fontSize: 14,
    color: '#0f172a',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
  failureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  badge: {
    minWidth: 78,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginRight: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
  },
  code: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  desc: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748b',
  },
});