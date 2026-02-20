// src/services/authService.ts (or wherever this file is)

import axios from 'axios';
import { MAXIMO } from '../config/maximoUrls';
import { makeToken } from './maximoClient';

const VALIDATE_URL = `${MAXIMO.OSLC_OS}/mxwo?lean=1&oslc.select=wonum&oslc.pageSize=1`;

function errorMessage(err: any): string {
  const status = err?.response?.status;
  if (status === 401 || status === 403) return "Nom d'utilisateur ou mot de passe incorrect";
  if (err?.request && !err?.response)
    return `Pas de réponse du serveur: ${err.message || 'Network Error'}`;
  return `Erreur: ${err?.message || 'Inconnue'}`;
}

export async function login(
  username: string,
  password: string
): Promise<{ ok: boolean; token: string }> {
  const token = makeToken(username.trim(), password.trim());
  const headers = {
    MAXAUTH: token,
    Accept: 'application/json',
  };

  console.log('DEBUG: MAXAUTH token =', token);

  try {
    const res = await axios.get(VALIDATE_URL, { headers, timeout: 15000 });
    if (res.status === 200) {
      return { ok: true, token };
    }
    throw new Error(`Validation échouée: ${res.status}`);
  } catch (err: any) {
    throw new Error(errorMessage(err));
  }
}
