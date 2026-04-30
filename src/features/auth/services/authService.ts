import axios from 'axios';
import { MAXIMO } from '../../../shared/config/maximoUrls';
import { makeToken } from '../../../shared/services/maximoClient';
import type { LoginResponse } from '../types/auth.types';

const VALIDATE_URL = `${MAXIMO.OSLC_OS}/mxwo?lean=1&oslc.select=wonum&oslc.pageSize=1`;

function getErrorMessage(err: any): string {
  const status = err?.response?.status;

  if (status === 401 || status === 403) {
    return "Nom d'utilisateur ou mot de passe incorrect";
  } 

  if (err?.request && !err?.response) {
    return `Pas de réponse du serveur: ${err.message || 'Network Error'}`;
  }

  return `Erreur: ${err?.message || 'Inconnue'}`;
}

export async function loginRequest(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const token = makeToken(username.trim(), password.trim());

  const headers = {
    MAXAUTH: token,
    Accept: 'application/json',
  };

  try {
    const response = await axios.get(VALIDATE_URL, {
      headers,
      timeout: 15000,
    });

    if (response.status === 200) {
      return { ok: true, token };
    }

    throw new Error(`Validation échouée: ${response.status}`);
  } catch (error: any) {
    throw new Error(getErrorMessage(error));
  }
}