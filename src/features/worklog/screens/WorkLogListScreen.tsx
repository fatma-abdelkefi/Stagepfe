import React, { useMemo } from 'react';
import { FlatList } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../../app/navigation/types';

import ListDetailsLayout from '../../../shared/ui/list-details/ListDetailsLayout';
import ListItemCard from '../../../shared/ui/list-details/ListItemCard';
import ListEmptyState from '../../../shared/ui/list-details/ListEmptyState';
import { formatDateTime } from '../utils/worklogFormatters';

type Props = {
  route: RouteProp<RootStackParamList, 'WorkLogList'>;
};

export default function WorkLogListScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const { title, wonum, items } = route.params;

  const normalizedItems = useMemo(() => {
    return (items || []).map((item: any, index: number) => ({
      id:
        item.worklogid ??
        item.localref ??
        item.href ??
        `worklog-${wonum}-${index}`,
      title: item.logtype_description || item.logtype || 'Work Log',
      subtitle: formatDateTime(item.createdate),
      meta: item.createby || '',
      description: item.description || 'Aucune description',
      raw: {
        ...item,
        localref: item.localref || item.href || '',
        href: item.href || '',
      },
    }));
  }, [items, wonum]);

  return (
    <ListDetailsLayout
      title={title}
      subtitle={`OT #${wonum}`}
      badgeText={`${normalizedItems.length} élément${normalizedItems.length !== 1 ? 's' : ''}`}
      onBack={() => navigation.goBack()}
      scroll={false}
    >
      {normalizedItems.length === 0 ? (
        <ListEmptyState
          title="Aucun work log"
          subtitle="Aucun work log disponible pour cet OT."
        />
      ) : (
        <FlatList
          data={normalizedItems}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <ListItemCard
              icon="file-text"
              title={item.title}
              subtitle={item.subtitle}
              meta={item.meta}
              description={item.description}
              onPress={() =>
                navigation.navigate('WorkLogDetails', {
                  title,
                  wonum,
                  item: item.raw,
                })
              }
            />
          )}
        />
      )}
    </ListDetailsLayout>
  );
}