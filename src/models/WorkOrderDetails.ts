// src/models/WorkOrderDetails.ts (or wherever you declared it)
export interface WorkOrderDetails {
  wonum: string;
  description: string;
  status: string;

  // ✅ Use Maximo naming
  siteid?: string;        // instead of site
  workorderid?: number;   // needed for OSLC patch
  ishistory?: boolean;    // history lock

  asset: string;
  location: string;
  priority: number;

  isUrgent: boolean;
  completed: boolean;

  scheduledStart?: string;
  actualStart?: string;
  actualFinish?: string;

  activities?: Array<{ taskid?: string; description?: string; status?: string }>;

  labor?: Array<{ taskid?: string; labhrs?: number; laborcode?: string; description?: string }>;

  materials?: Array<{ taskid?: string; itemnum?: string; description?: string; quantity?: number }>;

  // ✅ unify documents naming with your screen (docLinks)
  docLinks?: Array<{ document?: string; description?: string; createdate?: string; urlname?: string }>;
}