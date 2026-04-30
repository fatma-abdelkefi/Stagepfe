import axios from 'axios';
import { Buffer } from 'buffer';

import { MAXIMO } from '../../../shared/config/maximoUrls';
import type {
  AddActualMaterialPayload,
  ActualMaterialItem,
} from '../types/material.types';

import { addActualMaterial } from './materialsDetailsService';
import {
  getActualMaterialBarcode,
  saveLocalActualMaterial,
  saveActualMaterialBarcodePending,
} from './barcodeStorage';

function makeToken(username: string, password: string) {
  return Buffer.from(`${username}:${password}`).toString('base64');
}

function headers(username: string, password: string) {
  const token = makeToken(username, password);

  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    maxauth: token,
    Authorization: `Basic ${token}`,
    properties: '*',
  };
}

export async function addActualMaterialRequest({
  woHref,
  wonum,
  username,
  password,
  payload,
}: {
  woHref: string;
  wonum?: string | number;
  username: string;
  password: string;
  payload: AddActualMaterialPayload;
}) {
  const result = await addActualMaterial(woHref, username, password, {
    ...payload,
    wonum: String(wonum ?? ''),
  } as any);

  await saveActualMaterialBarcodePending({
    wonum,
    itemnum: payload.itemnum,
    storeroom: payload.storeroom,
    itemqty: payload.itemqty,
    barcode: payload.barcode,
  });
  await saveLocalActualMaterial({
  wonum,
  itemnum: payload.itemnum,
  itemqty: payload.itemqty,
  storeroom: payload.storeroom,
  issuetype: payload.issuetype,
  siteid: payload.siteid,
  barcode: payload.barcode,
});

  return result;
}

export async function getActualMaterialsByWorkOrderId({
  workorderid,
  wonum,
  username,
  password,
}: {
  workorderid: number;
  wonum?: string | number;
  username: string;
  password: string;
}): Promise<ActualMaterialItem[]> {
  const select =
    'matusetrans{matusetransid,itemnum,itemqty,description,storeroom,storeloc,issuetype,siteid}';

  const url =
    `${MAXIMO.OSLC_OS}/SM1122/${workorderid}` +
    `?lean=1` +
    `&oslc.select=${encodeURIComponent(select)}` +
    `&_ts=${Date.now()}`;

  console.log('📥 [getActualMaterialsByWorkOrderId] URL:', url);

  const res = await axios.get(url, {
    headers: headers(username, password),
    timeout: 30000,
  });

  const rawItems = Array.isArray(res.data?.matusetrans)
    ? res.data.matusetrans
    : [];

  return Promise.all(
    rawItems.map(async (item: any, index: number) => {
      const itemnum = String(item.itemnum ?? '');
      const itemqty = Number(item.itemqty ?? 0);
      const storeroom = item.storeroom ? String(item.storeroom) : undefined;
      const matusetransid = item.matusetransid
        ? String(item.matusetransid)
        : undefined;

      const barcode = await getActualMaterialBarcode({
        wonum,
        matusetransid,
        itemnum,
        storeroom,
        itemqty,
      });

      return {
        id: matusetransid ? `am-${matusetransid}` : `am-${index}`,
        matusetransid,
        itemnum,
        description: String(item.description ?? ''),
        itemqty,
        storeroom,
        storeloc: item.storeloc ? String(item.storeloc) : undefined,
        issuetype: item.issuetype ? String(item.issuetype) : undefined,
        siteid: item.siteid ? String(item.siteid) : undefined,
        barcode,
      };
    }),
  );
}