// src/services/attachmentsService.ts

import axios from 'axios';
import RNFS from 'react-native-fs';
import FileViewer from 'react-native-file-viewer';
import { Buffer } from 'buffer';
import { Platform } from 'react-native';

import { rewriteDoclinkUrl, doclinkToMetaUrl, metaToDoclinkUrl } from './workOrderDetailsService';

const makeMaxAuth = (u: string, p: string) =>
  Buffer.from(`${u}:${p}`).toString('base64');

function safeStr(v: any): string {
  return typeof v === 'string' ? v.trim() : '';
}

function ensureNoTrailingSlash(u: string) {
  return u.replace(/\/+$/, '');
}

/** Fix server typos we saw in logs */
function fixKnownTypos(u: string) {
  return (u || '')
    .replace(/\/os\/mmxwo\//i, '/os/mxwo/')
    .replace(/\/os\/mxwwo\//i, '/os/mxwo/')
    .replace(/docclinks/gi, 'doclinks')
    // ✅ fix /mxwo/__Qk... => /mxwo/_Qk...
    .replace(/\/mxwo\/__+/i, '/mxwo/_');
}

function forceSameHost(url: string, referenceUrl: string) {
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

function normalizeCommon(rawUrl: string, referenceUrl: string) {
  const base = rewriteDoclinkUrl(rawUrl);
  const fixed = ensureNoTrailingSlash(base);
  const sameHost = forceSameHost(fixed, referenceUrl);
  return fixKnownTypos(sameHost);
}

function normalizeBinaryBaseUrl(rawUrl: string, referenceUrl: string) {
  return fixKnownTypos(metaToDoclinkUrl(normalizeCommon(rawUrl, referenceUrl)));
}

function normalizeMetaUrl(rawUrl: string, referenceUrl: string) {
  return fixKnownTypos(doclinkToMetaUrl(normalizeCommon(rawUrl, referenceUrl)));
}

function extFromContentType(ct?: string) {
  const c = (ct || '').toLowerCase();
  if (c.includes('pdf')) return 'pdf';
  if (c.includes('png')) return 'png';
  if (c.includes('jpeg') || c.includes('jpg')) return 'jpg';
  if (c.includes('gif')) return 'gif';
  if (c.includes('msword')) return 'doc';
  if (c.includes('officedocument.wordprocessingml')) return 'docx';
  if (c.includes('ms-excel')) return 'xls';
  if (c.includes('officedocument.spreadsheetml')) return 'xlsx';
  if (c.includes('ms-powerpoint')) return 'ppt';
  if (c.includes('officedocument.presentationml')) return 'pptx';
  if (c.includes('text/plain')) return 'txt';
  return '';
}

function sanitizeFileName(name: string) {
  const cleaned = (name || '')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length ? cleaned : `document_${Date.now()}`;
}

function looksLikeJsonBytes(buf: ArrayBuffer) {
  try {
    const u8 = new Uint8Array(buf);
    const first = Array.from(u8.slice(0, 60))
      .map(b => String.fromCharCode(b))
      .join('')
      .trimStart();
    return first.startsWith('{') || first.startsWith('[');
  } catch {
    return false;
  }
}

function buildCandidateUrls(doclinkBase: string) {
  const base = ensureNoTrailingSlash(doclinkBase);
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
  ];
}

async function tryDownloadBinary(url: string, token: string) {
  try {
    const res = await axios.get<ArrayBuffer>(url, {
      headers: {
        MAXAUTH: token,
        Authorization: `Basic ${token}`,
        Accept: 'application/octet-stream, */*',
      },
      responseType: 'arraybuffer',
      timeout: 60000,
      validateStatus: () => true,
    });

    if (res.status >= 400) return null;

    const ct = (res.headers?.['content-type'] as string | undefined) ?? undefined;
    if (ct?.toLowerCase().includes('application/json')) return null;
    if (looksLikeJsonBytes(res.data)) return null;

    return { data: res.data, contentType: ct };
  } catch {
    return null;
  }
}

async function fetchMeta(metaUrl: string, token: string) {
  try {
    const res = await axios.get(metaUrl, {
      headers: {
        MAXAUTH: token,
        Authorization: `Basic ${token}`,
        Accept: 'application/json',
      },
      timeout: 60000,
      validateStatus: () => true,
    });

    if (res.status >= 400) return null;
    if (typeof res.data !== 'object') return null;

    console.log('==============================');
    console.log('📄 META URL:', metaUrl);
    console.log('📄 META JSON:', JSON.stringify(res.data, null, 2));
    console.log('==============================');

    return res.data;
  } catch {
    return null;
  }
}

/**
 * ✅ Android opening reliability:
 * - write to Download if possible (more apps can access it)
 * - fallback to ExternalDirectoryPath, then Cache
 */
async function pickAndroidWriteDir() {
  // RNFS.DownloadDirectoryPath may be undefined on some setups
  const dlp = (RNFS as any).DownloadDirectoryPath as string | undefined;
  if (dlp) return dlp;

  if (RNFS.ExternalDirectoryPath) return RNFS.ExternalDirectoryPath;
  return RNFS.CachesDirectoryPath;
}

export async function downloadAndOpenDoclink(
  input: any,
  username: string,
  password: string,
  preferredName?: string
): Promise<boolean> {
  const token = makeMaxAuth(username, password);

  const referenceUrl =
    typeof input === 'string'
      ? input
      : safeStr(input?.href) || safeStr(input?.urlname) || '';

  if (!referenceUrl) return false;

  // raw urls from item
  const rawUrls: string[] = [];
  if (typeof input === 'string') rawUrls.push(input);
  else if (input && typeof input === 'object') {
    rawUrls.push(
      safeStr(input.href),
      safeStr(input.urlname),
      safeStr(input.describedByHref),
      safeStr(input.docinfo?.href),
      safeStr(input.docinfo?.urlname)
    );
  }

  const uniqueRaw = Array.from(new Set(rawUrls.filter(Boolean)));

  console.log('==============================');
  console.log('📦 [downloadAndOpenDoclink] raw urls:', uniqueRaw);

  // 1) Build candidates from raw
  const candidates: string[] = [];
  for (const ru of uniqueRaw) {
    const binBase = normalizeBinaryBaseUrl(ru, referenceUrl);
    candidates.push(...buildCandidateUrls(binBase));
  }

  const uniqCandidates = Array.from(new Set(candidates));
  console.log('📦 [downloadAndOpenDoclink] candidates:', uniqCandidates);

  let downloaded: { data: ArrayBuffer; contentType?: string } | null = null;
  let usedUrl = '';

  for (const u of uniqCandidates) {
    const fixedU = fixKnownTypos(u);
    const attempt = await tryDownloadBinary(fixedU, token);
    if (attempt) {
      downloaded = attempt;
      usedUrl = fixedU;
      break;
    }
  }

  // 2) if still fail => try meta then rebuild candidates from meta->binary base
  let meta: any | null = null;
  if (!downloaded) {
    for (const ru of uniqueRaw) {
      const metaUrl = normalizeMetaUrl(ru, referenceUrl);
      meta = await fetchMeta(metaUrl, token);
      if (meta) break;
    }

    if (meta?.identifier) {
      // take first usable mxwo url from raw, normalize and force /doclinks/{id}
      const any = uniqueRaw[0] || referenceUrl;
      const base = normalizeBinaryBaseUrl(any, referenceUrl)
        .replace(/\/doclinks\/meta\/\d+$/i, `/doclinks/${meta.identifier}`)
        .replace(/\/doclinks\/\d+\/meta$/i, `/doclinks/${meta.identifier}`);

      const cand2 = buildCandidateUrls(base);

      for (const u of cand2) {
        const fixedU = fixKnownTypos(u);
        const attempt = await tryDownloadBinary(fixedU, token);
        if (attempt) {
          downloaded = attempt;
          usedUrl = fixedU;
          break;
        }
      }
    }
  }

  if (!downloaded) {
    console.log('❌ [downloadAndOpenDoclink] no binary found');
    console.log('==============================');
    return false;
  }

  // ✅ force ext from content-type (important for Android viewers)
  const ext = extFromContentType(downloaded.contentType) || 'bin';
  const baseName = sanitizeFileName(preferredName || safeStr(meta?.title) || 'document');
  const fileName = baseName.toLowerCase().endsWith(`.${ext}`) ? baseName : `${baseName}.${ext}`;

  const dir =
    Platform.OS === 'android'
      ? await pickAndroidWriteDir()
      : RNFS.DocumentDirectoryPath;

  const path = `${dir}/${fileName}`;

  const b64 = Buffer.from(downloaded.data as any).toString('base64');
  await RNFS.writeFile(path, b64, 'base64');

  try {
    // ✅ simpler open options (some builds reject options object)
    await FileViewer.open(path, { showOpenWithDialog: true });

    console.log('✅ [downloadAndOpenDoclink] usedUrl:', usedUrl);
    console.log('✅ [downloadAndOpenDoclink] opened:', path);
    console.log('==============================');
    return true;
  } catch (e: any) {
    console.log('❌ [downloadAndOpenDoclink] open error:', e?.message || e);
    console.log('❌ [downloadAndOpenDoclink] usedUrl:', usedUrl);
    console.log('❌ [downloadAndOpenDoclink] savedPath:', path);
    console.log('❌ [downloadAndOpenDoclink] contentType:', downloaded.contentType);
    console.log('==============================');
    return false;
  }
}
