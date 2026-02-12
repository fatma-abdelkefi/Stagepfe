import axios from 'axios';

const VALIDATE_URL = 'http://demo2.smartech-tn.com/maximo/oslc/os/mxwo?lean=1&oslc.select=wonum&oslc.pageSize=1';

// Fonction compatible React Native
function makeMaxAuth(username: string, password: string): string {
  return btoa(`${username.trim()}:${password.trim()}`);
}



function errorMessage(err: any): string {
  const status = err?.response?.status;
  if (status === 401 || status === 403) return "Nom d'utilisateur ou mot de passe incorrect";
  if (err?.request && !err?.response)
    return `Pas de réponse du serveur: ${err.message || 'Network Error'}`;
  return `Erreur: ${err?.message || 'Inconnue'}`;
}

export async function login(username: string, password: string): Promise<{ ok: boolean; token: string }> {
  const token = makeMaxAuth(username, password);
  const headers = {
    MAXAUTH: token,
    Accept: 'application/json',
  };

  console.log('DEBUG: MAXAUTH token =', token); // <- log to compare with Postman

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
