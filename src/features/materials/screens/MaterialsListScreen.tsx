import React, { useMemo } from 'react';
import { FlatList } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../../app/navigation/types';
import ListDetailsLayout from '../../../shared/ui/list-details/ListDetailsLayout';
import ListItemCard from '../../../shared/ui/list-details/ListItemCard';
import ListEmptyState from '../../../shared/ui/list-details/ListEmptyState';

type Props = {
  route: RouteProp<RootStackParamList, 'MaterialsList'>;
};

function getMaterialLocation(item: any): string {
  return String(
    item?.storeloc ||
      item?.storeroom ||
      item?.location ||
      item?.locationnum ||
      item?.binnum ||
      item?.assetloc ||
      item?.invreserve?.storeloc ||
      item?.invreserve?.location ||
      item?.wpitem?.storeloc ||
      item?.wpitem?.location ||
      '',
  ).trim();
}

export default function MaterialsListScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const { title, wonum, items, mode } = route.params;

  const normalizedItems = useMemo(() => {
    return (items || []).map((item: any, index: number) => ({
      id: item.id ?? `${mode}-${index}`,
      itemnum: item.itemnum ?? '—',
      description: item.description ?? 'Aucune description',
      quantity:
        mode === 'actual'
          ? Number(item.itemqty ?? item.quantity ?? 0)
          : Number(item.quantity ?? item.itemqty ?? 0),
      location: getMaterialLocation(item),
      storeroom: item.storeroom ?? '',
      storeloc: item.storeloc ?? '',
      siteid: item.siteid ?? '',
      issuetype: item.issuetype ?? '',
      barcode: item.barcode ?? '',
      taskid: item.taskid ?? '',
    }));
  }, [items, mode]);

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
          title="Aucun matériel"
          subtitle="Aucun élément disponible pour cette catégorie."
        />
      ) : (
        <FlatList
          data={normalizedItems}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ListItemCard
              icon={mode === 'actual' ? 'clipboard' : 'package'}
              title={mode === 'planned' ? 'Matériel planifié' : 'Matériel réel'}
              subtitle={undefined}
              description={undefined}
              details={
                mode === 'planned'
                  ? [
                      { label: "Numéro d'article", value: item.itemnum || '—' },
                      { label: 'Description', value: item.description || '—' },
                      { label: 'Quantité', value: item.quantity || '—' },
                      { label: 'Emplacement', value: item.location || '—' },
                      {
                        label: 'Code à barre',
                        value: item.barcode || 'Aucun code à barre',
                      },
                    ]
                  : [
                      { label: "Numéro d'article", value: item.itemnum || '—' },
                      { label: 'Quantité', value: item.quantity || '—' },
                      {
                        label: 'Magasin',
                        value:
                          item.storeroom ||
                          item.storeloc ||
                          item.location ||
                          '—',
                      },
                      { label: 'Type de sortie', value: item.issuetype || '—' },
                      {
                        label: 'Code à barre',
                        value: item.barcode || 'Aucun code à barre',
                      },
                    ]
              }
            />
          )}
        />
      )}
    </ListDetailsLayout>
  );
}