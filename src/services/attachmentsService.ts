// src/services/attachmentsService.ts

import axios from 'axios';
import RNFS from 'react-native-fs';
import FileViewer from 'react-native-file-viewer';
import { Buffer } from 'buffer';
import { Platform } from 'react-native';

import { makeToken } from './maximoClient';
import {
  rewriteDoclinkUrl,
  doclinkToMetaUrl,
  metaToDoclinkUrl,
  finalNormalizeMaximoUrl,
} from './doclinks';

function safeStr(v: any): string {
  return typeof v === 'string' ? v.trim() : '';
}

function ensureNoTrailingSlash(u: string) {
  return (u || '').replace(/\/+$/, '');
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
  const cleaned = (name || '').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim();
  return cleaned.length ? cleaned : `document_${Date.now()}`;
}

function looksLikeJsonBytes(buf: ArrayBuffer) {
  try {
    const u8 = new Uint8Array(buf);
    const first = Array.from(u8.slice(0, 60))
      .map((b) => String.fromCharCode(b))
      .join('')
      .trimStart();
    return first.startsWith('{') || first.startsWith('[');
  } catch {
    return false;
  }
}

function buildCandidateUrls(doclinkBase: string) {
  const base = ensureNoTrailingSlash(finalNormalizeMaximoUrl(doclinkBase));
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
  ].map(finalNormalizeMaximoUrl);
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
  const token = makeToken(username, password);

  const referenceUrl =
    typeof input === 'string' ? input : safeStr(input?.href) || safeStr(input?.urlname) || '';

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

  // 1) Build candidates from raw URLs (normalized centrally)
  const candidates: string[] = [];
  for (const ru of uniqueRaw) {
    // make absolute + fix /maximo/maximo, mxwoo, mxwwo, //
    const abs = rewriteDoclinkUrl(ru);

    // binary base
    const binBase = metaToDoclinkUrl(abs);

    // candidates
    candidates.push(...buildCandidateUrls(binBase));
  }

  const uniqCandidates = Array.from(new Set(candidates.map(finalNormalizeMaximoUrl)));

  console.log('📦 [downloadAndOpenDoclink] candidates:', uniqCandidates);

  let downloaded: { data: ArrayBuffer; contentType?: string } | null = null;
  let usedUrl = '';

  for (const u of uniqCandidates) {
    const attempt = await tryDownloadBinary(u, token);
    if (attempt) {
      downloaded = attempt;
      usedUrl = u;
      break;
    }
  }

  // 2) If still fail => try meta then rebuild candidates using identifier
  let meta: any | null = null;
  if (!downloaded) {
    for (const ru of uniqueRaw) {
      const abs = rewriteDoclinkUrl(ru);
      const metaUrl = finalNormalizeMaximoUrl(doclinkToMetaUrl(abs));
      meta = await fetchMeta(metaUrl, token);
      if (meta) break;
    }

    if (meta?.identifier) {
      const anyUrl = uniqueRaw[0] || referenceUrl;
      const abs = rewriteDoclinkUrl(anyUrl);

      // use identifier to force /doclinks/{id}
      const forcedBase = finalNormalizeMaximoUrl(
        metaToDoclinkUrl(abs)
          .replace(/\/doclinks\/meta\/\d+$/i, `/doclinks/${meta.identifier}`)
          .replace(/\/doclinks\/\d+\/meta$/i, `/doclinks/${meta.identifier}`)
      );

      const cand2 = buildCandidateUrls(forcedBase);

      for (const u of cand2) {
        const attempt = await tryDownloadBinary(u, token);
        if (attempt) {
          downloaded = attempt;
          usedUrl = u;
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

  const dir = Platform.OS === 'android' ? await pickAndroidWriteDir() : RNFS.DocumentDirectoryPath;
  const path = `${dir}/${fileName}`;

  const b64 = Buffer.from(downloaded.data as any).toString('base64');
  await RNFS.writeFile(path, b64, 'base64');

  try {
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
