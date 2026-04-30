export type WorkOrder = {
  wonum: string;
  barcode: string;
  description: string;
  details: string;

  location: string;
  locationDescription: string;

  asset: string;
  assetDescription: string;

  status: string;

  scheduledStart: string | null;
  scheduledFinish: string | null;

  priority: number;
  isDynamic: boolean;
  dynamicJobPlanApplied: boolean;

  site: string;
  siteid?: string;
  workorderid?: number;
  ishistory?: boolean;

  completed: boolean;
  isUrgent: boolean;
  cout: number;

  workType?: string;
  glAccount?: string;
  actualStart?: string;
  actualFinish?: string;
  parentWo?: string;
  failureClass?: string;
  problemCode?: string;

  targetStart?: string | null;
targstartdate?: string | null;
};