import axios from 'axios';
import { Buffer } from 'buffer';

const BASE = 'http://demo2.smartech-tn.com/maximo/oslc/login?lean=1';

const VALIDATE_URL = 'http://demo2.smartech-tn.com/maximo/oslc/os/mxwo?lean=1&oslc.select=wonum&oslc.pageSize=1';

function makeMaxAuth(username: string, password: string) {
  return Buffer.from(`${username.trim()}:${password.trim()}`).toString('base64');
}

function errorMessage(err: any): string {
  const status = err?.response?.status;
  if (status === 401 || status === 403) return "Nom d'utilisateur ou mot de passe incorrect";
  if (err?.request && !err?.response) return `Pas de réponse du serveur: ${err.message || 'Network Error'}`;
  return `Erreur: ${err?.message || 'Inconnue'}`;
}

export async function login(username: string, password: string) {
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

    throw new Error(`Validation failed: ${validateRes.status}`);
  } catch (err: any) {
    throw new Error(errorMessage(err));
  }
}

// Fonction pour valider un token existant
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
  } catch (error) {
    return false;
  }
}