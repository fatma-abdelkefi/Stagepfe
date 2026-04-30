import { maximo, makeToken, authHeaders, ensureOk } from '../../../shared/services/maximoClient';
import { MAXIMO } from '../../../shared/config/maximoUrls';

const BASE_URL = `${MAXIMO.OSLC_OS}/mxwo`;

type MaximoResponse<T> = {
  member?: T[];
};

type PlannedLaborItem = {
  laborcode?: string;
  craft?: string;
  skilllevel?: string;
  quantity?: number | string;
  laborhrs?: number | string;
};

type WoLaborResponse = {
  wplabor?: PlannedLaborItem[];
};

function buildHeaders(username: string, password: string) {
  const token = makeToken(username, password);
  return authHeaders(token);
}

export async function getPlannedLaborByWonum(
  wonum: string,
  username: string,
  password: string,
) {
  const headers = buildHeaders(username, password);

  const response = await maximo.get<MaximoResponse<WoLaborResponse>>(BASE_URL, {
    headers,
    params: {
      lean: 1,
      'oslc.where': `wonum="${wonum}"`,
      'oslc.select': 'wplabor{laborcode,craft,skilllevel,quantity,laborhrs}',
    },
  });

  ensureOk(response.status, response.data, 'getPlannedLaborByWonum');

  const wo = response.data?.member?.[0];
  const items = wo?.wplabor ?? [];

  return items.map((item, index) => ({
    id: `pl-${index}`,
    laborcode: item.laborcode ?? '',
    craft: item.craft ?? '',
    skilllevel: item.skilllevel ?? '',
    quantity: Number(item.quantity ?? 0),
    laborhrs: Number(item.laborhrs ?? 0),
  }));
}