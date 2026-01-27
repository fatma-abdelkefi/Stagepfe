export type WorkOrder = {
  wonum: string;
  description: string;
  location: string;
  asset: string;
  site?: string;
  status: string;
  actualStart?: string;
  actualFinish?: string;
};
