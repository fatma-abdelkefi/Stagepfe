export interface WorkOrderDetails {
  wonum: string;
  description: string;
  status: string;
  site: string;
  asset: string;
  location: string;
  priority: number;
  isUrgent: boolean;
  completed: boolean;
  scheduledStart?: string;
  actualStart?: string;
  actualFinish?: string;

  // Activités, MO, Matériel, Docs
  activities?: Array<{ taskid?: string; description?: string; status?: string }>;
  labor?: Array<{ taskid?: string; labhrs?: number }>;
  materials?: Array<{ taskid?: string; itemnum?: string; description?: string; quantity?: number }>;
  DOCLINKS?: Array<{ document?: string; description?: string; createdate?: string; urlname?: string }>;
}
