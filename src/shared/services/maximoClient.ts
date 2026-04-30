import axios from 'axios';
import { Buffer } from 'buffer';
import { MAXIMO } from '../config/maximoUrls';

export function makeToken(username: string, password: string) {
  return Buffer.from(`${username}:${password}`).toString('base64');
}

export function authHeaders(token: string, accept = 'application/json') {
  return {
    Accept: accept,
    'Content-Type': 'application/json',
    maxauth: token, // IMPORTANT: base64 only
    Authorization: `Basic ${token}`,
    properties: '*',
  };
}

export type MaximoResponse<T> = {
  member?: T[];
  href?: string;
  responseInfo?: any;
};

export const maximo = axios.create({
  baseURL: MAXIMO.OSLC_OS,
  timeout: 60000,
  validateStatus: () => true,
});

export function ensureOk(status: number, data: any, ctx = 'request') {
  if (status >= 400) {
    const msg = data?.Error?.message || `${ctx} failed`;
    throw new Error(`${ctx}: HTTP ${status} - ${msg}`);
  }
}