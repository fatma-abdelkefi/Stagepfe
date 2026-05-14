export type WorkOrderActivity = {
  href?: string;
  taskid: string;
  description: string;
  status: string;
  statut?: string;
  labhrs: number;
};



export type WorkOrderPlannedLabor = {
  taskid?: string;
  laborcode: string;
  description: string;
  labhrs: number;
  quantity?: number;
};

export type WorkOrderPlannedMaterial = {
  taskid?: string;
  itemnum: string;
  description: string;
  quantity: number;
  location: string;
  barcode?: string;
};

export type WorkOrderDocLink = {
  href: string;
  document: string;
  description: string;
  createdate?: string;
  urlname?: string;
};

export type WorkOrderActualLabor = {
  laborcode: string;
  regularhrs: number;
  transdate?: string;
};

export type WorkOrderActualMaterial = {
  matusetransid?: string;
  itemnum: string;
  itemqty: number;
  description: string;
  storeroom?: string;
  storeloc?: string;
  issuetype?: 'ISSUE' | 'RETURN' | string;
  siteid?: string;
  barcode?: string;
};
export type AddActualMaterialPayload = {
  itemnum: string;
  itemqty: number;
  storeroom: string;
  issuetype: 'ISSUE' | 'RETURN';
  siteid: string;
  barcode?: string;
};

export type WorkOrderDetailsSummary = {
  wonum: string;
  href?: string;
  assetnum?: string;
  description: string;
  status: string;
  siteid?: string;
  workorderid?: number;
  ishistory?: boolean;

  asset: string;
  assetDescription: string;

  location?: string;
  locationDescription: string;

  scheduledStart: string | null;
  scheduledFinish: string | null;

  isUrgent: boolean;
  completed: boolean;

  activities: WorkOrderActivity[];
  labor: WorkOrderPlannedLabor[];
  materials: WorkOrderPlannedMaterial[];
  docLinks: WorkOrderDocLink[];
  actualLabor: WorkOrderActualLabor[];
  actualMaterials: WorkOrderActualMaterial[];
  workLogs?: any[];
  worklog_collectionref?: string;
  hasfollowupwork?: boolean;
};

export type WorkOrderSectionCounts = {
  plannedMaterials: number;
  actualMaterials: number;
  plannedLabor: number;
  actualLabor: number;
  activities: number;
  doclinks: number;
  worklogs: number;
  hasfollowupwork?: boolean;
};