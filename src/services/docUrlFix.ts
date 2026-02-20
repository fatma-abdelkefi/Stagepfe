// src/services/docUrlFix.ts

function safeStr(v: any) {
  return typeof v === 'string' ? v.trim() : '';
}

function ensureNoTrailingSlash(u: string) {
  return (u || '').replace(/\/+$/, '');
}

/** Fix all typos we saw from Maximo */
export function fixMaximoUrlTypos(u: string) {
  return (u || '')
    .replace(/\/oslc\/oss\//gi, '/oslc/os/') // ✅ FIX: oss -> os
    .replace(/\/os\/mmxwo\//gi, '/os/mxwo/')
    .replace(/\/os\/mxwwo\//gi, '/os/mxwo/')
    .replace(/docclinks/gi, 'doclinks')
    .replace(/\/mxwo\/__+/gi, '/mxwo/_'); // ✅ __ -> _
}

/** Force same protocol + host as referenceUrl */
export function forceSameHost(url: string, referenceUrl: string) {
  try {
    const ref = new URL(referenceUrl);
    const u = new URL(url);
    u.protocol = ref.protocol;
    u.host = ref.host;
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Normalize ANY navigation URL:
 * - fix typos
 * - force host same as reference
 * - remove trailing slash
 */
export function normalizeNavigationUrl(nextUrl: string, referenceUrl: string) {
  const n = safeStr(nextUrl);
  if (!n) return '';

  const fixed = fixMaximoUrlTypos(n);
  const sameHost = forceSameHost(fixed, referenceUrl);
  return ensureNoTrailingSlash(sameHost);
}

/**
 * Build the doclinks/{id} binary base from any doc item.
 * rewriteDoclinkUrl + metaToDoclinkUrl are your functions from workOrderDetailsService.
 */
export function buildBinaryDoclinkUrl(
  doc: any,
  rewriteDoclinkUrl: (u?: string) => string,
  metaToDoclinkUrl: (u?: string) => string
) {
  const raw =
    safeStr(doc?.href) ||
    safeStr(doc?.docinfo?.href) ||
    safeStr(doc?.urlname) ||
    safeStr(doc?.docinfo?.urlname) ||
    '';

  const rewritten = rewriteDoclinkUrl(raw);
  const binary = metaToDoclinkUrl(rewritten);

  // If doclinkId exists, force /doclinks/{id}
  const id = safeStr(doc?.doclinkId);
  let forced = binary;
  if (id) {
    forced = forced
      .replace(/\/doclinks\/meta\/\d+/i, `/doclinks/${id}`)
      .replace(/\/doclinks\/\d+\/meta/i, `/doclinks/${id}`);
  }

  return normalizeNavigationUrl(forced, rewritten || forced);
}

/** Build candidates for WebView */
export function buildDocViewerCandidates(binaryBase: string) {
  const base = ensureNoTrailingSlash(fixMaximoUrlTypos(binaryBase));
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
  ].map(fixMaximoUrlTypos);
}
