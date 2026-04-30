import type { DoclinkItem } from '../types/doclink.types';

function safeStr(v: any): string {
  return typeof v === 'string' ? v.trim() : '';
}

function isNumericOnly(s: string) {
  return !!s && /^\d+$/.test(s);
}

function extractFileNameFromUrl(url: string) {
  const last = url.split('/').pop() || '';
  return last.split('?')[0];
}

function getMeaningfulName(item: any): string {
  const candidates = [
    safeStr(item?.document),
    safeStr(item?.describedByDesc),
    safeStr(item?.docinfo?.document),
    safeStr(item?.docinfo?.doctitle),
    safeStr(item?.docinfo?.title),
    safeStr(item?.urlname) ? extractFileNameFromUrl(safeStr(item?.urlname)) : '',
    safeStr(item?.docinfo?.urlname)
      ? extractFileNameFromUrl(safeStr(item?.docinfo?.urlname))
      : '',
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (isNumericOnly(candidate)) continue;

    const lowered = candidate.toLowerCase();
    if (
      lowered === 'doclinks' ||
      lowered === 'meta' ||
      lowered === 'attachment' ||
      lowered === 'file'
    ) {
      continue;
    }

    try {
      return decodeURIComponent(candidate);
    } catch {
      return candidate;
    }
  }

  return '';
}

export function isValidDoclink(item: any): boolean {
  if (!item || typeof item !== 'object') return false;

  const name = getMeaningfulName(item);
  const description = safeStr(item?.description) || safeStr(item?.docinfo?.description);
  const urlname = safeStr(item?.urlname) || safeStr(item?.docinfo?.urlname);
  const doclinkId = safeStr(
    item?.doclinkid ?? item?.doclinkId ?? item?.docinfo?.docinfoid,
  );

  const hasRealName = !!name;
  const hasRealUrl = !!urlname && !!doclinkId;
  const hasRealDescription = !!description && !!doclinkId;

  return hasRealName || hasRealUrl || hasRealDescription;
}

function resolveDocumentName(item: any): string {
  const name = getMeaningfulName(item);
  return name || 'Sans nom';
}

export function mapDoclink(item: any, index: number): DoclinkItem {
  return {
    id: String(
      item?.doclinkid ??
        item?.doclinkId ??
        item?.docinfo?.docinfoid ??
        index,
    ),
    document: resolveDocumentName(item),
    description:
      safeStr(item?.description) ||
      safeStr(item?.docinfo?.description) ||
      'Aucune description',
    href: safeStr(item?.href) || safeStr(item?.docinfo?.href),
    urlname: safeStr(item?.urlname) || safeStr(item?.docinfo?.urlname),
    createdate: safeStr(item?.createdate),
    doclinkId: safeStr(
      item?.doclinkid ?? item?.doclinkId ?? item?.docinfo?.docinfoid,
    ),
    weburl: safeStr(item?.weburl),
    raw: item,
  };
}