import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

import DetailsHeader from '../ui/details/DetailsHeader';
import { detailsStyles } from '../ui/details/detailsStyles';

type Props = { route: RouteProp<RootStackParamList, 'DetailsActualLabor'> };

export default function DetailsActualLaborScreen({ route }: Props) {
  const workOrder = route.params.workOrder as any;

  const data = useMemo(
    () => (workOrder?.actualLabor ?? []) as { laborcode: string; regularhrs: number }[],
    [workOrder]
  );

  return (
    <SafeAreaView style={detailsStyles.container}>
      <DetailsHeader title="Main d'œuvre réelle" subtitle={`OT #${workOrder?.wonum ?? '-'}`} />

      {data.length === 0 ? (
        <View style={detailsStyles.emptyContainer}>
          <Text style={detailsStyles.emptyText}>Aucune main d'œuvre réelle.</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(_, idx) => String(idx)}
          contentContainerStyle={[detailsStyles.content, { paddingBottom: 24 }]}
          renderItem={({ item }) => (
            <View style={detailsStyles.card}>
              <View style={detailsStyles.rowBetween}>
                <Text style={detailsStyles.label}>Code</Text>
                <Text style={detailsStyles.value}>{item.laborcode || '-'}</Text>
              </View>
              <View style={detailsStyles.rowBetween}>
                <Text style={detailsStyles.label}>Heures</Text>
                <Text style={detailsStyles.value}>{Number(item.regularhrs || 0).toFixed(2)}</Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({});