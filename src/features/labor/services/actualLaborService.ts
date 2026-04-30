import axios from 'axios';
import { makeToken } from '../../../shared/services/maximoClient';
import { rewriteMaximoOriginOnly } from '../../../shared/services/rewriteMaximoUrl';

export type AddActualLaborPayload = {
  laborcode: string;
  regularhrs: number;
};

type ActualLaborItem = {
  id: string;
  laborcode: string;
  regularhrs: number;
  transdate?: string;
};

function buildToken(username: string, password: string) {
  return makeToken(username, password);
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

function buildActualWoUrl(woHref: string): string {
  const safeHref = String(woHref || '').trim();
  if (!safeHref) return '';

  const normalizedHref = rewriteMaximoOriginOnly(safeHref);
  const baseHref = normalizedHref.split('?')[0].trim();
  return `${baseHref}?lean=1`;
}

export async function addActualLabor(
  woHref: string,
  username: string,
  password: string,
  payload: AddActualLaborPayload,
) {
  const token = buildToken(username, password);

  const url = buildActualWoUrl(woHref);
  if (!url) {
    throw new Error('woHref manquant.');
  }

  const body = {
    labtrans: [
      {
        laborcode: payload.laborcode,
        regularhrs: payload.regularhrs,
      },
    ],
  };

  const headers = {
    ...commonHeaders(token),
    'x-method-override': 'PATCH',
    patchtype: 'MERGE',
  };

  console.log('🧪 [addActualLabor] original woHref:', woHref);
  console.log('🚀 [addActualLabor] URL:', url);
  console.log(
    '🚀 [addActualLabor] Body:',
    JSON.stringify(body, null, 2),
  );

  try {
    const res = await axios.post(url, body, { headers });

    console.log(
      '✅ [addActualLabor] Response:',
      res.status,
      JSON.stringify(res.data, null, 2),
    );

    return res.data;
  } catch (error: any) {
  const backendMessage = String(
    error?.response?.data?.Error?.message ?? error?.message ?? '',
  );

  const reasonCode = String(
    error?.response?.data?.Error?.reasonCode ?? '',
  );

  console.log('❌ [addActualLabor] MESSAGE:', error?.message);
  console.log('❌ STATUS:', error?.response?.status);
  console.log(
    '❌ DATA:',
    JSON.stringify(error?.response?.data, null, 2),
  );

  if (reasonCode === 'BMXAA2530E') {
    throw new Error(
      "Main d'œuvre invalide : compte GL manquant ou non valide pour cette saisie.",
    );
  }

  throw new Error(
    backendMessage || "Impossible d'ajouter la main d'œuvre réelle.",
  );
}
}

export async function getActualLaborByWoHref(
  woHref: string,
  username: string,
  password: string,
): Promise<ActualLaborItem[]> {
  const token = buildToken(username, password);

  const baseUrl = buildActualWoUrl(woHref).replace(/\?lean=1$/, '');
  if (!baseUrl) return [];

  const url = `${baseUrl}?lean=1&oslc.select=labtrans{laborcode,regularhrs,transdate}`;

  try {
    const res = await axios.get(url, {
      headers: commonHeaders(token),
    });

    const items = Array.isArray(res.data?.labtrans) ? res.data.labtrans : [];

    return items.map((item: any, index: number) => ({
      id: `al-${index}`,
      laborcode: item?.laborcode ?? '',
      regularhrs: Number(item?.regularhrs ?? 0),
      transdate: item?.transdate ?? '',
    }));
  } catch (error: any) {
    console.log('❌ [getActualLaborByWoHref] MESSAGE:', error?.message);
    console.log('❌ [getActualLaborByWoHref] STATUS:', error?.response?.status);
    console.log(
      '❌ [getActualLaborByWoHref] DATA:',
      JSON.stringify(error?.response?.data, null, 2),
    );
    return [];
  }
}