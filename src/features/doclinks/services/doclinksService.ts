import axios from 'axios';
import { MAXIMO } from '../../../shared/config/maximoUrls';
import { makeToken } from '../../../shared/services/maximoClient';
import type { DoclinkInput } from '../types/doclink.types';

type MaximoDoclinkRow = {
  doclinksid?: number;
  doclinkid?: number;
  docinfoid?: number;
  href?: string;
  document?: string;
  description?: string;
  createdate?: string;
  urlname?: string;
  weburl?: string;
  ownertable?: string;
  ownerid?: number;
};

type MaximoResponse<T> = {
  member?: T[];
};

function buildHeaders(username: string, password: string) {
  const token = makeToken(username, password);

  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    MAXAUTH: token,
    Authorization: `Basic ${token}`,
    maxauth: `Basic ${token}`,
    properties: '*',
  };
}

export async function addDoclink(params: {
  ownerid: number;
  siteid: string;
  username: string;
  password: string;
  doclink: DoclinkInput;
}) {
  const { ownerid, siteid, username, password, doclink } = params;

  const url = `${MAXIMO.DOCLINK}?lean=1`;
  const headers = buildHeaders(username, password);

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

  console.log('==============================');
  console.log('📎 [addDoclink] URL:', url);
  console.log('📎 [addDoclink] ownerid:', ownerid, 'siteid:', siteid);
  console.log('📎 [addDoclink] document:', body.document);
  console.log('📎 [addDoclink] description:', body.description);
  console.log('📎 [addDoclink] base64 length:', doclink.documentdata?.length || 0);

  try {
    const response = await axios.post(url, body, { headers });

    console.log('✅ [addDoclink] status:', response.status);
    console.log('✅ [addDoclink] data:', JSON.stringify(response.data, null, 2));
    console.log('==============================');

    return response.data;
  } catch (error: any) {
    console.log('==============================');
    console.log('❌ [addDoclink] status:', error?.response?.status);
    console.log('❌ [addDoclink] data:', JSON.stringify(error?.response?.data, null, 2));
    console.log('❌ [addDoclink] message:', error?.message);
    console.log('==============================');
    throw error;
  }
}

export async function getDoclinksByOwner(params: {
  ownerid: number;
  username: string;
  password: string;
}) {
  const { ownerid, username, password } = params;

  const url = `${MAXIMO.DOCLINK}`;
  const headers = buildHeaders(username, password);

  const response = await axios.get<MaximoResponse<MaximoDoclinkRow>>(url, {
    headers,
    params: {
      lean: 1,
      'oslc.where': `ownerid=${ownerid} and ownertable="WORKORDER"`,
      'oslc.select':
        'doclinksid,docinfoid,href,document,description,createdate,urlname,weburl,ownerid,ownertable',
      savedQuery: '',
    },
    timeout: 30000,
  });

  const docs = Array.isArray(response.data?.member) ? response.data.member : [];

  console.log('==============================');
  console.log('📎 [getDoclinksByOwner] ownerid:', ownerid);
  console.log('📎 [getDoclinksByOwner] count:', docs.length);
  console.log('📎 [getDoclinksByOwner] raw:', JSON.stringify(docs, null, 2));
  console.log('==============================');

  return docs.map(d => ({
    doclinkid: d.doclinksid ?? d.doclinkid ?? d.docinfoid ?? 0,
    docinfoid: d.docinfoid ?? 0,
    href: d.href ?? '',
    document: d.document ?? '',
    description: d.description ?? '',
    createdate: d.createdate ?? '',
    urlname: d.urlname ?? '',
    weburl: d.weburl ?? '',
    ownerid: d.ownerid ?? ownerid,
    ownertable: d.ownertable ?? 'WORKORDER',
  }));
}