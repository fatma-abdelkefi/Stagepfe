import { MAXIMO } from '../config/maximoUrls';

function safeTrim(v: any): string {
  return typeof v === 'string' ? v.trim() : String(v ?? '').trim();
}

function fixKnownHostTypos(url: string): string {
  return safeTrim(url).replace('smartech--tn.com', 'smartech-tn.com');
}

function cleanPathOnly(pathname: string): string {
  let p = String(pathname || '');

  p = p.replace('/maxiimo/', '/maximo/');
  p = p.replace('/maximo/maximo/', '/maximo/');
  p = p.replace('/os//', '/os/');
  p = p.replace(/\/{2,}/g, '/');

  if (p.length > 1) {
    p = p.replace(/\/+$/, '');
  }

  return p;
}

function getConfiguredOrigin(): string {
  try {
    return new URL(fixKnownHostTypos(MAXIMO.BASE_URL)).origin;
  } catch {
    return '';
  }
}

function getConfiguredBase(): string {
  return fixKnownHostTypos(String(MAXIMO.BASE_URL || '')).replace(/\/+$/, '');
}

export function rewriteMaximoOriginOnly(input?: string): string {
  const raw = fixKnownHostTypos(safeTrim(input));
  if (!raw) return '';

  const configuredOrigin = getConfiguredOrigin();
  if (!configuredOrigin) return raw;

  try {
    const src = new URL(raw);
    const pathname = cleanPathOnly(src.pathname || '');
    return `${configuredOrigin}${pathname}${src.search || ''}${src.hash || ''}`;
  } catch {
    if (raw.startsWith('/')) {
      return `${configuredOrigin}${cleanPathOnly(raw)}`;
    }
    return raw;
  }
}

export function rewriteMaximoUrl(input?: string): string {
  const raw = fixKnownHostTypos(safeTrim(input));
  if (!raw) return '';

  const configuredBase = getConfiguredBase();
  if (!configuredBase) return raw;

  try {
    const src = new URL(raw);
    let pathname = cleanPathOnly(src.pathname || '');

    if (configuredBase.endsWith('/maximo') && pathname.startsWith('/maximo/')) {
      pathname = pathname.replace(/^\/maximo\b/, '');
      if (!pathname.startsWith('/')) pathname = `/${pathname}`;
    }

    return `${configuredBase}${pathname}${src.search || ''}${src.hash || ''}`;
  } catch {
    if (raw.startsWith('/')) {
      let pathname = cleanPathOnly(raw);

      if (configuredBase.endsWith('/maximo') && pathname.startsWith('/maximo/')) {
        pathname = pathname.replace(/^\/maximo\b/, '');
        if (!pathname.startsWith('/')) pathname = `/${pathname}`;
      }

      return `${configuredBase}${pathname}`;
    }
    return raw;
  }
}