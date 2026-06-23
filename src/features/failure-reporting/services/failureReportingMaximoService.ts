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

function getMaximoBaseFromMxwo() {
  return MAXIMO.MXWO.replace('/oslc/os/mxwo', '');
}

function buildMxApiWoUrlFromHref(href: string) {
  const cleanHref = safeTrim(href);
  const resourceId = cleanHref.split('/').pop();

  if (!resourceId) {
    throw new Error('ID ressource Maximo introuvable dans href.');
  }

  const base = getMaximoBaseFromMxwo();

  return `${base}/oslc/os/mxapiwo/${resourceId}?lean=1`;
}

async function findWorkOrderHref(params: {
  username: string;
  password: string;
  wonum: string;
  siteid: string;
}) {
  const { username, password, wonum, siteid } = params;

  const where = `wonum="${wonum}" and siteid="${siteid}"`;
  const select = 'wonum,siteid,href';

  const url =
    `${MAXIMO.MXWO}?lean=1` +
    `&oslc.where=${encodeURIComponent(where)}` +
    `&oslc.select=${encodeURIComponent(select)}`;

  console.log('🔎 FIND WO HREF URL =', url);

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(username, password),
  });

  const text = await response.text();

  console.log('🔎 FIND WO HREF STATUS =', response.status);
  console.log('🔎 FIND WO HREF RESPONSE =', text);

  if (!response.ok) {
    throw new Error(text || `Erreur recherche WO ${response.status}`);
  }

  const data = text ? JSON.parse(text) : {};
  const member = Array.isArray(data?.member) ? data.member[0] : null;

  return safeTrim(member?.href);
}

function buildFailurePayload(report: WorkOrderFailureReport) {
  const failureClass = safeTrim(report.failureClass);

  const problemCode = safeTrim(report.problemCode || report.problem);
  const causeCode = safeTrim(report.causeCode || report.cause);
  const remedyCode = safeTrim(report.remedyCode || report.remedy);

  const remark = safeTrim(report.remark);

  const body: any = {};

  if (failureClass) {
    body.failurecode = failureClass;
  }

  if (problemCode) {
    body.problemcode = problemCode;
  }

  if (causeCode) {
    body.causecode = causeCode;
  }

  if (remedyCode) {
    body.remedycode = remedyCode;
  }

  if (remark) {
    body.failureremarks = remark;
    body.remarkdesc = remark;
  }

  console.log('🔥 FAILURE PAYLOAD FINAL =', JSON.stringify(body, null, 2));

  return body;
}

export async function saveFailureReportToMaximo(params: {
  username: string;
  password: string;
  woHref?: string;
  wonum: string;
  siteid: string;
  report: WorkOrderFailureReport;
}) {
  const { username, password, wonum, siteid, report } = params;

  if (!username || !password) {
    throw new Error('Identifiants Maximo manquants.');
  }

  let woHref = safeTrim(params.woHref);

  if (!woHref) {
    woHref = await findWorkOrderHref({
      username,
      password,
      wonum,
      siteid,
    });
  }

  if (!woHref) {
    throw new Error('Href du Work Order introuvable.');
  }

  const url = buildMxApiWoUrlFromHref(woHref);

  console.log(
    '🔥 FAILURE REPORT BEFORE PAYLOAD =',
    JSON.stringify(report, null, 2),
  );

  const body = buildFailurePayload(report);

  console.log('🛠 FAILURE MAXIMO URL =', url);
  console.log('🛠 FAILURE MAXIMO BODY =', JSON.stringify(body, null, 2));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...getHeaders(username, password),
      'x-method-override': 'PATCH',
      patchtype: 'MERGE',
      'If-Match': '*',
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();

  console.log('🛠 FAILURE MAXIMO STATUS =', response.status);
  console.log('🛠 FAILURE MAXIMO RESPONSE =', text);

  if (!response.ok) {
    throw new Error(text || `Erreur Maximo ${response.status}`);
  }

  return {
    success: true,
    status: response.status,
    response: text,
    payload: body,
  };
}