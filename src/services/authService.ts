import axios from 'axios';
import { Buffer } from 'buffer';

const BASE = 'http://demo2.smartech-tn.com/maximo/oslc/login?lean=1';
const VALIDATE_URL =
  'http://demo2.smartech-tn.com/maximo/oslc/os/mxwo?lean=1&oslc.select=wonum&oslc.pageSize=1';

/**
 * Crée l'entête MAXAUTH pour Maximo
 */
function makeMaxAuth(username: string, password: string): string {
  return Buffer.from(`${username.trim()}:${password.trim()}`).toString('base64');
}

/**
 * Génère un message d'erreur lisible
 */
function errorMessage(err: any): string {
  const status = err?.response?.status;
  if (status === 401 || status === 403) return "Nom d'utilisateur ou mot de passe incorrect";
  if (err?.request && !err?.response)
    return `Pas de réponse du serveur: ${err.message || 'Network Error'}`;
  return `Erreur: ${err?.message || 'Inconnue'}`;
}

/**
 * Login Maximo
 * Retourne { ok: true, token } si login réussi
 */
export async function login(username: string, password: string): Promise<{ ok: boolean; token: string }> {
  const token = makeMaxAuth(username, password);
  const headers = {
    MAXAUTH: token,
    Accept: 'application/json',
  };

  try {
    const validateRes = await axios.get(VALIDATE_URL, { headers, timeout: 15000 });

    if (validateRes.status === 200) {
      return { ok: true, token }; // ✅ login validé
    }

    throw new Error(`Validation échouée: ${validateRes.status}`);
  } catch (err: any) {
    throw new Error(errorMessage(err));
  }
}

/**
 * Vérifie si un token Maximo est toujours valide
 */
export async function validateToken(token: string): Promise<boolean> {
  try {
    const response = await axios.get(VALIDATE_URL, {
      headers: {
        MAXAUTH: token,
        Accept: 'application/json',
      },
      timeout: 10000,
    });
    return response.status === 200;
  } catch {
    return false;
  }
}