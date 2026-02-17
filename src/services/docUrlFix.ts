// src/services/docUrlFix.ts

type RewriteFn = (u?: string) => string;
type MetaToBinFn = (u?: string) => string;

function safeStr(v: any): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** Fix typos seen in Maximo URLs */
export function fixKnownTypos(u: string) {
  return (u || '')
    .replace(/\/os\/mmxwo\//i, '/os/mxwo/')
    .replace(/\/os\/mxwwo\//i, '/os/mxwo/')
    .replace(/docclinks/gi, 'doclinks')
    .replace(/\/mxwo\/__+/i, '/mxwo/_'); // /mxwo/__Qk... => /mxwo/_Qk...
}

/** Force host/protocol of `url` to match `referenceUrl` (demo2.smartech-tn.com) */
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
 * Build the best "binary doclink" URL:
 * - uses href/urlname/docinfo
 * - rewrite host to your external host
 * - convert meta -> binary
 * - fix typos
 * - if doclinkId exists, enforce /doclinks/{id}
 */
export function buildBinaryDoclinkUrl(
  document: any,
  rewriteDoclinkUrl: RewriteFn,
  metaToDoclinkUrl: MetaToBinFn
): string {
  const raw =
    safeStr(document?.href) ||
    safeStr(document?.docinfo?.href) ||
    safeStr(document?.urlname) ||
    safeStr(document?.docinfo?.urlname) ||
    '';

  if (!raw) return '';

  // reference host = from raw if possible
  const referenceUrl = rewriteDoclinkUrl(raw) || raw;

  let url = rewriteDoclinkUrl(raw);
  url = metaToDoclinkUrl(url);
  url = fixKnownTypos(url);
  url = forceSameHost(url, referenceUrl);

  const id = safeStr(document?.doclinkId);
  if (id) {
    url = url
      .replace(/\/doclinks\/meta\/\d+/i, `/doclinks/${id}`)
      .replace(/\/doclinks\/\d+\/meta/i, `/doclinks/${id}`);
  }

  return url;
}

/**
 * Rewrite ANY navigation URL (redirects, images, pdf, etc.) to stay on the external host
 * + fix Maximo typos.
 */
export function normalizeNavigationUrl(nextUrl: string, referenceUrl: string) {
  let u = fixKnownTypos(nextUrl);
  u = forceSameHost(u, referenceUrl);
  u = fixKnownTypos(u);
  return u;
}
