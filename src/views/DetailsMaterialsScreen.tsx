import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

import DetailsHeader from '../ui/details/DetailsHeader';
import { detailsStyles } from '../ui/details/detailsStyles';

type Props = { route: RouteProp<RootStackParamList, 'DetailsMaterials'> };

export default function DetailsMaterialsScreen({ route }: Props) {
  const { workOrder } = route.params;
  const materials = workOrder?.materials ?? [];

  return (
    <SafeAreaView style={detailsStyles.container}>
      <DetailsHeader title="Matériel planifié" subtitle={`OT #${workOrder?.wonum ?? '-'}`} />

      <ScrollView style={detailsStyles.content} showsVerticalScrollIndicator={false}>
        {materials.length === 0 ? (
          <View style={detailsStyles.emptyContainer}>
            <FeatherIcon name="inbox" size={64} color="#cbd5e1" />
            <Text style={detailsStyles.emptyText}>Aucun matériel utilisé</Text>
          </View>
        ) : (
          <View style={detailsStyles.listContainer}>
            <Text style={detailsStyles.sectionInfo}>
              {materials.length} Materiéls planifié{materials.length !== 1 ? 's' : ''}
            </Text>

            {materials.map((item: any, index: number) => (
              <View key={index} style={detailsStyles.card}>
                <View style={styles.itemHeader}>
                  <View style={detailsStyles.iconContainer}>
                    <FeatherIcon name="package" size={24} color="#3b82f6" />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={detailsStyles.title}>{item.itemnum || 'N/A'}</Text>
                    {!!item.quantity && <Text style={detailsStyles.subtitle}>Quantité : {item.quantity}</Text>}
                  </View>
                </View>

                <Text style={detailsStyles.description}>{item.description || 'Aucune description'}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
});