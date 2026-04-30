import React from 'react';
import { FlatList, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import ListDetailsLayout from '../../../shared/ui/list-details/ListDetailsLayout';
import ListItemCard from '../../../shared/ui/list-details/ListItemCard';
import ListEmptyState from '../../../shared/ui/list-details/ListEmptyState';

import { useDoclinksListViewModel } from '../viewmodels/useDoclinksListViewModel';

export default function DoclinksListScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const { doclinks, wonum } = useDoclinksListViewModel(route.params);

  return (
    <ListDetailsLayout
      title="Documents"
      subtitle={`OT #${wonum || '-'}`}
      badgeText={`${doclinks.length} élément${doclinks.length > 1 ? 's' : ''}`}
      onBack={() => navigation.goBack()}
      scroll={false}
    >
      <FlatList
        data={doclinks}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: doclinks.length === 0 ? 0 : 12,
          flexGrow: doclinks.length === 0 ? 1 : 0,
        }}
        ListEmptyComponent={<ListEmptyState title="Aucun document" />}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() =>
              navigation.navigate('DoclinkDetails', {
                document: item.raw,
              })
            }
          >
            <ListItemCard
              icon="file-text"
              title={item.document}
              subtitle="Document"
              meta={item.createdate || ''}
              description={item.description}
            />
          </TouchableOpacity>
        )}
      />
    </ListDetailsLayout>
  );
}