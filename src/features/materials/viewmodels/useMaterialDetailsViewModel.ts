import { useMemo } from 'react';
import type {
  ActualMaterialItem,
  PlannedMaterialItem,
  NormalizedMaterialItem,
} from '../types/material.types';

export function useMaterialDetailsViewModel({
  items,
  mode,
}: {
  items: PlannedMaterialItem[] | ActualMaterialItem[];
  mode: 'planned' | 'actual';
}) {
  const normalizedItems = useMemo<NormalizedMaterialItem[]>(() => {
    return (items || []).map((item: any, index: number) => ({
      id: item.id ?? `${mode}-${index}`,
      itemnum: item.itemnum || '—',
      description: item.description || 'Aucune description',
      quantity:
        mode === 'actual'
          ? Number(item.itemqty ?? 0)
          : Number(item.quantity ?? 0),
      location:
        mode === 'actual'
          ? (item.storeroom ?? item.storeloc ?? '')
          : (item.location ?? ''),
      barcode: item.barcode ?? '',
    }));
  }, [items, mode]);

  return {
    normalizedItems,
    isEmpty: normalizedItems.length === 0,
    total: normalizedItems.length,
  };
}