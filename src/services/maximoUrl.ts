// src/services/maximoUrl.ts
import { MAXIMO } from '../config/maximoUrls';

/**
 * Normalize ANY incoming href to your configured Maximo base:
 *   MAXIMO.ORIGIN = http://demo2.smartech-tn.com/maximo
 *
 * Handles cases like:
 * - http://demo2.../maximo/maximo/oslc/os//mxwo/...
 * - http://192.168...:9080/maximo/oslc/os/mxwo/...
 * - /maximo/oslc/os/mxwo/...
 */
export function rewriteToMaximoOrigin(url: string): string {
  const u = String(url || '').trim();
  if (!u) return '';

  // Make sure origin has no trailing slash
  const origin = String(MAXIMO.ORIGIN || '').replace(/\/+$/, '');

  try {
    const parsed = new URL(u);

    // keep only pathname + search
    let path = parsed.pathname.replace(/\/+/g, '/');
    const search = parsed.search || '';

    // ✅ remove duplicate "/maximo/maximo"
    path = path.replace(/\/maximo\/maximo\b/g, '/maximo');

    // ✅ if pathname already starts with "/maximo/..." but origin already ends with "/maximo"
    // then remove the first "/maximo" to avoid "/maximo/maximo"
    if (origin.endsWith('/maximo') && path.startsWith('/maximo/')) {
      path = path.replace(/^\/maximo\b/, '');
      if (!path.startsWith('/')) path = `/${path}`;
    }

    return `${origin}${path}${search}`.replace(/\/+$/, '');
  } catch {
    // relative url
    let cleaned = u.startsWith('/') ? u : `/${u}`;
    cleaned = cleaned.replace(/\/+/g, '/');

    // ✅ remove duplicate "/maximo/maximo"
    cleaned = cleaned.replace(/\/maximo\/maximo\b/g, '/maximo');

    // ✅ avoid origin "/maximo" + cleaned "/maximo/..."
    if (origin.endsWith('/maximo') && cleaned.startsWith('/maximo/')) {
      cleaned = cleaned.replace(/^\/maximo\b/, '');
      if (!cleaned.startsWith('/')) cleaned = `/${cleaned}`;
    }

    return `${origin}${cleaned}`.replace(/\/+$/, '');
  }
}

/**
 * Ensure the URL is under:
 *   {MAXIMO.ORIGIN}/oslc/os/...
 * and remove duplicate /maximo, duplicate /oslc/os, and double slashes.
 */
export function rewriteToMaximoOslcOs(url: string): string {
  const u = String(url || '').trim();
  if (!u) return '';

  // Keep any query string
  const [basePart, queryPart] = u.split('?');
  const query = queryPart ? `?${queryPart}` : '';

  // Remove protocol+host if present
  let path = basePart;

  try {
    const parsed = new URL(basePart);
    path = parsed.pathname;
  } catch {
    // not absolute; keep as is
  }

  // Normalize slashes
  path = path.replace(/\/+/g, '/');

  // Remove duplicate "/maximo/maximo"
  path = path.replace(/\/maximo\/maximo\b/g, '/maximo');

  // If path already contains "/oslc/os", keep from there
  const idx = path.indexOf('/oslc/os/');
  if (idx >= 0) {
    path = path.slice(idx); // starts at /oslc/os/...
  } else {
    // Sometimes server returns /maximo/oslc/os/... or even /oslc/...
    const idx2 = path.indexOf('/oslc/');
    if (idx2 >= 0) {
      path = path.slice(idx2); // /oslc/...
    }
  }

  // Now enforce /oslc/os prefix (not /oslc only)
  if (path.startsWith('/oslc/') && !path.startsWith('/oslc/os/')) {
    path = path.replace(/^\/oslc\//, '/oslc/os/');
  }

  // Final cleanup: avoid "/oslc/os/os/"
  path = path.replace(/\/oslc\/os\/os\//g, '/oslc/os/');

  // Ensure it starts with /oslc/os
  if (!path.startsWith('/oslc/os/')) {
    path = `/oslc/os/${path.replace(/^\/+/, '')}`;
  }

  // Remove accidental "//"
  path = path.replace(/\/+/g, '/');

  // IMPORTANT: MAXIMO.ORIGIN already includes /maximo
  const origin = String(MAXIMO.ORIGIN || '').replace(/\/+$/, '');
  return `${origin}${path}${query}`.replace(/\/+$/, '');
}

/**
 * Build the Work Order status action URL:
 * - if you need standard Maximo action: ?action=wostatus
 * - preserves existing query string if any
 */
export function buildWoStatusActionUrl(woHref: string): string {
  const fixed = rewriteToMaximoOslcOs(woHref);
  if (!fixed) return '';

  const hasQuery = fixed.includes('?');
  return `${fixed}${hasQuery ? '&' : '?'}action=wostatus`;
}

/**
 * Build a generic wsmethod action URL:
 * ?action=wsmethod:changeStatus&lean=1
 */
export function buildWsMethodActionUrl(href: string, method: string, lean: 0 | 1 = 1): string {
  const fixed = rewriteToMaximoOslcOs(href);
  if (!fixed) return '';

  const hasQuery = fixed.includes('?');
  const m = encodeURIComponent(method);
  return `${fixed}${hasQuery ? '&' : '?'}action=wsmethod:${m}&lean=${lean}`;
}