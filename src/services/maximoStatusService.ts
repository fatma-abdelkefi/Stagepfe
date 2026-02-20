// src/services/maximoStatusService.ts
import axios from 'axios';
import { makeToken } from './maximoClient';

type ChangeStatusResult = {
  ok: boolean;
  status?: string;
  message?: string;
};

function safeTrim(v: any): string {
  return typeof v === 'string' ? v.trim() : '';
}

function withNoCache(url: string) {
  const u = safeTrim(url);
  if (!u) return '';
  return u.includes('?') ? `${u}&_ts=${Date.now()}` : `${u}?_ts=${Date.now()}`;
}

/**
 * ✅ Generic: works for WorkOrder href AND Activity href (woactivity is also a WO record in Maximo OSLC).
 * Uses action=wostatus then confirms by reloading the same href.
 */
export async function changeMaximoStatusByHref(
  href: string,
  username: string,
  password: string,
  newStatus: string
): Promise<ChangeStatusResult> {
  const token = makeToken(username, password);
  const cleanHref = safeTrim(href);

  if (!cleanHref) return { ok: false, message: 'href manquant' };
  if (!newStatus) return { ok: false, message: 'statut manquant' };

  const actionUrl = cleanHref.includes('?')
    ? `${cleanHref}&action=wostatus`
    : `${cleanHref}?action=wostatus`;

  try {
    console.log('==============================');
    console.log('🔁 [changeMaximoStatusByHref] href:', cleanHref);
    console.log('🔁 [changeMaximoStatusByHref] actionUrl:', actionUrl);
    console.log('🔁 [changeMaximoStatusByHref] newStatus:', newStatus);

    // 1) POST action=wostatus
    const postRes = await axios.post(
      withNoCache(actionUrl),
      {
        status: newStatus,
        statusvalue: newStatus, // some Maximo configs prefer this
      },
      {
        headers: {
          MAXAUTH: token,
          Authorization: `Basic ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
        timeout: 30000,
        validateStatus: () => true,
      }
    );

    console.log('✅ [changeMaximoStatusByHref] POST status:', postRes.status);
    if (postRes.status >= 400) {
      console.log(
        '❌ [changeMaximoStatusByHref] POST error:',
        JSON.stringify(postRes.data)?.slice(0, 1500)
      );
      return { ok: false, message: `Erreur serveur (${postRes.status})` };
    }

    // 2) Confirm with GET same href
    const getRes = await axios.get(withNoCache(cleanHref), {
      headers: {
        MAXAUTH: token,
        Authorization: `Basic ${token}`,
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      params: {
        lean: 1,
        'oslc.select': 'wonum,taskid,status',
      },
      timeout: 30000,
      validateStatus: () => true,
    });

    console.log('✅ [changeMaximoStatusByHref] GET status:', getRes.status);

    const confirmed =
      safeTrim((getRes.data as any)?.status) ||
      safeTrim((getRes.data as any)?.member?.[0]?.status) ||
      '';

    console.log('✅ [changeMaximoStatusByHref] confirmedStatus:', confirmed);
    console.log('==============================');

    if (!confirmed) return { ok: false, message: 'Impossible de confirmer le statut (réponse vide)' };

    if (confirmed.toUpperCase() !== newStatus.toUpperCase()) {
      return {
        ok: false,
        status: confirmed,
        message: `Le serveur n'a pas changé le statut (toujours: ${confirmed})`,
      };
    }

    return { ok: true, status: confirmed };
  } catch (e: any) {
    console.log('❌ [changeMaximoStatusByHref] exception:', e?.message || e);
    return { ok: false, message: e?.message || 'Erreur réseau' };
  }
}