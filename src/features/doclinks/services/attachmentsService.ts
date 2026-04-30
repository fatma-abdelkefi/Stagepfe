import axios from 'axios';
import RNFS from 'react-native-fs';
import FileViewer from 'react-native-file-viewer';
import { Buffer } from 'buffer';
import { Platform } from 'react-native';

import { makeToken } from '../../../shared/services/maximoClient';
import {
  rewriteDoclinkUrl,
  doclinkToMetaUrl,
  metaToDoclinkUrl,
  finalNormalizeMaximoUrl,
} from './doclinkOpenService';

function safeStr(v: any): string {
  return typeof v === 'string' ? v.trim() : '';
}

function ensureNoTrailingSlash(u: string): string {
  return (u || '').replace(/\/+$/, '');
}

function extFromContentType(ct?: string): string {
  const c = (ct || '').toLowerCase();

  if (c.includes('pdf')) return 'pdf';
  if (c.includes('png')) return 'png';
  if (c.includes('jpeg') || c.includes('jpg')) return 'jpg';
  if (c.includes('gif')) return 'gif';
  if (c.includes('webp')) return 'webp';
  if (c.includes('msword')) return 'doc';
  if (c.includes('officedocument.wordprocessingml')) return 'docx';
  if (c.includes('ms-excel')) return 'xls';
  if (c.includes('officedocument.spreadsheetml')) return 'xlsx';
  if (c.includes('ms-powerpoint')) return 'ppt';
  if (c.includes('officedocument.presentationml')) return 'pptx';
  if (c.includes('text/plain')) return 'txt';

  return '';
}

function extFromName(name: string): string {
  const m = safeStr(name).match(/\.([a-z0-9]{2,5})$/i);
  if (!m?.[1]) return '';

  const e = m[1].toLowerCase();

  if (e === 'pnng' || e === 'pngg') return 'png';
  if (e === 'jpeg') return 'jpg';

  return e;
}

function sanitizeFileName(name: string): string {
  const cleaned = (name || '')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned.length ? cleaned : `document_${Date.now()}`;
}

function looksLikeJsonBytes(buf: ArrayBuffer): boolean {
  try {
    const u8 = new Uint8Array(buf);
    const first = Array.from(u8.slice(0, 80))
      .map((b) => String.fromCharCode(b))
      .join('')
      .trimStart();

    return first.startsWith('{') || first.startsWith('[');
  } catch {
    return false;
  }
}

function buildCandidateUrls(doclinkBase: string): string[] {
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
  ].map((u) => finalNormalizeMaximoUrl(u));
}

async function tryDownloadBinary(
  url: string,
  token: string,
): Promise<{ data: ArrayBuffer; contentType?: string } | null> {
  try {
    console.log('📦 [downloadAndOpenDoclink] try:', url);

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

    console.log('📦 [downloadAndOpenDoclink] status:', res.status);

    if (res.status >= 400) return null;

    const contentType =
      (res.headers?.['content-type'] as string | undefined) ?? '';

    console.log('📦 [downloadAndOpenDoclink] content-type:', contentType);

    if (contentType.toLowerCase().includes('application/json')) return null;
    if (looksLikeJsonBytes(res.data)) return null;

    return {
      data: res.data,
      contentType,
    };
  } catch (e: any) {
    console.log('⚠️ [downloadAndOpenDoclink] try failed:', e?.message);
    return null;
  }
}

async function fetchMeta(metaUrl: string, token: string): Promise<any | null> {
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

async function pickAndroidWriteDir(): Promise<string> {
  const downloadDir = (RNFS as any).DownloadDirectoryPath as string | undefined;

  if (downloadDir) return downloadDir;
  if (RNFS.ExternalDirectoryPath) return RNFS.ExternalDirectoryPath;

  return RNFS.CachesDirectoryPath;
}

function rewriteAttachmentUrl(url: string): string {
  const raw = safeStr(url);
  if (!raw) return '';

  const match = raw.match(/^https?:\/\/[^/]+(\/ATTACHMENTS\/.*)$/i);

  if (match?.[1]) {
    return `http://demo2.smartech-tn.com${match[1]}`;
  }

  return raw;
}

function isUsableUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function getRawUrls(input: any): string[] {
  const rawUrls: string[] = [];

  if (typeof input === 'string') {
    rawUrls.push(input);
  } else if (input && typeof input === 'object') {
    const href = safeStr(input.href);
    const weburl = safeStr(input.weburl);
    const describedByHref = safeStr(input.describedByHref);
    const docHref = safeStr(input.docinfo?.href);
    const docWeburl = safeStr(input.docinfo?.weburl);

    rawUrls.push(
      weburl,
      rewriteAttachmentUrl(weburl),
      href,
      describedByHref,
      docHref,
      docWeburl,
      rewriteAttachmentUrl(docWeburl),
    );
  }

  return Array.from(new Set(rawUrls.filter((u) => !!u && isUsableUrl(u))));
}

export async function downloadAndOpenDoclink(
  input: any,
  username: string,
  password: string,
  preferredName?: string,
): Promise<boolean> {
  const token = makeToken(username, password);
  const rawUrls = getRawUrls(input);

  if (rawUrls.length === 0) return false;

  console.log('==============================');
  console.log('📦 [downloadAndOpenDoclink] raw urls:', rawUrls);

  const candidates: string[] = [];

  for (const ru of rawUrls) {
    if (/\/ATTACHMENTS\//i.test(ru)) {
      candidates.push(ru);
      continue;
    }

    const abs = rewriteDoclinkUrl(ru);
    const binBase = metaToDoclinkUrl(abs);
    const urls = buildCandidateUrls(binBase);

    candidates.push(...urls);
  }

  const uniqCandidates: string[] = Array.from(
    new Set(candidates.map((u) => finalNormalizeMaximoUrl(u)).filter(Boolean)),
  );

  console.log('📦 [downloadAndOpenDoclink] candidates:', uniqCandidates);

  let downloaded: { data: ArrayBuffer; contentType?: string } | null = null;
  let usedUrl: string | null = null;
  let meta: any | null = null;

  for (const url of uniqCandidates) {
    const attempt = await tryDownloadBinary(url, token);

    if (attempt) {
      downloaded = attempt;
      usedUrl = url;
      break;
    }
  }

  if (!downloaded) {
    for (const rawUrl of rawUrls) {
      if (/\/ATTACHMENTS\//i.test(rawUrl)) continue;

      const abs = rewriteDoclinkUrl(rawUrl);
      const metaUrl = finalNormalizeMaximoUrl(doclinkToMetaUrl(abs));

      meta = await fetchMeta(metaUrl, token);

      if (meta) break;
    }

    const identifier =
      safeStr(meta?.identifier) ||
      safeStr(meta?.doclinksid) ||
      safeStr(meta?.doclinkid) ||
      safeStr(meta?.['spi:doclinksid']) ||
      safeStr(input?.doclinksid) ||
      safeStr(input?.doclinkid);

    if (meta && identifier) {
      const sourceUrl = rawUrls.find((u) => !/\/ATTACHMENTS\//i.test(u)) || '';

      if (sourceUrl) {
        const abs = rewriteDoclinkUrl(sourceUrl);

        const forcedBase = finalNormalizeMaximoUrl(
          metaToDoclinkUrl(abs)
            .replace(/\/doclinks\/meta\/\d+$/i, `/doclinks/${identifier}`)
            .replace(/\/doclinks\/\d+\/meta$/i, `/doclinks/${identifier}`),
        );

        const secondCandidates = buildCandidateUrls(forcedBase);

        for (const url of secondCandidates) {
          const attempt = await tryDownloadBinary(url, token);

          if (attempt) {
            downloaded = attempt;
            usedUrl = url;
            break;
          }
        }
      }
    }
  }

  if (!downloaded) {
    console.log('❌ [downloadAndOpenDoclink] no binary found');
    console.log('==============================');
    return false;
  }

  const ext =
    extFromContentType(downloaded.contentType) ||
    extFromName(preferredName || '') ||
    extFromName(safeStr(input?.description)) ||
    'bin';

  const baseNameRaw =
    preferredName ||
    safeStr(meta?.title) ||
    safeStr(meta?.description) ||
    safeStr(input?.description) ||
    safeStr(input?.document) ||
    'document';

  const baseName = sanitizeFileName(baseNameRaw).replace(
    /\.[a-z0-9]{2,5}$/i,
    '',
  );

  const fileName = `${baseName}.${ext}`;

  const dir =
    Platform.OS === 'android'
      ? await pickAndroidWriteDir()
      : RNFS.DocumentDirectoryPath;

  const path = `${dir}/${fileName}`;

  const b64 = Buffer.from(downloaded.data as any).toString('base64');

  await RNFS.writeFile(path, b64, 'base64');

  try {
    await FileViewer.open(path, {
      showOpenWithDialog: true,
      showAppsSuggestions: true,
    });

    console.log('✅ [downloadAndOpenDoclink] usedUrl:', usedUrl);
    console.log('✅ [downloadAndOpenDoclink] opened:', path);
    console.log('==============================');

    return true;
  } catch (e: any) {
    console.log('❌ [downloadAndOpenDoclink] open error:', e?.message || e);
    console.log('❌ [downloadAndOpenDoclink] usedUrl:', usedUrl);
    console.log('❌ [downloadAndOpenDoclink] savedPath:', path);
    console.log(
      '❌ [downloadAndOpenDoclink] contentType:',
      downloaded.contentType,
    );
    console.log('==============================');

    return false;
  }
}