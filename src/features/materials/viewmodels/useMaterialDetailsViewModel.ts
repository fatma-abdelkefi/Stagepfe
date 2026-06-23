import { useMemo } from 'react';
import type {
  ActualMaterialItem,
  PlannedMaterialItem,
  NormalizedMaterialItem,
} from '../types/material.types';

function getLocationValue(item: any): string {
  return String(
    item?.location ||
      item?.storeloc ||
      item?.storeroom ||
      item?.binnum ||
      '',
  ).trim();
}

export function useMaterialDetailsViewModel({
  items,
  mode,
}: {
  items: PlannedMaterialItem[] | ActualMaterialItem[];
  mode: 'planned' | 'actual';
}) {
  const normalizedItems = useMemo<NormalizedMaterialItem[]>(() => {
    console.log('🧪 MATERIAL MODE =', mode);
    console.log('🧪 MATERIAL RAW ITEMS =', JSON.stringify(items, null, 2));

    return (items || []).map((item: any, index: number) => ({
      id: item.id ?? `${mode}-${index}`,
      itemnum: item.itemnum || '—',
      description: item.description || 'Aucune description',
      quantity:
        mode === 'actual'
          ? Number(item.itemqty ?? item.quantity ?? 0)
          : Number(item.quantity ?? item.itemqty ?? 0),
      location:
        item.location ||
        item.storeloc ||
        item.storeroom ||
        item.binnum ||
        '',
      storeroom: item.storeroom ?? '',
      storeloc: item.storeloc ?? '',
      siteid: item.siteid ?? '',
      issuetype: item.issuetype ?? '',
      barcode: item.barcode ?? '',
      taskid: item.taskid ?? '',
    }));
  }, [items, mode]);

  return {
    normalizedItems,
    isEmpty: normalizedItems.length === 0,
    total: normalizedItems.length,
  };
}