import axios from 'axios';
import { Buffer } from 'buffer';

export interface Labor {
  laborcode: string;
  wonum: string;
  siteid: string;
  laborhrs: number;
}

const BASE_URL = 'http://demo2.smartech-tn.com/maximo/oslc/os/mxwplabor';

export async function addLaborToWorkOrder(
  labor: Labor,
  username: string,
  password: string
) {
  const token = Buffer.from(`${username}:${password}`).toString('base64');

  console.log('🔹 Labor payload:', labor);
  console.log('🔹 Headers:', {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    MAXAUTH: token,
    'x-method-override': 'PATCH',
    patchtype: 'MERGE',
    properties: '*',
  });

  try {
    const response = await axios.post(BASE_URL, labor, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        MAXAUTH: token,
        'x-method-override': 'PATCH',
        patchtype: 'MERGE',
        properties: '*',
      },
    });

    console.log('✅ Labor response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Labor error:', error.response?.data || error.message);
    throw error;
  }
}
