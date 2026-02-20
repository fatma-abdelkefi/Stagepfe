// src/services/doclinks.ts
import { MAXIMO } from '../config/maximoUrls';

function safeTrim(v: any): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** Collapse multiple slashes, but keep "http(s)://" intact */
function normalizeSlashes(u: string) {
  return (u || '').replace(/([^:]\/)\/+/g, '$1');
}

/** http://host/maximo/maximo/... => http://host/maximo/... */
function fixDoubleMaximo(u: string) {
  return (u || '').replace(
    /(https?:\/\/[^/]+\/maximo)\/maximo(\/|$)/i,
    '$1$2'
  );
}

/** Fix known endpoint typos seen in logs */
function fixKnownTypos(u: string) {
  return (u || '')
    // oslc typos
    .replace(/\/oslc\/oss\//gi, '/oslc/os/')

    // mxwo typos (ALL variants we saw)
    .replace(/\/oslc\/os\/mxwwo\//gi, '/oslc/os/mxwo/')
    .replace(/\/oslc\/os\/mxwoo\//gi, '/oslc/os/mxwo/')
    .replace(/\/oslc\/os\/mmxwo\//gi, '/oslc/os/mxwo/')
    .replace(/\/oslc\/os\/mxwwo($|\/|\?)/gi, '/oslc/os/mxwo$1')
    .replace(/\/oslc\/os\/mxwoo($|\/|\?)/gi, '/oslc/os/mxwo$1')

    .replace(/\/os\/mxwwo\//gi, '/os/mxwo/')
    .replace(/\/os\/mxwoo\//gi, '/os/mxwo/')
    .replace(/\/os\/mmxwo\//gi, '/os/mxwo/')

    // doclinks typo
    .replace(/docclinks/gi, 'doclinks')

    // mxwo key typo: __ -> _
    .replace(/\/mxwo\/__+/gi, '/mxwo/_');
}

/**
 * ✅ FINAL NORMALIZER
 * Call this on ANY URL before using it (axios/WebView/candidates).
 */
export function finalNormalizeMaximoUrl(url?: string): string {
  let out = safeTrim(url);
  if (!out) return '';

  out = normalizeSlashes(out);
  out = fixDoubleMaximo(out);
  out = normalizeSlashes(out);

  out = fixKnownTypos(out);

  out = normalizeSlashes(out);
  return out;
}

/**
 * ✅ IMPORTANT:
 * rewriteDoclinkUrl always returns an ABSOLUTE URL on the correct Maximo host
 * while avoiding /maximo/maximo duplication.
 */
export function rewriteDoclinkUrl(inputUrl?: string): string {
  const raw = safeTrim(inputUrl);
  if (!raw) return '';
  if (raw.startsWith('http://childkey#') || raw.startsWith('childkey#')) return '';

  // absolute url (maybe wrong host) -> force correct host but keep path
  const abs = raw.match(/^https?:\/\/[^/]+(\/.*)$/i);
  if (abs?.[1]) {
    const path = abs[1];

    // If path already starts with /maximo/... and ORIGIN already contains /maximo,
    // remove the extra /maximo from path to avoid /maximo/maximo
    const fixedPath = path.startsWith('/maximo/')
      ? path.replace(/^\/maximo/i, '')
      : path;

    return finalNormalizeMaximoUrl(`${MAXIMO.ORIGIN}${fixedPath}`);
  }

  // relative path
  if (raw.startsWith('/maximo/')) {
    // MAXIMO.ORIGIN already ends with /maximo
    const fixedPath = raw.replace(/^\/maximo/i, '');
    return finalNormalizeMaximoUrl(`${MAXIMO.ORIGIN}${fixedPath}`);
  }

  if (raw.startsWith('/')) {
    return finalNormalizeMaximoUrl(`${MAXIMO.ORIGIN}${raw}`);
  }

  // already non-relative
  return finalNormalizeMaximoUrl(raw);
}

/**
 * ✅ meta -> binary
 * - .../doclinks/meta/{id} => .../doclinks/{id}
 * - .../doclinks/{id}/meta => .../doclinks/{id}
 */
export function metaToDoclinkUrl(url?: string): string {
  const u = safeTrim(url);
  if (!u) return '';

  const m1 = u.match(/\/doclinks\/meta\/(\d+)(?=\/|$|\?)/i);
  if (m1) return finalNormalizeMaximoUrl(u.replace(/\/doclinks\/meta\/\d+/i, `/doclinks/${m1[1]}`));

  const m2 = u.match(/\/doclinks\/(\d+)\/meta(?=\/|$|\?)/i);
  if (m2) return finalNormalizeMaximoUrl(u.replace(/\/doclinks\/\d+\/meta/i, `/doclinks/${m2[1]}`));

  return finalNormalizeMaximoUrl(u);
}

/**
 * ✅ binary -> meta
 * - .../doclinks/{id} => .../doclinks/meta/{id}
 * - preserves querystring
 */
export function doclinkToMetaUrl(url?: string): string {
  const u = safeTrim(url);
  if (!u) return '';

  const [path, query = ''] = u.split('?');
  const cleanPath = path.replace(/\/+$/, '');

  // already meta
  if (/\/doclinks\/meta\/\d+$/i.test(cleanPath)) {
    const out = query ? `${cleanPath}?${query}` : cleanPath;
    return finalNormalizeMaximoUrl(out);
  }

  // .../doclinks/{id} => .../doclinks/meta/{id}
  const converted = cleanPath.replace(/\/doclinks\/(\d+)$/i, '/doclinks/meta/$1');
  const out = query ? `${converted}?${query}` : converted;

  return finalNormalizeMaximoUrl(out);
}

/**
 * ✅ Helper: build DocViewer candidates from any "raw" doclink url
 * This guarantees NO /maximo/maximo, NO mxwoo/mxwwo, NO double slashes.
 */
export function buildDocViewerCandidatesFromAnyUrl(anyUrl: string): string[] {
  const abs = rewriteDoclinkUrl(anyUrl);
  const binaryBase = metaToDoclinkUrl(abs);

  const base = finalNormalizeMaximoUrl(binaryBase).replace(/\/+$/, '');
  if (!base) return [];

  return [
    base,
    `${base}?download=1`,
    `${base}?_format=application/octet-stream`,
    `${base}/$file`,
    `${base}/file`,
    `${base}/content`,
    `${base}/attachment`,
    `${base}/content/$value`,
    `${base}/$value`,
  ].map(finalNormalizeMaximoUrl);
}
