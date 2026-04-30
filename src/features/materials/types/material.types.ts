import type {
  AddActualMaterialPayload,
  WorkOrderActualMaterial,
  WorkOrderPlannedMaterial,
} from '../../workorder-details/types/workOrderDetails.types';

export type MaterialInput = {
  description: string;
  itemnum: string;
  quantity: number;
  location: string;
  barcode?: string;
};

export type PlannedMaterialItem = WorkOrderPlannedMaterial & {
  id: string;
};

export type ActualMaterialItem = WorkOrderActualMaterial & {
  id: string;
};

export type NormalizedMaterialItem = {
  id: string;
  itemnum: string;
  description: string;
  quantity: number;
  location?: string;
  storeroom?: string;
  storeloc?: string;
  siteid?: string;
  issuetype?: string;
  barcode?: string;
  taskid?: string;
};

export type { AddActualMaterialPayload };

export type AddActualMaterialRouteParams = {
  woHref?: string;
  wonum?: string | number;
  siteid?: string;
};

export type AddPlannedMaterialRouteParams = {
  wonum?: string | number;
  workorderid?: string | number;
  siteid?: string;
  status?: string;
  ishistory?: boolean;
};