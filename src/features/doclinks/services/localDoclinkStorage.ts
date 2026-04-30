import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';

function safeStr(v: any): string {
  return typeof v === 'string' ? v.trim() : String(v ?? '').trim();
}

function cleanKeyPart(v: any): string {
  return safeStr(v).replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function buildLocalDoclinkKey(params: {
  ownerid?: number | string;
  documentName?: string;
  description?: string;
}) {
  const owner = cleanKeyPart(params.ownerid || 'unknown');
  const doc = cleanKeyPart(params.documentName || params.description || 'document');

  return `LOCAL_DOCLINK_${owner}_${doc}`;
}

export async function saveLocalDoclink(params: {
  ownerid?: number | string;
  documentName: string;
  description?: string;
  localPath: string;
}) {
  const key1 = buildLocalDoclinkKey({
    ownerid: params.ownerid,
    documentName: params.documentName,
  });

  await AsyncStorage.setItem(key1, params.localPath);

  if (params.description) {
    const key2 = buildLocalDoclinkKey({
      ownerid: params.ownerid,
      documentName: params.description,
    });

    await AsyncStorage.setItem(key2, params.localPath);
  }
}

export async function findLocalDoclink(params: {
  ownerid?: number | string;
  documentName?: string;
  description?: string;
}) {
  const keys = [
    buildLocalDoclinkKey({
      ownerid: params.ownerid,
      documentName: params.documentName,
    }),
    buildLocalDoclinkKey({
      ownerid: params.ownerid,
      documentName: params.description,
    }),
  ];

  for (const key of keys) {
    const path = await AsyncStorage.getItem(key);

    if (path && (await RNFS.exists(path))) {
      return path;
    }
  }

  return '';
}