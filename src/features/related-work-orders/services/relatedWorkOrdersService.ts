import axios from 'axios';
import { Buffer } from 'buffer';
import type {
  AddRelatedWorkOrderPayload,
  AddRelatedWorkOrderResult,
} from '../types/relatedWorkOrder.types';
import { MAXIMO } from '../../../shared/config/maximoUrls';
import { rewriteMaximoUrl } from '../../../shared/services/rewriteMaximoUrl';

const BASE_URL = MAXIMO.BASE_URL;

type AddRelatedWorkOrderRequestParams = {
  username: string;
  password: string;
  payload: AddRelatedWorkOrderPayload;
};

function safeTrim(value: unknown): string {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function buildBasicAuth(username: string, password: string) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

function getPostHeaders(username: string, password: string) {
  return {
    Authorization: buildBasicAuth(username, password),
    Accept: 'application/json',
    'Content-Type': 'application/json',
    properties: '*',
  };
}

function getPatchHeaders(username: string, password: string) {
  return {
    Authorization: buildBasicAuth(username, password),
    Accept: 'application/json',
    'Content-Type': 'application/json',
    properties: '*',
    'x-method-override': 'PATCH',
    patchtype: 'MERGE',
    'If-Match': '*',
  };
}

function normalizeBaseUrl(baseUrl: string) {
  return String(baseUrl ?? '').replace(/\/+$/, '');
}

function extractMember(data: any) {
  if (Array.isArray(data?.member) && data.member.length > 0) {
    return data.member[0];
  }

  return data ?? null;
}

function extractWonum(data: any): string {
  const member = extractMember(data);

  return safeTrim(
    member?.wonum ||
      member?.spi_wmwonum ||
      data?.wonum ||
      data?.spi_wmwonum,
  );
}

function extractHref(data: any): string {
  const member = extractMember(data);
  return rewriteMaximoUrl(safeTrim(member?.href || data?.href));
}

async function findWorkOrderByWonum(
  baseUrl: string,
  username: string,
  password: string,
  wonum: string,
) {
  const encodedWhere = encodeURIComponent(`wonum="${wonum}"`);
  const encodedSelect = encodeURIComponent(
    'wonum,siteid,href,description,description_longdescription',
  );

  const url =
    `${normalizeBaseUrl(baseUrl)}/oslc/os/mxwo` +
    `?lean=1` +
    `&oslc.where=${encodedWhere}` +
    `&oslc.select=${encodedSelect}`;

  const response = await axios.get(url, {
    headers: getPostHeaders(username, password),
  });

  const member = extractMember(response.data);

  if (!member?.href) {
    throw new Error(`Impossible de trouver le Work Order ${wonum}.`);
  }

  return {
    wonum: safeTrim(member.wonum),
    siteid: safeTrim(member.siteid),
    href: rewriteMaximoUrl(safeTrim(member.href)),
  };
}

async function updateRelatedWorkOrderDetails(params: {
  href: string;
  username: string;
  password: string;
  details: string;
}) {
  const { href, username, password, details } = params;

  const cleanHref = rewriteMaximoUrl(safeTrim(href));

  if (!cleanHref || !safeTrim(details)) return;

  const url = `${cleanHref}?lean=1`;

  const body = {
    description_longdescription: safeTrim(details),
  };

  console.log('UPDATE RELATED WO DETAILS URL =', url);
  console.log('UPDATE RELATED WO DETAILS BODY =', JSON.stringify(body, null, 2));

  await axios.post(url, body, {
    headers: getPatchHeaders(username, password),
  });
}

export async function addRelatedWorkOrderRequest({
  username,
  password,
  payload,
}: AddRelatedWorkOrderRequestParams): Promise<AddRelatedWorkOrderResult> {
  const baseUrl = normalizeBaseUrl(BASE_URL);
  const postHeaders = getPostHeaders(username, password);
  const patchHeaders = getPatchHeaders(username, password);

  try {
    const createUrl = MAXIMO.MXWO;

    const createBody: Record<string, any> = {
      description: safeTrim(payload.description),
      siteid: safeTrim(payload.siteid),
      status: 'WAPPR',
      woclass: 'WORKORDER',
      origrecordid: safeTrim(payload.originWonum),
      origrecordclass: 'WORKORDER',
    };

    if (safeTrim(payload.details)) {
      createBody.description_longdescription = safeTrim(payload.details);
    }

    if (safeTrim(payload.assetnum)) {
      createBody.assetnum = safeTrim(payload.assetnum);
    }

    if (safeTrim(payload.location)) {
      createBody.location = safeTrim(payload.location);
    }

    console.log('CREATE RELATED WO URL =', createUrl);
    console.log('CREATE RELATED WO BODY =', JSON.stringify(createBody, null, 2));

    const createResponse = await axios.post(createUrl, createBody, {
      headers: postHeaders,
    });

    console.log(
      'CREATE RELATED WO RESPONSE =',
      JSON.stringify(createResponse.data, null, 2),
    );

    const newWonum = extractWonum(createResponse.data);
    let newHref = extractHref(createResponse.data);

    if (!newWonum) {
      throw new Error("Création du nouvel ordre de travail échouée.");
    }

    if (!newHref) {
      const createdWO = await findWorkOrderByWonum(
        baseUrl,
        username,
        password,
        newWonum,
      );

      newHref = createdWO.href;
    }

    if (safeTrim(payload.details) && newHref) {
      await updateRelatedWorkOrderDetails({
        href: newHref,
        username,
        password,
        details: safeTrim(payload.details),
      });
    }

    const origin = await findWorkOrderByWonum(
      baseUrl,
      username,
      password,
      safeTrim(payload.originWonum),
    );

    const relationBody = {
      relatedrecord: [
        {
          relatedreckey: newWonum,
          class: 'WORKORDER',
          relationship: safeTrim(payload.relation) || 'FOLLOWUP',
        },
      ],
    };

    console.log('RELATION URL =', origin.href);
    console.log('RELATION BODY =', JSON.stringify(relationBody, null, 2));

    await axios.post(origin.href, relationBody, {
      headers: patchHeaders,
    });

    return {
      wonum: newWonum,
      href: newHref || undefined,
    };
  } catch (error: any) {
    console.log('RELATED WO ERROR STATUS =', error?.response?.status);
    console.log(
      'RELATED WO ERROR DATA =',
      JSON.stringify(error?.response?.data, null, 2),
    );
    console.log('RELATED WO ERROR MESSAGE =', error?.message);

    throw error;
  }
}