import { Buffer } from 'buffer';

export function makeToken(username: string, password: string): string {
  return Buffer.from(`${username}:${password}`).toString('base64');
}