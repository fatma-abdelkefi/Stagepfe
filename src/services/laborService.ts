import axios from 'axios';
import { Buffer } from 'buffer';

export interface LaborInput {
  laborcode: string;
  laborhrs: number;
  quantity?: number;
}

export async function addLaborToWorkOrder(params: {
  workorderid: number;
  siteid?: string;
  username: string;
  password: string;
  labor: LaborInput;
}) {
  const { workorderid, siteid, username, password, labor } = params;

  const token = Buffer.from(`${username}:${password}`).toString('base64');

  const url = `http://demo2.smartech-tn.com/maximo/oslc/os/SM1120/${workorderid}?lean=1`;

  const body = {
    wplabor: [
      {
        wplaborid: String(Date.now()),

        laborcode: labor.laborcode,
        laborhrs: labor.laborhrs,
        quantity: labor.quantity ?? 1,
        ...(siteid ? { siteid } : {}),
      },
    ],
  };

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    maxauth: `Basic ${token}`,
    properties: '*',
    'x-method-override': 'PATCH',
    patchtype: 'MERGE',
  };

  console.log('🚀 [addLabor] URL:', url);
  console.log('🚀 [addLabor] Headers:', headers);
  console.log('🚀 [addLabor] Body:', body);

  try {
    const response = await axios.post(url, body, { headers });
    console.log('✅ [addLabor] Response:', response.status, response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ [addLabor] Error:', error?.response?.data || error?.message);
    throw error;
  }
}