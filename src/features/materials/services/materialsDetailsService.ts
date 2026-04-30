import axios from 'axios';
import { Buffer } from 'buffer';
import { MAXIMO } from '../../../shared/config/maximoUrls';
import type { AddActualMaterialPayload } from '../types/material.types';

type AddActualMaterialPayloadWithWonum = AddActualMaterialPayload & {
  wonum?: string | number;
};

function makeLocalToken(username: string, password: string) {
  return Buffer.from(`${username}:${password}`).toString('base64');
}

function buildToken(username: string, password: string) {
  return makeLocalToken(username, password);
}

function commonHeaders(token: string) {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    maxauth: token,
    Authorization: `Basic ${token}`,
    properties: '*',
  };
}

async function resolveWorkOrderId({
  wonum,
  siteid,
  username,
  password,
}: {
  wonum: string;
  siteid: string;
  username: string;
  password: string;
}): Promise<number> {
  const token = buildToken(username, password);

  const where = `wonum="${wonum}" and siteid="${siteid}"`;
  const select = 'wonum,siteid,workorderid';

  const url =
    `${MAXIMO.OSLC_OS}/mxwo?lean=1` +
    `&oslc.where=${encodeURIComponent(where)}` +
    `&oslc.select=${encodeURIComponent(select)}`;

  console.log('🔎 [resolveWorkOrderId] URL:', url);

  const res = await axios.get(url, {
    headers: commonHeaders(token),
    timeout: 30000,
  });

  const wo = res.data?.member?.[0];

  if (!wo?.workorderid) {
    throw new Error(`Workorder introuvable : ${wonum} / ${siteid}`);
  }

  return Number(wo.workorderid);
}

export async function addActualMaterial(
  _woHref: string,
  username: string,
  password: string,
  payload: AddActualMaterialPayloadWithWonum,
) {
  const wonum = String(payload.wonum ?? '').trim();
  const siteid = String(payload.siteid ?? '').trim();
  const item = String(payload.itemnum ?? '').trim();
  const storeroom = String(payload.storeroom ?? '').trim();

  if (!wonum) throw new Error('wonum manquant.');
  if (!siteid) throw new Error('siteid manquant.');
  if (!item) throw new Error('Code article manquant.');
  if (!storeroom) throw new Error('Magasin manquant.');

  const token = buildToken(username, password);
  const workorderid = await resolveWorkOrderId({
    wonum,
    siteid,
    username,
    password,
  });

  const url = `${MAXIMO.OSLC_OS}/SM1122/${workorderid}?lean=1`;

  const body = {
    matusetrans: [
      {
        itemnum: item,
        itemqty: Number(payload.itemqty),
        storeroom,
        issuetype: payload.issuetype,
        siteid,
        gldebitacct: '6210-326-000',
        barcode: payload.barcode || undefined,
      },
    ],
  };

  const headers = {
    ...commonHeaders(token),
    'x-method-override': 'PATCH',
    patchtype: 'MERGE',
  };

  console.log('==============================');
  console.log('📡 ADD ACTUAL MATERIAL DEBUG');
  console.log('URL =', url);
  console.log('BODY =', JSON.stringify(body, null, 2));
  console.log('==============================');

  try {
    const res = await axios.post(url, body, {
      headers,
      timeout: 30000,
    });

    console.log('✅ ADD ACTUAL MATERIAL SUCCESS:', res.status);
    return res.data;
  } catch (error: any) {
    console.log('❌ ADD ACTUAL MATERIAL ERROR MESSAGE:', error?.message);
    console.log('❌ STATUS:', error?.response?.status);
    console.log(
      '❌ DATA:',
      JSON.stringify(error?.response?.data, null, 2),
    );

    throw new Error(
      error?.response?.data?.Error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "Impossible d'ajouter le matériel réel.",
    );
  }
}