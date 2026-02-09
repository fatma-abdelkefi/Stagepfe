import axios from 'axios';
import { Buffer } from 'buffer';

export interface DoclinkInput {
  document: string;
  documentdata: string; // base64
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

  const token = Buffer.from(`${username}:${password}`).toString('base64');

  const url = `http://demo2.smartech-tn.com/maximo/oslc/os/sm15?lean=1`;

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
    maxauth: `Basic ${token}`,
    properties: '*',
  };

  console.log('📎 [addDoclink] URL:', url);
  console.log('📎 [addDoclink] Headers:', headers);
  console.log('📎 [addDoclink] Body:', body);

  try {
    const response = await axios.post(url, body, { headers });
    console.log('✅ [addDoclink] Response:', response.status);
    return response.data;
  } catch (error: any) {
    console.error('❌ [addDoclink] Error:', error?.response?.data || error?.message);
    throw error;
  }
}
