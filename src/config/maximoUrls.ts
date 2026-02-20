// src/config/maximoUrls.ts

/**
 * Put ONLY the host + /maximo here.
 * Example: http://demo2.smartech-tn.com/maximo
 */
const ORIGIN =
  (process.env.REACT_APP_MAXIMO_ORIGIN ||
    process.env.EXPO_PUBLIC_MAXIMO_ORIGIN ||
    process.env.MAXIMO_ORIGIN ||
    'http://demo2.smartech-tn.com/maximo'
  ).replace(/\/+$/, '');

export const MAXIMO = {
  ORIGIN,                 // http://.../maximo
  OSLC: `${ORIGIN}/oslc`,  // http://.../maximo/oslc
  OSLC_OS: `${ORIGIN}/oslc/os`, // http://.../maximo/oslc/os
};
