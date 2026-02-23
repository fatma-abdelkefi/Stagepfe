// src/services/maximoUrl.ts
import { MAXIMO } from '../config/maximoUrls';

function safeTrim(v: any): string {
  return typeof v === 'string' ? v.trim() : String(v ?? '').trim();
}

/** Collapse double slashes everywhere except protocol (http://) */
function collapseAllSlashes(url: string) {
  return safeTrim(url).replace(/([^:]\/)\/+/g, '$1');
}

/** Fix known typo domain (defensive) */
function fixKnownHostTypos(url: string) {
  return safeTrim(url).replace('demo2.smartech-ttn.com', 'demo2.smartech-tn.com');
}

function getOrigin(): string {
  return fixKnownHostTypos(safeTrim(MAXIMO.ORIGIN)).replace(/\/+$/, '');
}

function normalizePath(p: string) {
  let path = safeTrim(p).replace(/\/{2,}/g, '/');
  path = path.replace(/\/maximo\/maximo\b/g, '/maximo');
  path = path.replace(/\/oslc\/os\/os\b/g, '/oslc/os');
  path = path.replace(/\/+$/, '');
  if (!path.startsWith('/')) path = `/${path}`;
  return path;
}

/**
 * Rewrite to MAXIMO.ORIGIN while keeping path+query
 */
export function rewriteToMaximoOrigin(url: string): string {
  const u = fixKnownHostTypos(safeTrim(url));
  if (!u) return '';

  const origin = getOrigin();
  if (!origin) return u;

  try {
    const parsed = new URL(u);

    let path = normalizePath(parsed.pathname);
    const search = parsed.search || '';
    const hash = parsed.hash || '';

    // avoid origin "/maximo" + path "/maximo/.."
    if (origin.endsWith('/maximo') && path.startsWith('/maximo/')) {
      path = path.replace(/^\/maximo\b/, '');
      if (!path.startsWith('/')) path = `/${path}`;
    }

    return collapseAllSlashes(`${origin}${path}${search}${hash}`);
  } catch {
    let path = u.startsWith('/') ? u : `/${u}`;
    path = normalizePath(path);

    if (origin.endsWith('/maximo') && path.startsWith('/maximo/')) {
      path = path.replace(/^\/maximo\b/, '');
      if (!path.startsWith('/')) path = `/${path}`;
    }

    return collapseAllSlashes(`${origin}${path}`);
  }
}

/**
 * Force URL under: {MAXIMO.ORIGIN}/oslc/os/...
 */
export function rewriteToMaximoOslcOs(url: string): string {
  const u = fixKnownHostTypos(safeTrim(url));
  if (!u) return '';

  const origin = getOrigin();
  if (!origin) return u;

  let pathname = '';
  let search = '';
  let hash = '';

  try {
    const parsed = new URL(u);
    pathname = parsed.pathname || '';
    search = parsed.search || '';
    hash = parsed.hash || '';
  } catch {
    const hashIdx = u.indexOf('#');
    const qIdx = u.indexOf('?');

    if (hashIdx >= 0) hash = u.slice(hashIdx);
    if (qIdx >= 0) search = u.slice(qIdx, hashIdx >= 0 ? hashIdx : undefined);

    pathname = u.slice(0, qIdx >= 0 ? qIdx : hashIdx >= 0 ? hashIdx : u.length);
  }

  pathname = normalizePath(pathname);

  // keep from /oslc/os if present
  const idx = pathname.indexOf('/oslc/os/');
  if (idx >= 0) pathname = pathname.slice(idx);
  else {
    const idx2 = pathname.indexOf('/oslc/');
    if (idx2 >= 0) pathname = pathname.slice(idx2);
  }

  // enforce /oslc/os
  if (pathname.startsWith('/oslc/') && !pathname.startsWith('/oslc/os/')) {
    pathname = pathname.replace(/^\/oslc\//, '/oslc/os/');
  }
  if (!pathname.startsWith('/oslc/os/')) {
    pathname = `/oslc/os/${pathname.replace(/^\/+/, '')}`;
  }

  pathname = normalizePath(pathname);

  return collapseAllSlashes(`${origin}${pathname}${search}${hash}`);
}

/**
 * Postman-style wsmethod URL:
 * ?action=wsmethod:changeStatus&lean=1
 */
export function buildWsMethodActionUrl(href: string, method: string, lean: 0 | 1 = 1): string {
  const fixed = rewriteToMaximoOslcOs(href);
  if (!fixed) return '';

  const mRaw = safeTrim(method);
  const m = mRaw.startsWith('wsmethod:') ? mRaw.slice('wsmethod:'.length) : mRaw;
  const actionValue = `wsmethod:${m}`;

  const url = `${fixed}${fixed.includes('?') ? '&' : '?'}action=${actionValue}&lean=${lean}`;
  return collapseAllSlashes(url);
}