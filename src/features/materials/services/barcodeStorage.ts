import AsyncStorage from '@react-native-async-storage/async-storage';

function norm(value: unknown) {
  return String(value ?? '').trim().toUpperCase();
}

function plannedKey(params: {
  wonum?: string | number;
  itemnum?: string;
  description?: string;
  quantity?: string | number;
}) {
  return `barcode:planned:${norm(params.wonum)}:${norm(params.itemnum)}:${norm(
    params.description,
  )}:${norm(params.quantity)}`;
}
function actualKey(params: {
  wonum?: string | number;
  matusetransid?: string | number;
}) {
  return `barcode:actual:${norm(params.wonum)}:${norm(params.matusetransid)}`;
}

function actualPendingKey(params: {
  wonum?: string | number;
  itemnum?: string;
  storeroom?: string;
  itemqty?: string | number;
}) {
  return `barcode:actual:pending:${norm(params.wonum)}:${norm(
    params.itemnum,
  )}:${norm(params.storeroom)}:${norm(params.itemqty)}`;
}

export async function savePlannedMaterialBarcode(params: {
  wonum?: string | number;
  itemnum?: string;
  description?: string;
  quantity?: string | number;
  barcode?: string;
}) {
  const key = plannedKey(params);
  const value = String(params.barcode ?? '').trim();

  if (!value) return;

  console.log('💾 savePlannedMaterialBarcode', { key, value, params });
  await AsyncStorage.setItem(key, value);
}

export async function getPlannedMaterialBarcode(params: {
  wonum?: string | number;
  itemnum?: string;
  description?: string;
  quantity?: string | number;
}) {
  const key = plannedKey(params);
  const value = await AsyncStorage.getItem(key);

  console.log('📥 getPlannedMaterialBarcode', { key, value, params });
  return String(value ?? '').trim();
}

export async function saveActualMaterialBarcodePending(params: {
  wonum?: string | number;
  itemnum?: string;
  storeroom?: string;
  itemqty?: string | number;
  barcode?: string;
}) {
  const key = actualPendingKey(params);
  const value = String(params.barcode ?? '').trim();

  if (!value) return;

  console.log('💾 saveActualMaterialBarcodePending', { key, value });
  await AsyncStorage.setItem(key, value);
}

export async function getActualMaterialBarcode(params: {
  wonum?: string | number;
  matusetransid?: string | number;
  itemnum?: string;
  storeroom?: string;
  itemqty?: string | number;
}) {
  if (params.matusetransid) {
    const key = actualKey(params);
    const value = await AsyncStorage.getItem(key);

    if (value) {
      console.log('📥 getActualMaterialBarcode ID HIT', { key, value });
      return value.trim();
    }
  }

  const pendingKey = actualPendingKey(params);
  const pendingValue = await AsyncStorage.getItem(pendingKey);

  console.log('📥 getActualMaterialBarcode PENDING', {
    key: pendingKey,
    value: pendingValue,
  });

  if (pendingValue && params.matusetransid) {
    const finalKey = actualKey(params);
    await AsyncStorage.setItem(finalKey, pendingValue);
    await AsyncStorage.removeItem(pendingKey);

    console.log('🔁 migrate barcode pending -> id', {
      from: pendingKey,
      to: finalKey,
      value: pendingValue,
    });
  }

  return String(pendingValue ?? '').trim();
}
export async function saveLocalActualMaterial(params: {
  wonum?: string | number;
  itemnum: string;
  itemqty: number;
  storeroom: string;
  issuetype: string;
  siteid: string;
  barcode?: string;
}) {
  const key = `local:actual:${norm(params.wonum)}`;
  const oldValue = await AsyncStorage.getItem(key);
  const oldItems = oldValue ? JSON.parse(oldValue) : [];

  const newItem = {
    id: `local-${Date.now()}`,
    itemnum: params.itemnum,
    itemqty: params.itemqty,
    description: params.itemnum,
    storeroom: params.storeroom,
    issuetype: params.issuetype,
    siteid: params.siteid,
    barcode: params.barcode ?? '',
    localOnly: true,
  };

  await AsyncStorage.setItem(key, JSON.stringify([newItem, ...oldItems]));
}

export async function getLocalActualMaterials(params: {
  wonum?: string | number;
}) {
  const key = `local:actual:${norm(params.wonum)}`;
  const value = await AsyncStorage.getItem(key);

  return value ? JSON.parse(value) : [];
}