// src/services/maximoTypes.ts

export interface MaximoResponse<T> {
  member?: T[];
}
export type ActualLaborItem = {
  laborcode: string;
  regularhrs: number;
};
export interface MaximoActivity {
  taskid?: string;
  description?: string;
  status?: string;
}

export interface MaximoLabor {
  taskid?: string;
  labhrs?: number;
}

export interface MaximoMaterial {
  taskid?: string;
  itemnum?: string;
  description?: string;
  quantity?: number;
}

export interface MaximoDocLink {
  document?: string;
  description?: string;
  createdate?: string;
}

export interface MaximoWorkOrderItem {
  wonum?: string;
  description?: string;
  location?: string | { location?: string };
  locationdescription?: string;
  assetnum?: string;
  status?: string;
  priority?: string | number;
  siteid?: string;
  scheduledstart?: string;
  scheduledfinish?: string;
  targetstart?: string;
  targstartdate?: string;

  WOACTIVITY?: MaximoActivity[];
  WPLABOR?: MaximoLabor[];
  WPMATERIAL?: MaximoMaterial[];

  

  DOCLINKS?: {
    member?: MaximoDocLink[];
  };
}