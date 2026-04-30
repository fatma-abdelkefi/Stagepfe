import axios from 'axios';
import { Buffer } from 'buffer';
import { MAXIMO } from '../../../shared/config/maximoUrls';

function safeTrim(value: unknown): string {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function buildBasicAuth(username: string, password: string) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

function getHeaders(username: string, password: string) {
  return {
    Authorization: buildBasicAuth(username, password),
    Accept: 'application/json',
    'Content-Type': 'application/json',
    properties: '*',
  };
}

async function searchWorkOrders(
  where: string,
  username: string,
  password: string,
) {
  const select =
    'wonum,siteid,description,status,href,origrecordid,origrecordclass';

  const cleanWhere = where
  .trim()
  .replace(/^ww+/, 'w')
  .replace(/^oo+/, 'o');

const encodedWhere = encodeURIComponent(cleanWhere);
const encodedSelect = encodeURIComponent(select);

const url =
  `${MAXIMO.MXWO}` +
  `?lean=1` +
  `&oslc.where=${encodedWhere}` +
  `&oslc.select=${encodedSelect}`;

  console.log('RELATED SERVICE VERSION = FIXED-URL-V3');
  console.log('RELATED LIST WHERE =', where);
  console.log('RELATED LIST URL =', url);

  const res = await axios.get(url, {
    headers: getHeaders(username, password),
  });

  return Array.isArray(res.data?.member) ? res.data.member : [];
}

export async function getRelatedWorkOrdersByOrigin(
  currentWonum: string,
  username: string,
  password: string,
) {
  const cleanWonum = safeTrim(currentWonum);

  const currentMembers = await searchWorkOrders(
    `wonum="${cleanWonum}"`,
    username,
    password,
  );

  const current = currentMembers[0];

  const followups = await searchWorkOrders(
    `origrecordid="${cleanWonum}" and origrecordclass="WORKORDER"`,
    username,
    password,
  );

  const originatorWonum = safeTrim(current?.origrecordid);

  const originator = originatorWonum
    ? await searchWorkOrders(
        `wonum="${originatorWonum}"`,
        username,
        password,
      )
    : [];

  const mappedOriginator = originator.map((item: any, index: number) => ({
    id: item?.href ?? item?.wonum ?? `originator-${index}`,
    wonum: safeTrim(item?.wonum),
    siteid: safeTrim(item?.siteid),
    description: safeTrim(item?.description),
    status: safeTrim(item?.status),
    relationship: 'Ordre de travail principal',
  }));

  const mappedFollowups = followups.map((item: any, index: number) => ({
    id: item?.href ?? item?.wonum ?? `followup-${index}`,
    wonum: safeTrim(item?.wonum),
    siteid: safeTrim(item?.siteid),
    description: safeTrim(item?.description),
    status: safeTrim(item?.status),
    relationship: 'Ordre de travail lié',
  }));

  return [...mappedOriginator, ...mappedFollowups].filter(
    item => item.wonum && item.wonum !== cleanWonum,
  );
}