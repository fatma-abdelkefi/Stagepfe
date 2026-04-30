import React from 'react';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../../app/navigation/types';
import ListDetailsLayout from '../../../shared/ui/list-details/ListDetailsLayout';
import ListItemCard from '../../../shared/ui/list-details/ListItemCard';
import ListEmptyState from '../../../shared/ui/list-details/ListEmptyState';

type Props = {
  route: RouteProp<RootStackParamList, 'DetailsPlannedLabor'>;
};

function parseHours(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;

  const s = String(val).trim();
  if (!s) return 0;

  if (s.includes(':')) {
    const [h, m] = s.split(':').map(Number);
    return (h || 0) + ((m || 0) / 60);
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export default function DetailsPlannedLaborScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const { workOrder } = route.params;
  const labor = workOrder?.labor ?? [];

  return (
    <ListDetailsLayout
      title="Main d'œuvre planifiée"
      subtitle={`OT #${workOrder?.wonum ?? '-'}`}
      badgeText={`${labor.length} élément${labor.length !== 1 ? 's' : ''}`}
      onBack={() => navigation.goBack()}
    >
      {labor.length === 0 ? (
        <ListEmptyState title="Aucune main d'œuvre enregistrée" />
      ) : (
        labor.map((item: any, index: number) => (
          <ListItemCard
            key={index}
            icon="user"
            title={item.laborcode || item.taskid || "Main d'œuvre"}
            subtitle={`Heures : ${parseHours(item.labhrs)} h`}
            meta={item.quantity ? `Quantité : ${item.quantity}` : ''}
            description={item.description || 'Aucune description'}
          />
        ))
      )}
    </ListDetailsLayout>
  );
}