import { MAXIMO } from '../../../shared/config/maximoUrls';
import {
  maximoClient,
  makeToken,
  authHeaders,
  ensureOk,
} from '../../../shared/config/maximoClient';
import type { LoginResponse } from '../types/auth.types';

const LOGIN_URL = `${MAXIMO.OSLC}/login?lean=1`;

function getErrorMessage(err: any): string {
  if (err?.message) return err.message;
  return 'Erreur de connexion inconnue';
}

export async function loginRequest(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const token = makeToken(username.trim(), password.trim());

  try {
    const response = await maximoClient.post(LOGIN_URL, null, {
      headers: authHeaders(token),
    });

    ensureOk(response.status, response.data, 'loginRequest');

    return {
      ok: true,
      token,
    };
  } catch (error: any) {
    throw new Error(getErrorMessage(error));
  }
}