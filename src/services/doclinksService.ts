import axios from 'axios';

import { MAXIMO } from '../config/maximoUrls';
import { makeToken } from './maximoClient';

export interface DoclinkInput {
  document: string;
  documentdata: string;
  description?: string;
}

export async function addDoclink(params: {
  ownerid: number;
  siteid: string;
  username: string;
  password: string;
  doclink: DoclinkInput;
}) {
  const { ownerid, siteid, username, password, doclink } = params;

  const token = makeToken(username, password);

  // ✅ centralized base
  const url = `${MAXIMO.OSLC_OS}/sm15?lean=1`;

  const body = {
    document: doclink.document,
    documentdata: doclink.documentdata,
    urltype: 'FILE',
    doctype: 'Attachments',
    ownertable: 'WORKORDER',
    ownerid,
    upload: 0,
    show: 0,
    description: doclink.description ?? '',
    getlastversion: 1,
    addinfo: 1,
    siteid,
  };

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',

    // ✅ keep both (some envs are picky)
    MAXAUTH: token,
    Authorization: `Basic ${token}`,
    maxauth: `Basic ${token}`,

    properties: '*',
  };

  console.log('==============================');
  console.log('📎 [addDoclink] URL:', url);
  console.log('📎 [addDoclink] ownerid:', ownerid, 'siteid:', siteid);
  console.log('📎 [addDoclink] Body keys:', Object.keys(body));
  console.log('📎 [addDoclink] document:', body.document);
  console.log('📎 [addDoclink] base64 length:', doclink.documentdata?.length || 0);

  try {
    const response = await axios.post(url, body, { headers });

    console.log('✅ [addDoclink] Status:', response.status);
    console.log('✅ [addDoclink] Response data:', JSON.stringify(response.data)?.slice(0, 2000));
    console.log('==============================');

    return response.data;
  } catch (error: any) {
    console.log('==============================');
    console.error('❌ [addDoclink] Status:', error?.response?.status);
    console.error('❌ [addDoclink] Error data:', JSON.stringify(error?.response?.data)?.slice(0, 3000));
    console.error('❌ [addDoclink] Message:', error?.message);
    console.log('==============================');
    throw error;
  }
}
