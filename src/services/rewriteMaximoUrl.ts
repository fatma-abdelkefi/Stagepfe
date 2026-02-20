// src/services/rewriteMaximoUrl.ts
import { MAXIMO } from '../config/maximoUrls';

/**
 * Rewrites any OSLC href returned by Maximo (often internal IP like 192.168.x.x)
 * to your configured MAXIMO base.
 */
export function rewriteMaximoUrl(input?: string): string {
  const raw = String(input || '').trim();
  if (!raw) return '';

  // Example MAXIMO.OSLC_OS = "http://demo2.smartech-tn.com/maximo/oslc/os"
  // We want origin like "http://demo2.smartech-tn.com/maximo"
  const oslc = String(MAXIMO.OSLC_OS || '').trim();
  if (!oslc) return raw;

  // build base "http(s)://host[:port]/maximo"
  let wantedBase = oslc;
  const idx = oslc.indexOf('/oslc');
  if (idx > -1) wantedBase = oslc.slice(0, idx);

  try {
    // if input is absolute URL -> replace origin+path prefix with wantedBase
    const u = new URL(raw);
    const path = u.pathname + (u.search || '') + (u.hash || '');

    // If href already uses correct base, keep it
    if (raw.startsWith(wantedBase)) return raw;

    // Convert:
    //   http://192.168.1.202:9080/maximo/oslc/os/mxwo/_XXX
    // to:
    //   http://demo2.../maximo/oslc/os/mxwo/_XXX
    return wantedBase.replace(/\/+$/, '') + path;
  } catch {
    // raw might be relative like "/maximo/oslc/os/..."
    if (raw.startsWith('/')) {
      return wantedBase.replace(/\/+$/, '') + raw;
    }
    return raw;
  }
}