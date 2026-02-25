import { MAXIMO } from '../config/maximoUrls';

export type WorkLogItem = {
  worklogid?: number | string;
  description?: string;
  description_longdescription?: { ldtext?: string } | string;
  logtype?: string;
  logtype_description?: string;
  createby?: string;
  createdate?: string;
  clientviewable?: boolean;
  href?: string;
  localref?: string;
};

function toBasicAuth(username: string, password: string) {
  const token = `${username}:${password}`;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Buffer } = require('buffer');
  return `Basic ${Buffer.from(token, 'utf8').toString('base64')}`;
}

function fixHost(url: string) {
  return String(url || '').replace('http://192.168.1.202:9080', 'http://demo2.smartech-tn.com');
}

async function httpGetJson(url: string, username: string, password: string): Promise<any> {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: toBasicAuth(username, password),
      properties: '*',
    } as any,
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

async function httpPostJson(url: string, body: any, username: string, password: string) {
  const basicAuth = toBasicAuth(username, password);
  // Build base64 MAXAUTH token (username:password)
  const { Buffer } = require('buffer');
  const maxauth = Buffer.from(`${username}:${password}`, 'utf8').toString('base64');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: basicAuth,
      MAXAUTH: maxauth,
    } as any,
    body: JSON.stringify(body),
  });

  if (res.status === 204) return { ok: true as const };

  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }

  if (res.ok) return { ok: true as const };

  const msg =
    parsed?.Error?.message ||
    parsed?.error?.message ||
    (text ? text : `HTTP ${res.status}`);
  return { ok: false as const, status: res.status, message: msg };
}

function qs(params: Record<string, any>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    sp.append(k, String(v));
  });
  return sp.toString();
}

function buildMxapiwoUrl(): string {
  const origin = String(MAXIMO.ORIGIN || '').replace(/\/+$/, '');
  return `${origin}/oslc/os/mxapiwo`;
}

function forceMxapiwoHref(href: string) {
  let u = fixHost(String(href || '').trim());
  if (!u) return '';
  u = u.replace('/maximo/oslc/os/mxwo/', '/maximo/oslc/os/mxapiwo/');
  u = u.replace('/oslc/os/mxwo/', '/oslc/os/mxapiwo/');
  return u;
}

export async function getWorkOrderWithWorklog(params: { wonum: string; username: string; password: string }) {
  const { wonum, username, password } = params;

  const base = buildMxapiwoUrl();
  const query = qs({
    lean: 1,
    _ts: Date.now(),
    'oslc.where': `wonum="${String(wonum).trim()}"`,
    'oslc.select':
      'wonum,siteid,href,worklog_collectionref,' +
      'worklog{worklogid,logtype,logtype_description,createby,createdate,description,description_longdescription,clientviewable,localref,href}',
  });

  const url = `${base}?${query}`;
  console.log('[WORKLOG] GET WO URL:', url);

  const json = await httpGetJson(url, username, password);
  const member = Array.isArray(json?.member) ? json.member : [];
  if (!member.length) return null;

  const wo = member[0] as any;

  return {
    wonum: String(wo?.wonum || ''),
    siteid: String(wo?.siteid || ''),
    href: fixHost(String(wo?.href || '')),
    worklog_collectionref: fixHost(String(wo?.worklog_collectionref || '')),
    worklog: Array.isArray(wo?.worklog) ? wo.worklog : [],
  };
}

export async function getWorkLogsForWonum(params: {
  wonum: string;
  username: string;
  password: string;
}): Promise<{ worklogs: WorkLogItem[]; worklog_collectionref: string }> {
  const pack = await getWorkOrderWithWorklog(params);
  const arr = Array.isArray(pack?.worklog) ? pack!.worklog : [];

  const normalized: WorkLogItem[] = arr.map((wl: any) => ({
    worklogid: wl?.worklogid,
    description: wl?.description,
    description_longdescription: wl?.description_longdescription,
    logtype: wl?.logtype,
    logtype_description: wl?.logtype_description,
    createby: wl?.createby,
    createdate: wl?.createdate,
    clientviewable: wl?.clientviewable,
    href: wl?.href ? fixHost(String(wl.href)) : undefined,
    localref: wl?.localref ? fixHost(String(wl.localref)) : undefined,
  }));

  return {
    worklogs: normalized,
    worklog_collectionref: pack?.worklog_collectionref ?? '',
  };
}

export async function getWorkLogByLocalRef(params: {
  localref: string;
  username: string;
  password: string;
}): Promise<WorkLogItem | null> {
  const { localref, username, password } = params;

  const url = fixHost(String(localref || '').trim());
  if (!url) return null;

  console.log('[WORKLOG] GET localref:', url);

  const json = await httpGetJson(url, username, password);
  const obj = Array.isArray(json?.member) ? json.member?.[0] : json;
  if (!obj) return null;

  return {
    worklogid: obj.worklogid,
    description: obj.description,
    description_longdescription: obj.description_longdescription,
    logtype: obj.logtype,
    logtype_description: obj.logtype_description,
    createby: obj.createby,
    createdate: obj.createdate,
    clientviewable: obj.clientviewable,
    href: obj.href ? fixHost(String(obj.href)) : undefined,
    localref: url,
  };
}

/**
 * ✅ ADD WORKLOG
 *
 * Endpoint: POST directly to worklog_collectionref
 *   mxapiwo returns worklog_collectionref as the full modifyworklog URL — use it as-is.
 *
 * BODY FORMAT (critical — NO _action field):
 *   [{ logtype, description, description_longdescription, createby, createdate }]
 *
 * ❌ BOTH of these cause BMXAA1407E ("WORKORDER already exists"):
 *   [{ _action: "Add", logtype, ... }]
 *   [{ _action: "AddChange", worklog: [{ logtype, ... }] }]
 *
 * Maximo interprets any _action on the top-level body as a WO operation, not a worklog insert.
 */
export async function addWorkLog(params: {
  modifyworklogUrl: string; // accepts woHref, worklog_collectionref, or any WO URL — we normalize it
  username: string;
  password: string;
  description: string;
  longText?: string;
  logtype?: string;
  createby?: string;
  createdate?: string;
}) {
  const { modifyworklogUrl, username, password, description, longText, logtype, createby, createdate } = params;

  // ✅ Extract the base WO href (strip /modifyworklog suffix if present)
  // Then rewrite to mxapiwo and add lean=1
  let woBase = fixHost(String(modifyworklogUrl || '').trim())
    .replace(/\/modifyworklog\/?$/, '')   // strip /modifyworklog
    .replace(/\/+$/, '');                 // strip trailing slash

  // ✅ Use mxapiwo (supports worklog PATCH — mxwo does not)
  woBase = woBase
    .replace('/maximo/oslc/os/mxwo/', '/maximo/oslc/os/mxapiwo/')
    .replace('/oslc/os/mxwo/', '/oslc/os/mxapiwo/');

  if (!woBase) throw new Error('URL WO manquante pour addWorkLog');

  const url = `${woBase}?lean=1`;

  const wlEntry: any = {
    logtype: logtype || 'CLIENTNOTE',
    description: String(description || '').trim(),
    description_longdescription: String(longText || '').trim(),
  };
  if (String(createby || '').trim()) wlEntry.createby = String(createby).trim();
  // ✅ Must be ISO 8601 with T separator: "2026-02-25T01:40:00"
  //    Space-separated format causes BMXAA4144E
  if (String(createdate || '').trim()) wlEntry.createdate = String(createdate).trim();

  const body = { worklog: [wlEntry] };

  console.log('[WORKLOG] PATCH WO:', url);
  console.log('[WORKLOG] BODY:', JSON.stringify(body));

  const { Buffer } = require('buffer');
  const maxauth = Buffer.from(`${username}:${password}`, 'utf8').toString('base64');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: toBasicAuth(username, password),
      MAXAUTH: maxauth,
      'x-method-override': 'PATCH',
      patchtype: 'MERGE',
      'If-Match': '*',
    } as any,
    body: JSON.stringify(body),
  });

  console.log('[WORKLOG] response status:', res.status);

  if (res.status === 204 || (res.status >= 200 && res.status < 300)) {
    console.log('[WORKLOG] PATCH OK');
    return { ok: true };
  }

  const text = await res.text();
  let parsed: any = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { /* ignore */ }

  const msg =
    parsed?.Error?.message ||
    parsed?.error?.message ||
    text ||
    `HTTP ${res.status}`;

  console.log('[WORKLOG] PATCH ERROR:', res.status, msg);
  throw new Error(msg);
}