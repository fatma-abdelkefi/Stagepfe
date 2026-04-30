import React, { useEffect, useState } from 'react';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../../app/navigation/types';
import { useAuth } from '../../../app/providers/AuthProvider';
import { getActualLaborByWoHref } from '../services/actualLaborService';
import ListDetailsLayout from '../../../shared/ui/list-details/ListDetailsLayout';
import ListItemCard from '../../../shared/ui/list-details/ListItemCard';
import ListEmptyState from '../../../shared/ui/list-details/ListEmptyState';

type Props = {
  route: RouteProp<RootStackParamList, 'DetailsActualLabor'>;
};

export default function DetailsActualLaborScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const { woHref, wonum } = route.params;
  const { username, password } = useAuth();

  const [labor, setLabor] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!username || !password || !woHref) {
        setLoading(false);
        return;
      }

      try {
        const data = await getActualLaborByWoHref(woHref, username, password);
        setLabor(data);
      } catch (e) {
        console.log(e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [woHref, username, password]);

  return (
    <ListDetailsLayout
      title="Main d'œuvre réelle"
      subtitle={`OT #${wonum || '-'}`}
      badgeText={`${labor.length} élément${labor.length !== 1 ? 's' : ''}`}
      onBack={() => navigation.goBack()}
    >
      {loading ? (
        <ListEmptyState title="Chargement..." />
      ) : labor.length === 0 ? (
        <ListEmptyState title="Aucune main d'œuvre réelle" />
      ) : (
        labor.map((item, index) => (
          <ListItemCard
            key={index}
            icon="user"
            title={item.laborcode || '—'}
            subtitle={`Heures : ${item.regularhrs} h`}
          />
        ))
      )}
    </ListDetailsLayout>
  );
}