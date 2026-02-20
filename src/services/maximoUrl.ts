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

  // If it's already an absolute URL, parse it safely
  try {
    const parsed = new URL(u);
    // keep only pathname + search
    const path = parsed.pathname.replace(/\/+/g, '/');
    const search = parsed.search || '';
    return `${MAXIMO.ORIGIN}${path}${search}`.replace(/\/+$/, '');
  } catch {
    // relative url
    const cleaned = u.startsWith('/') ? u : `/${u}`;
    return `${MAXIMO.ORIGIN}${cleaned}`.replace(/\/+$/, '');
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
    // convert "/oslc/xxx" -> "/oslc/os/xxx" only if it should be OS endpoint
    // if it’s already "/oslc/" but not "/oslc/os/", we add "/os"
    path = path.replace(/^\/oslc\//, '/oslc/os/');
  }

  // Final cleanup: avoid "/oslc/os/os/"
  path = path.replace(/\/oslc\/os\/os\//g, '/oslc/os/');

  // Ensure it starts with /oslc/os
  if (!path.startsWith('/oslc/os/')) {
    // If it was like "/mxwo/..." (rare), force it
    path = `/oslc/os/${path.replace(/^\/+/, '')}`;
  }

  // Remove accidental "//"
  path = path.replace(/\/+/g, '/');

  return `${MAXIMO.ORIGIN}${path}${query}`.replace(/\/+$/, '');
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