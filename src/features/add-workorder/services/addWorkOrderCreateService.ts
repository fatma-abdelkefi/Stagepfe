import { API_CONFIG } from '../../../shared/config/api';
import type { AddWorkOrderSuggestion } from '../types/addWorkOrder.types';

export type CreatedWorkOrder = AddWorkOrderSuggestion & {
  wonum?: string;
  siteid?: string;
  workorderid?: number;
  href?: string;
  isDraft?: boolean;

  scheduledStart?: string;
  scheduledFinish?: string;
};

export type CreateWorkOrderResponse = {
  success: boolean;
  message?: string;
  wonum?: string;
  siteid?: string;
  workorderid?: number;
  href?: string;
  workorder?: CreatedWorkOrder;
  raw?: unknown;
};

function baseUrl() {
  return API_CONFIG.AI_BASE_URL.replace(/\/+$/, '');
}

function cleanWorkOrder(workorder: AddWorkOrderSuggestion) {
  return {
    description: workorder.description || '',
    long_description: workorder.long_description || '',
    assetnum: workorder.assetnum || '',
    asset_description: workorder.asset_description || '',
    location: workorder.location || '',
    siteid: workorder.siteid || 'BEDFORD',
    status: workorder.status || 'WAPPR',

    priority:
      workorder.priority !== undefined && workorder.priority !== null
        ? Number(workorder.priority)
        : undefined,

    worktype: workorder.worktype || '',
    reportedby: workorder.reportedby || 'maxadmin',

    scheduled_start: workorder.scheduled_start || '',
    scheduled_finish: workorder.scheduled_finish || '',
    target_start: workorder.target_start || '',
    target_finish: workorder.target_finish || '',

    activities: workorder.activities || [],
    planned_materials: workorder.planned_materials || [],
    planned_labor: workorder.planned_labor || [],

    needs_review: workorder.needs_review ?? false,
    auto_save: workorder.auto_save ?? true,
  };
}

export async function createWorkOrderInMaximo(
  workorder: AddWorkOrderSuggestion,
): Promise<CreateWorkOrderResponse> {
  const url = `${baseUrl()}/add-workorder/create`;

  const payload = {
    workorder: cleanWorkOrder(workorder),
  };

  console.log('CREATE WO URL:', url);
  console.log('CREATE WO PAYLOAD:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();

    let data: any = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { detail: text };
    }

    console.log('CREATE WO RESPONSE STATUS:', response.status);
    console.log('CREATE WO RESPONSE DATA:', data);

    if (!response.ok) {
      throw new Error(
        data?.detail ||
          data?.message ||
          data?.error ||
          `Erreur création Work Order HTTP ${response.status}`,
      );
    }

    return data as CreateWorkOrderResponse;
  } catch (error) {
    console.log('CREATE WO NETWORK ERROR:', error);

    throw new Error(
      error instanceof Error
        ? error.message
        : 'Network request failed pendant la création du Work Order.',
    );
  }
}