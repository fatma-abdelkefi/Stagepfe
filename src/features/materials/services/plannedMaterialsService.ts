import axios from 'axios';
import { Buffer } from 'buffer';
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

function buildPlannedWoUrl(workorderid?: string | number) {
  const safeId = String(workorderid ?? '').trim();
  if (!safeId) return '';

  const raw = `http://demo2.smartech-tn.com/maximo/oslc/os/SM1122/${safeId}`;
  return `${rewriteMaximoOriginOnly(raw)}?lean=1`;
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
  barcode: payload.barcode,
});

    await savePlannedMaterialBarcode({
        wonum,
        itemnum: payload.itemnum,
        description: payload.description,
        quantity: payload.itemqty,
        barcode: payload.barcode,
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
    barcode: params.barcode,
  });
}

export async function enrichPlannedMaterialsWithBarcode(params: {
  wonum?: string | number;
  items: PlannedMaterialItem[];
}): Promise<PlannedMaterialItem[]> {
  const { wonum, items } = params;

  return Promise.all(
    (items || []).map(async item => {
      const barcode = await getPlannedMaterialBarcode({
          wonum,
            itemnum: item.itemnum,
            description: item.description,
            quantity: item.quantity,
      });

      return {
        ...item,
        barcode: barcode || '',
      };
    }),
  );
}