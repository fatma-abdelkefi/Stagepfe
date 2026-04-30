export type LaborInput = {
  laborcode: string;
  laborhrs: number;
  quantity?: number;
};

export type PlannedLaborItem = {
  id: string;
  laborcode: string;
  description: string;
  laborhrs: number;
  quantity?: number;
  taskid?: string;
};

export type ActualLaborItem = {
  laborcode: string;
  regularhrs: number;
  transdate?: string;
};

export type AddPlannedLaborRouteParams = {
  wonum?: string | number;
  workorderid?: string | number;
  siteid?: string;
  status?: string;
  ishistory?: boolean;
};

export type AddActualLaborRouteParams = {
  wonum?: string | number;
  siteid?: string;
  woHref?: string;
};

export type AddActualLaborPayload = {
  laborcode: string;
  regularhrs: number;
};