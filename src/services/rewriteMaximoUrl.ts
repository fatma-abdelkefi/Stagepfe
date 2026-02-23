// src/services/rewriteMaximoUrl.ts
import { MAXIMO } from '../config/maximoUrls';

function safeTrim(v: any): string {
  return typeof v === 'string' ? v.trim() : String(v ?? '').trim();
}

function cleanPathOnly(pathname: string): string {
  // IMPORTANT: ONLY fix known path issues. Never alter tokens/ids.
  let p = pathname;

  p = p.replace('/maxiimo/', '/maximo/');
  p = p.replace('/maximo/maximo/', '/maximo/');
  p = p.replace('/os//', '/os/');

  // collapse duplicate slashes in path
  p = p.replace(/\/{2,}/g, '/');

  // remove trailing slash (not query)
  if (p.length > 1) p = p.replace(/\/+$/, '');

  return p;
}

/**
 * Rewrite hrefs returned by Maximo:
 * - Replace origin host/port with the configured one (from MAXIMO.OSLC_OS)
 * - Fix common path typos (maxiimo, /os//, /maximo/maximo)
 * - NEVER change the resource id segment (e.g. "_QkVERk9SRC8xNDI1")
 */
export function rewriteMaximoUrl(input?: string): string {
  const raw = safeTrim(input);
  if (!raw) return '';

  const oslc = safeTrim(MAXIMO.OSLC_OS);
  if (!oslc) return raw;

  let wantedOrigin = '';
  try {
    wantedOrigin = new URL(oslc).origin.replace('smartech--tn.com', 'smartech-tn.com');
  } catch {
    return raw;
  }

  // Absolute input
  try {
    const u = new URL(raw);

    const pathname = cleanPathOnly(u.pathname);
    // keep query and hash unchanged
    const search = u.search || '';
    const hash = u.hash || '';

    return `${wantedOrigin}${pathname}${search}${hash}`;
  } catch {
    // Relative input
    if (raw.startsWith('/')) {
      const pathname = cleanPathOnly(raw);
      return `${wantedOrigin}${pathname}`;
    }
    return raw;
  }
}