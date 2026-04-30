import { maximo, makeToken, authHeaders, ensureOk } from './maximoClient';
import { rewriteToMaximoOrigin } from './maximoUrl';

type AddActualMaterialPayload = {
  itemnum: string;
  itemqty: number;
  storeroom: string;
  issuetype: 'ISSUE' | 'RETURN';
  siteid: string;
};

type ActualMaterialItem = {
  itemnum: string;
  itemqty: number;
  description: string;
};

type ActualsResponse = {
  actualMaterials: ActualMaterialItem[];
};

function buildHeaders(username: string, password: string) {
  const token = makeToken(username, password);
  return authHeaders(token);
}

export async function addActualMaterial(
  woHref: string,
  username: string,
  password: string,
  payload: AddActualMaterialPayload,
) {
  const headers = {
    ...buildHeaders(username, password),
    'x-method-override': 'PATCH',
    patchtype: 'MERGE',
  };

  const url = rewriteToMaximoOrigin(woHref);

  const body = {
    matusetrans: [
      {
        itemnum: payload.itemnum,
        itemqty: payload.itemqty,
        storeroom: payload.storeroom,
        issuetype: payload.issuetype,
        siteid: payload.siteid,
      },
    ],
  };

  const response = await maximo.post(url, body, { headers });
  ensureOk(response.status, response.data, 'addActualMaterial');

  return response.data;
}

export async function getActualsFromWoHref(
  woHref: string,
  username: string,
  password: string,
): Promise<ActualsResponse> {
  const headers = buildHeaders(username, password);

  const url = rewriteToMaximoOrigin(woHref);

  const response = await maximo.get(url, {
    headers,
    params: {
      lean: 1,
      'oslc.select': 'matusetrans{itemnum,itemqty,description}',
    },
  });

  ensureOk(response.status, response.data, 'getActualsFromWoHref');

  const member = response.data?.member?.[0];
  const matusetrans = member?.matusetrans ?? response.data?.matusetrans ?? [];

  const actualMaterials: ActualMaterialItem[] = matusetrans.map((item: any) => ({
    itemnum: item.itemnum ?? '',
    itemqty: Number(item.itemqty ?? 0),
    description: item.description ?? '',
  }));

  return { actualMaterials };
}