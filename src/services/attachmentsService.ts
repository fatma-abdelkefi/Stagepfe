import { Buffer } from 'buffer';

const makeMaxAuth = (u: string, p: string) =>
  Buffer.from(`${u}:${p}`).toString('base64');

export async function fetchAttachmentAsBase64(
  url: string,
  username: string,
  password: string
): Promise<{ base64: string; contentType: string } | null> {
  const token = makeMaxAuth(username, password);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        // Maximo accepte généralement Basic + MAXAUTH
        Authorization: `Basic ${token}`,
        MAXAUTH: token,
      } as any,
    });

    if (!res.ok) {
      return null;
    }

    const contentType = (res.headers.get('content-type') || '').toLowerCase();

    const arrayBuf = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuf).toString('base64');

    return { base64, contentType };
  } catch {
    return null;
  }
}
