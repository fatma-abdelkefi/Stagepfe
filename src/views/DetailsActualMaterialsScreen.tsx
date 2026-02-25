import React, { useMemo } from 'react';
import { View, Text, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

import DetailsHeader from '../ui/details/DetailsHeader';
import { detailsStyles } from '../ui/details/detailsStyles';

type Props = { route: RouteProp<RootStackParamList, 'DetailsActualMaterials'> };

export default function DetailsActualMaterialsScreen({ route }: Props) {
  const workOrder = route.params.workOrder as any;

  const data = useMemo(
    () => (workOrder?.actualMaterials ?? []) as { itemnum: string; itemqty: number; description: string }[],
    [workOrder]
  );

  return (
    <SafeAreaView style={detailsStyles.container}>
      <DetailsHeader title="Matériel réel" subtitle={`OT #${workOrder?.wonum ?? '-'}`} />

      {data.length === 0 ? (
        <View style={detailsStyles.emptyContainer}>
          <Text style={detailsStyles.emptyText}>Aucun matériel réel.</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(_, idx) => String(idx)}
          contentContainerStyle={[detailsStyles.content, { paddingBottom: 24 }]}
          renderItem={({ item }) => (
            <View style={detailsStyles.card}>
              <View style={detailsStyles.rowBetween}>
                <Text style={detailsStyles.label}>Article</Text>
                <Text style={detailsStyles.value}>{item.itemnum || '-'}</Text>
              </View>
              <View style={detailsStyles.rowBetween}>
                <Text style={detailsStyles.label}>Quantité</Text>
                <Text style={detailsStyles.value}>{Number(item.itemqty || 0)}</Text>
              </View>
              <Text style={detailsStyles.description}>{item.description || '—'}</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}