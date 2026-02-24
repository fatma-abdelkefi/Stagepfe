// src/views/DetailsActualLaborScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { RootStackParamList } from '../navigation/AppNavigator';
import DetailsHeader from '../ui/details/DetailsHeader';
import { detailsStyles } from '../ui/details/detailsStyles';
import ErrorModal from '../components/ErrorModal';

import {
  getActualsFromWoHref,
  normalizeOslcHref,
  type ActualLaborItem,
} from '../services/workOrderDetailsService';
import { rewriteMaximoUrl } from '../services/rewriteMaximoUrl';

type Props = { route: RouteProp<RootStackParamList, 'DetailsActualLabor'> };

function safeTrim(v: any): string {
  return typeof v === 'string' ? v.trim() : String(v ?? '').trim();
}

function normalizeHref(href: any): string {
  const u = safeTrim(href);
  if (!u) return '';
  return normalizeOslcHref(rewriteMaximoUrl(u)).replace(/\/+$/, '');
}

export default function DetailsActualLaborScreen({ route }: Props) {
  const { workOrder } = route.params;

  const wonum = useMemo(() => safeTrim(workOrder?.wonum), [workOrder?.wonum]);
  const woHref = useMemo(() => normalizeHref((workOrder as any)?.href), [workOrder]);

  const fallback = useMemo<ActualLaborItem[]>(
    () => ((workOrder as any)?.actualLabor ?? []) as ActualLaborItem[],
    [workOrder]
  );

  const [items, setItems] = useState<ActualLaborItem[]>(fallback);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchActualLabor = useCallback(
    async (mode: 'initial' | 'refresh') => {
      try {
        mode === 'initial' ? setLoading(true) : setRefreshing(true);

        if (!woHref) {
          setItems(fallback);
          return;
        }

        const username = await AsyncStorage.getItem('@username');
        const password = await AsyncStorage.getItem('@password');
        if (!username || !password) throw new Error('Identifiants non trouvés');

        const res = await getActualsFromWoHref(woHref, username, password);
        setItems(res.actualLabor || []);
      } catch (e: any) {
        const msg = String(e?.message ?? 'Erreur lors du chargement');
        console.log('[DetailsActualLabor] fetch error:', msg);
        setErrorMessage(msg);
        setErrorVisible(true);
        setItems((prev) => (prev?.length ? prev : fallback));
      } finally {
        mode === 'initial' ? setLoading(false) : setRefreshing(false);
      }
    },
    [woHref, fallback]
  );

  useEffect(() => {
    fetchActualLabor('initial');
  }, [fetchActualLabor]);

  useFocusEffect(
    useCallback(() => {
      fetchActualLabor('refresh');
      return () => {};
    }, [fetchActualLabor])
  );

  const totalHours = useMemo(
    () => items.reduce((sum, x) => sum + (Number(x.regularhrs) || 0), 0),
    [items]
  );

  return (
    <SafeAreaView style={detailsStyles.container}>
      <DetailsHeader
        title="Main d'œuvre réelle"
        subtitle={`OT #${wonum || '-'} • Total: ${totalHours.toFixed(2)} h`}
      />

      <ScrollView
        style={detailsStyles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchActualLabor('refresh')}
          />
        }
      >
        {loading && items.length === 0 ? (
          <View style={detailsStyles.emptyContainer}>
            <FeatherIcon name="loader" size={48} color="#cbd5e1" />
            <Text style={detailsStyles.emptyText}>Chargement...</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={detailsStyles.emptyContainer}>
            <FeatherIcon name="inbox" size={64} color="#cbd5e1" />
            <Text style={detailsStyles.emptyText}>Aucune main d'œuvre réelle</Text>
          </View>
        ) : (
          <View style={detailsStyles.listContainer}>
            <Text style={detailsStyles.sectionInfo}>
              {items.length} main{items.length !== 1 ? 's' : ''} d'œuvre réelle
            </Text>

            {items.map((item, index) => (
              <View key={index} style={detailsStyles.card}>
                <View style={styles.itemHeader}>
                  <View style={detailsStyles.iconContainer}>
                    <FeatherIcon name="user-check" size={24} color="#0ea5e9" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={detailsStyles.title}>{item.laborcode || '—'}</Text>
                    <Text style={detailsStyles.subtitle}>
                      Heures : {Number(item.regularhrs || 0)} h
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

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
  itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
});
