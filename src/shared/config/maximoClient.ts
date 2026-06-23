import axios from 'axios';
import { Buffer } from 'buffer';
import { MAXIMO } from '../config/maximoUrls';

let navigateToLogin: (() => void) | null = null;

export function registerNavigateToLogin(callback: () => void) {
  navigateToLogin = callback;
}

export const maximo = axios.create({
  baseURL: MAXIMO.BASE_URL,
  timeout: 30000,
  validateStatus: () => true,
  withCredentials: true,
});

export const maximoClient = maximo;

export function makeToken(username: string, password: string): string {
  return Buffer.from(
    `${username.trim()}:${password.trim()}`,
    'utf8',
  ).toString('base64');
}

export function authHeaders(token: string) {
  return {
    MAXAUTH: token,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

export function ensureOk(status: number, data: any, context: string) {
  if (status >= 400 || data?.Error) {
    const message =
      data?.Error?.message ||
      data?.error?.message ||
      data?.message ||
      'Erreur inconnue';

    if ((status === 401 || status === 403) && navigateToLogin) {
      navigateToLogin();
    }

    throw new Error(`${context}: HTTP ${status} - ${message}`);
  }
}