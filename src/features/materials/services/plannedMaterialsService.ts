import axios from 'axios';
import { Buffer } from 'buffer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MAXIMO } from '../../../shared/config/maximoUrls';
import { rewriteMaximoOriginOnly } from '../../../shared/services/rewriteMaximoUrl';
import type { PlannedMaterialItem } from '../types/material.types';
import {
  getPlannedMaterialBarcode,
  savePlannedMaterialBarcode,
} from './barcodeStorage';

type AddPlannedMaterialPayload = {
  description: string;
  itemnum: string;
  itemqty: number;
  location: string;
  siteid: string;
  barcode?: string;
};

function makeLocalToken(username: string, password: string) {
  return Buffer.from(`${username}:${password}`).toString('base64');
}

function commonHeaders(token: string) {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    maxauth: token,
    Authorization: `Basic ${token}`,
    properties: '*',
    'x-method-override': 'PATCH',
    patchtype: 'MERGE',
  };
}

function readHeaders(token: string) {
  return {
    Accept: 'application/json',
    maxauth: token,
    Authorization: `Basic ${token}`,
  };
}

function buildPlannedWoUrl(workorderid?: string | number) {
  const safeId = String(workorderid ?? '').trim();
  if (!safeId) return '';

  const raw = `http://demo2.smartech-tn.com/maximo/oslc/os/SM1122/${safeId}`;
  return `${rewriteMaximoOriginOnly(raw)}?lean=1`;
}

function buildPlannedMaterialLocationKey(params: {
  wonum?: string | number;
  itemnum?: string;
  description?: string;
  quantity?: number;
}) {
  const wonum = String(params.wonum ?? '').trim();
  const itemnum = String(params.itemnum ?? '').trim().toUpperCase();
  const description = String(params.description ?? '').trim().toUpperCase();
  const quantity = String(params.quantity ?? '').trim();

  return `location:planned:${wonum}:${itemnum}:${description}:${quantity}`;
}

async function savePlannedMaterialLocation(params: {
  wonum?: string | number;
  itemnum: string;
  description?: string;
  quantity: number;
  location?: string;
}) {
  if (!params.wonum) return;

  const location = String(params.location ?? '').trim();
  if (!location) return;

  const key = buildPlannedMaterialLocationKey({
    wonum: params.wonum,
    itemnum: params.itemnum,
    description: params.description,
    quantity: params.quantity,
  });

  await AsyncStorage.setItem(key, location);

  console.log('💾 savePlannedMaterialLocation', {
    key,
    location,
    params,
  });
}

async function getPlannedMaterialLocation(params: {
  wonum?: string | number;
  itemnum: string;
  description?: string;
  quantity: number;
}) {
  if (!params.wonum) return '';

  const key = buildPlannedMaterialLocationKey({
    wonum: params.wonum,
    itemnum: params.itemnum,
    description: params.description,
    quantity: params.quantity,
  });

  const value = await AsyncStorage.getItem(key);

  console.log('📥 getPlannedMaterialLocation', {
    key,
    value,
    params,
  });

  return value || '';
}

async function getInventoryLocationByItemnum(params: {
  itemnum: string;
  siteid?: string;
  username: string;
  password: string;
}) {
  const itemnum = String(params.itemnum ?? '').trim();
  const siteid = String(params.siteid ?? '').trim();

  if (!itemnum) return '';

  const token = makeLocalToken(params.username, params.password);

  const where = siteid
    ? `itemnum="${itemnum}" and siteid="${siteid}"`
    : `itemnum="${itemnum}"`;

  const select = 'itemnum,siteid,location,binnum,curbal,issueunit';

  const url =
    `${MAXIMO.OSLC_OS}/mxinventory?lean=1` +
    `&oslc.select=${encodeURIComponent(select)}` +
    `&oslc.where=${encodeURIComponent(where)}`;

  console.log('🔎 [getInventoryLocationByItemnum] URL:', url);

  try {
    const res = await axios.get(url, {
      headers: readHeaders(token),
      timeout: 30000,
    });

    const members = Array.isArray(res.data?.member) ? res.data.member : [];

    const withStock = members.find((m: any) => Number(m?.curbal ?? 0) > 0);
    const first = withStock || members[0];

    const location = String(first?.location ?? '').trim();

    console.log('✅ [getInventoryLocationByItemnum] FOUND:', {
      itemnum,
      siteid,
      location,
      binnum: first?.binnum,
      curbal: first?.curbal,
    });

    return location;
  } catch (error: any) {
    console.log('❌ [getInventoryLocationByItemnum] ERROR:', error?.message);
    return '';
  }
}

export async function addPlannedMaterialRequest({
  wonum,
  workorderid,
  username,
  password,
  payload,
}: {
  wonum?: string | number;
  workorderid?: string | number;
  username: string;
  password: string;
  payload: AddPlannedMaterialPayload;
}) {
  const token = makeLocalToken(username, password);
  const url = buildPlannedWoUrl(workorderid);

  if (!url) {
    throw new Error('workorderid manquant.');
  }

  if (!wonum) {
    throw new Error('wonum manquant pour sauvegarder le code à barre.');
  }

  const body = {
    wpmaterial: [
      {
        description: payload.description,
        itemnum: payload.itemnum,
        itemqty: payload.itemqty,
        location: payload.location,
        siteid: payload.siteid,
      },
    ],
  };

  console.log('🚀 [addPlannedMaterial] URL:', url);
  console.log('🚀 [addPlannedMaterial] Body:', JSON.stringify(body, null, 2));

  try {
    const res = await axios.post(url, body, {
      headers: commonHeaders(token),
    });

    console.log('✅ [addPlannedMaterial] STATUS:', res.status);

    console.log('🟣 BEFORE SAVE PLANNED BARCODE', {
      wonum,
      itemnum: payload.itemnum,
      description: payload.description,
      quantity: payload.itemqty,
      location: payload.location,
      barcode: payload.barcode,
    });

    await savePlannedMaterialBarcode({
      wonum,
      itemnum: payload.itemnum,
      description: payload.description,
      quantity: payload.itemqty,
      barcode: payload.barcode,
    });

    await savePlannedMaterialLocation({
      wonum,
      itemnum: payload.itemnum,
      description: payload.description,
      quantity: payload.itemqty,
      location: payload.location,
    });

    return res.data;
  } catch (error: any) {
    console.log('❌ [addPlannedMaterial] MESSAGE:', error?.message);
    console.log('❌ [addPlannedMaterial] CODE:', error?.code);
    console.log('❌ [addPlannedMaterial] STATUS:', error?.response?.status);
    console.log(
      '❌ [addPlannedMaterial] DATA:',
      JSON.stringify(error?.response?.data, null, 2),
    );

    throw new Error(
      error?.response?.data?.Error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "Impossible d'ajouter le matériel planifié.",
    );
  }
}

export async function savePlannedMaterialLocally(params: {
  wonum?: string | number;
  itemnum: string;
  quantity: number;
  location: string;
  description?: string;
  barcode?: string;
}) {
  if (!params.wonum) return;

  await savePlannedMaterialBarcode({
    wonum: params.wonum,
    itemnum: params.itemnum,
    description: params.description,
    quantity: params.quantity,
    barcode: params.barcode,
  });

  await savePlannedMaterialLocation({
    wonum: params.wonum,
    itemnum: params.itemnum,
    description: params.description,
    quantity: params.quantity,
    location: params.location,
  });
}

export async function enrichPlannedMaterialsWithBarcode(params: {
  wonum?: string | number;
  siteid?: string;
  username?: string;
  password?: string;
  items: PlannedMaterialItem[];
}): Promise<PlannedMaterialItem[]> {
  const { wonum, siteid, username, password, items } = params;

  return Promise.all(
    (items || []).map(async item => {
      const quantity = Number(
        (item as any).quantity ?? (item as any).itemqty ?? 0,
      );

      const barcode = await getPlannedMaterialBarcode({
        wonum,
        itemnum: item.itemnum,
        description: item.description,
        quantity,
      });

      const savedLocation = await getPlannedMaterialLocation({
        wonum,
        itemnum: item.itemnum,
        description: item.description,
        quantity,
      });

      let inventoryLocation = '';

      if (!savedLocation && username && password) {
        inventoryLocation = await getInventoryLocationByItemnum({
          itemnum: item.itemnum,
          siteid,
          username,
          password,
        });
      }

      return {
        ...item,
        location:
          (item as any).location ||
          (item as any).storeloc ||
          (item as any).storeroom ||
          savedLocation ||
          inventoryLocation ||
          '',
        storeloc:
          (item as any).storeloc ||
          savedLocation ||
          inventoryLocation ||
          '',
        barcode: barcode || '',
      };
    }),
  );
}