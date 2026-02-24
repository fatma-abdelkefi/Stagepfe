// src/views/DetailsActualMaterialsScreen.tsx
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
  type ActualMaterialItem,
} from '../services/workOrderDetailsService';
import { rewriteMaximoUrl } from '../services/rewriteMaximoUrl';

type Props = { route: RouteProp<RootStackParamList, 'DetailsActualMaterials'> };

function safeTrim(v: any): string {
  return typeof v === 'string' ? v.trim() : String(v ?? '').trim();
}

function normalizeHref(href: any): string {
  const u = safeTrim(href);
  if (!u) return '';
  return normalizeOslcHref(rewriteMaximoUrl(u)).replace(/\/+$/, '');
}

export default function DetailsActualMaterialsScreen({ route }: Props) {
  const { workOrder } = route.params as any;

  const wonum = useMemo(() => safeTrim(workOrder?.wonum), [workOrder?.wonum]);
  const woHref = useMemo(() => normalizeHref(workOrder?.href), [workOrder?.href]);

  // Start with whatever was passed in route params as fallback
  const fallback = useMemo<ActualMaterialItem[]>(
    () => (workOrder?.actualMaterials ?? []) as ActualMaterialItem[],
    [workOrder]
  );

  const [items, setItems] = useState<ActualMaterialItem[]>(fallback);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchActualMaterials = useCallback(
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
        setItems(res.actualMaterials || []);
      } catch (e: any) {
        const msg = String(e?.message ?? 'Erreur lors du chargement');
        console.log('[DetailsActualMaterials] fetch error:', msg);
        setErrorMessage(msg);
        setErrorVisible(true);
        setItems((prev) => (prev?.length ? prev : fallback));
      } finally {
        mode === 'initial' ? setLoading(false) : setRefreshing(false);
      }
    },
    [woHref, fallback]
  );

  // Initial load
  useEffect(() => {
    fetchActualMaterials('initial');
  }, [fetchActualMaterials]);

  // ✅ Re-fetch every time screen gains focus (catches return from AddActualMaterial)
  useFocusEffect(
    useCallback(() => {
      fetchActualMaterials('refresh');
      return () => {};
    }, [fetchActualMaterials])
  );

  return (
    <SafeAreaView style={detailsStyles.container}>
      <DetailsHeader
        title="Matériel réel"
        subtitle={`OT #${wonum || '-'}`}
      />

      <ScrollView
        style={detailsStyles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchActualMaterials('refresh')}
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
            <Text style={detailsStyles.emptyText}>Aucun matériel réel</Text>
          </View>
        ) : (
          <View style={detailsStyles.listContainer}>
            <Text style={detailsStyles.sectionInfo}>
              {items.length} article{items.length !== 1 ? 's' : ''}
            </Text>

            {items.map((item, index) => (
              <View key={index} style={detailsStyles.card}>
                <View style={styles.itemHeader}>
                  <View style={detailsStyles.iconContainer}>
                    <FeatherIcon name="clipboard" size={24} color="#0ea5e9" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={detailsStyles.title}>{item.itemnum || '—'}</Text>
                    <Text style={detailsStyles.subtitle}>
                      Quantité : {Number(item.itemqty || 0)}
                    </Text>
                    {!!item.description && item.description !== '—' && (
                      <Text style={detailsStyles.description}>{item.description}</Text>
                    )}
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
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
