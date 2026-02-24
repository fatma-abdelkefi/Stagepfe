import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

import DetailsHeader from '../ui/details/DetailsHeader';
import { detailsStyles } from '../ui/details/detailsStyles';

type Props = { route: RouteProp<RootStackParamList, 'DetailsLabor'> };

export default function DetailsLaborScreen({ route }: Props) {
  const { workOrder } = route.params;
  const labor = workOrder?.labor ?? [];

  return (
    <SafeAreaView style={detailsStyles.container}>
      <DetailsHeader title="Main d'œuvre planifiée" subtitle={`OT #${workOrder?.wonum ?? '-'}`} />

      <ScrollView style={detailsStyles.content} showsVerticalScrollIndicator={false}>
        {labor.length === 0 ? (
          <View style={detailsStyles.emptyContainer}>
            <FeatherIcon name="inbox" size={64} color="#cbd5e1" />
            <Text style={detailsStyles.emptyText}>Aucune main d'œuvre enregistrée</Text>
          </View>
        ) : (
          <View style={detailsStyles.listContainer}>
            <Text style={detailsStyles.sectionInfo}>
              {labor.length} Main d'œuvre planifié{labor.length !== 1 ? 's' : ''}
            </Text>

            {labor.map((item: any, index: number) => (
              <View key={index} style={detailsStyles.card}>
                <View style={styles.itemHeader}>
                  <View style={detailsStyles.iconContainer}>
                    <FeatherIcon name="user" size={24} color="#3b82f6" />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={detailsStyles.title}>{item.laborcode || item.taskid || "Main d'œuvre"}</Text>
                    {!!item.labhrs && <Text style={detailsStyles.subtitle}>Heures : {item.labhrs} h</Text>}
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