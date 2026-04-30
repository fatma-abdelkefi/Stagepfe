import { MAXIMO } from '../../../shared/config/maximoUrls';

function safeStr(v: any): string {
  return typeof v === 'string' ? v.trim() : '';
}

function normalizeSlashes(u: string): string {
  return (u || '').replace(/([^:]\/)\/+/g, '$1');
}

function fixKnownTypos(u: string): string {
  return (u || '')
    .replace(/\/oslc\/oss\//gi, '/oslc/os/')
    .replace(/\/oslc\/os\/mxwwo\//gi, '/oslc/os/mxwo/')
    .replace(/\/oslc\/os\/mxwoo\//gi, '/oslc/os/mxwo/')
    .replace(/\/oslc\/os\/mmxwo\//gi, '/oslc/os/mxwo/')
    .replace(/docclinks/gi, 'doclinks')
    .replace(/\/mxwo\/__+/gi, '/mxwo/_');
}

export function finalNormalizeMaximoUrl(url?: string): string {
  let out = safeStr(url);
  if (!out) return '';

  out = normalizeSlashes(out);
  out = out.replace(/(https?:\/\/[^/]+\/maximo)\/maximo(\/|$)/i, '$1$2');
  out = fixKnownTypos(out);
  out = normalizeSlashes(out);

  return out;
}

export function rewriteDoclinkUrl(inputUrl?: string): string {
  const raw = safeStr(inputUrl);
  if (!raw) return '';

  if (raw.startsWith('http://childkey#') || raw.startsWith('childkey#')) {
    return '';
  }

  const abs = raw.match(/^https?:\/\/[^/]+(\/.*)$/i);

  if (abs?.[1]) {
    const path = abs[1];
    const fixedPath = path.startsWith('/maximo/')
      ? path.replace(/^\/maximo/i, '')
      : path;

    return finalNormalizeMaximoUrl(`${MAXIMO.BASE_URL}${fixedPath}`);
  }

  if (raw.startsWith('/maximo/')) {
    return finalNormalizeMaximoUrl(
      `${MAXIMO.BASE_URL}${raw.replace(/^\/maximo/i, '')}`,
    );
  }

  if (raw.startsWith('/')) {
    return finalNormalizeMaximoUrl(`${MAXIMO.BASE_URL}${raw}`);
  }

  return finalNormalizeMaximoUrl(raw);
}

export function metaToDoclinkUrl(url?: string): string {
  const u = safeStr(url);
  if (!u) return '';

  const m1 = u.match(/\/doclinks\/meta\/(\d+)(?=\/|$|\?)/i);

  if (m1) {
    return finalNormalizeMaximoUrl(
      u.replace(/\/doclinks\/meta\/\d+/i, `/doclinks/${m1[1]}`),
    );
  }

  const m2 = u.match(/\/doclinks\/(\d+)\/meta(?=\/|$|\?)/i);

  if (m2) {
    return finalNormalizeMaximoUrl(
      u.replace(/\/doclinks\/\d+\/meta/i, `/doclinks/${m2[1]}`),
    );
  }

  return finalNormalizeMaximoUrl(u);
}

export function doclinkToMetaUrl(url?: string): string {
  const u = finalNormalizeMaximoUrl(url);
  if (!u) return '';

  const [path, query = ''] = u.split('?');
  const cleanPath = path.replace(/\/+$/, '');

  if (/\/doclinks\/meta\/\d+$/i.test(cleanPath)) {
    return query ? `${cleanPath}?${query}` : cleanPath;
  }

  const converted = cleanPath.replace(
    /\/doclinks\/(\d+)$/i,
    '/doclinks/meta/$1',
  );

  return query ? `${converted}?${query}` : converted;
}