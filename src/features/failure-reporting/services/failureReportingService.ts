import { Buffer } from 'buffer';

import { MAXIMO } from '../../../shared/config/maximoUrls';
import type { WorkOrderFailureReport } from '../types/failureReporting.types';

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
  };
}

function firstMember(data: any) {
  if (Array.isArray(data?.member)) {
    return data.member[0] || null;
  }

  if (Array.isArray(data?.rdfs_member)) {
    return data.rdfs_member[0] || null;
  }

  return null;
}

function getMxApiWoUrl() {
  return MAXIMO.MXWO.replace('/oslc/os/mxwo', '/oslc/os/mxapiwo');
}

function cleanHtmlText(value: unknown): string {
  const text = safeTrim(value);

  if (!text) return '';

  return text
    .replace(/<!--.*?-->/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickRemark(item: any): string {
  return (
    cleanHtmlText(item?.failureremarks) ||
    cleanHtmlText(item?.remarkdesc) ||
    cleanHtmlText(item?.remark) ||
    ''
  );
}

function mapCodeRows(item: any) {
  const rows: any[] = [];

  const problemCode = safeTrim(item?.problemcode);
  const causeCode = safeTrim(item?.causecode);
  const remedyCode = safeTrim(item?.remedycode);

  if (problemCode) {
    rows.push({
      type: 'PROBLEM',
      code: problemCode,
      description:
        safeTrim(item?.problemcode_description) ||
        safeTrim(item?.problemDescription) ||
        problemCode,
    });
  }

  if (causeCode) {
    rows.push({
      type: 'CAUSE',
      code: causeCode,
      description:
        safeTrim(item?.causecode_description) ||
        safeTrim(item?.causeDescription) ||
        causeCode,
    });
  }

  if (remedyCode) {
    rows.push({
      type: 'REMEDY',
      code: remedyCode,
      description:
        safeTrim(item?.remedycode_description) ||
        safeTrim(item?.remedyDescription) ||
        remedyCode,
    });
  }

  return rows;
}

function mapFailureReport(item: any): WorkOrderFailureReport {
  const failureClass = safeTrim(item?.failurecode);
  const problemCode = safeTrim(item?.problemcode);
  const causeCode = safeTrim(item?.causecode);
  const remedyCode = safeTrim(item?.remedycode);

  const failureClassDescription =
    safeTrim(item?.failurecode_description) ||
    safeTrim(item?.failureClassDescription) ||
    failureClass;

  const problemDescription =
    safeTrim(item?.problemcode_description) ||
    safeTrim(item?.problemDescription) ||
    problemCode;

  const causeDescription =
    safeTrim(item?.causecode_description) ||
    safeTrim(item?.causeDescription) ||
    causeCode;

  const remedyDescription =
    safeTrim(item?.remedycode_description) ||
    safeTrim(item?.remedyDescription) ||
    remedyCode;

  return {
    failureClass,
    failureClassDescription,

    problem: problemCode,
    problemCode,
    problemDescription,

    cause: causeCode,
    causeCode,
    causeDescription,

    remedy: remedyCode,
    remedyCode,
    remedyDescription,

    failureDate: safeTrim(item?.faildate),

    remarkDate:
      safeTrim(item?.remarkdate) ||
      safeTrim(item?.changedate) ||
      safeTrim(item?.statusdate),

    remark: pickRemark(item),

    codes: mapCodeRows(item),
  };
}

export async function getWorkOrderFailureReport(params: {
  wonum: string;
  siteid: string;
  username: string;
  password: string;
}): Promise<WorkOrderFailureReport | null> {
  const { wonum, siteid, username, password } = params;

  const cleanWonum = safeTrim(wonum);
  const cleanSiteid = safeTrim(siteid);

  if (!cleanWonum || !cleanSiteid) {
    return null;
  }

  if (!username || !password) {
    throw new Error('Session expirée. Veuillez vous reconnecter.');
  }

  const where = `wonum="${cleanWonum}" and siteid="${cleanSiteid}"`;

  const select = [
    'wonum',
    'siteid',
    'failurecode',
    'problemcode',
    'causecode',
    'remedycode',
    'faildate',
    'remarkdate',
    'failureremarks',
    'remarkdesc',
    'statusdate',
    'changedate',
  ].join(',');

  const url =
    `${getMxApiWoUrl()}?lean=1` +
    `&oslc.where=${encodeURIComponent(where)}` +
    `&oslc.select=${encodeURIComponent(select)}`;

  console.log('✅ FAILURE SERVICE DETAILS MXAPIWO');
  console.log('🔥 FAILURE DETAILS URL:', url);

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(username, password),
  });

  const text = await response.text();

  console.log('🔥 FAILURE DETAILS STATUS:', response.status);
  console.log('🔥 FAILURE DETAILS BODY:', text);

  if (!response.ok) {
    throw new Error(text || `Erreur Maximo ${response.status}`);
  }

  const data = text ? JSON.parse(text) : {};
  const item = firstMember(data);

  if (!item) {
    return null;
  }

  console.log('🔥 FAILURE ITEM PARSED:', JSON.stringify(item, null, 2));
  console.log('🔥 failurecode:', item?.failurecode);
  console.log('🔥 problemcode:', item?.problemcode);
  console.log('🔥 causecode:', item?.causecode);
  console.log('🔥 remedycode:', item?.remedycode);
  console.log('🔥 failureremarks:', item?.failureremarks);
  console.log('🔥 remarkdesc:', item?.remarkdesc);

  return mapFailureReport(item);
}