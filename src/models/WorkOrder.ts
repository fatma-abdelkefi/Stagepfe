export type WorkOrder = {
  wonum: string;
  description: string;
  location: string;
  asset: string;

  // ✅ Add these (optional so it won’t break old data)
  workorderid?: number;
  siteid?: string;      // Maximo uses siteid; your old type had site?: string
  ishistory?: boolean;

  status: string;
  actualStart?: string;
  actualFinish?: string;

  wplabor?: WPLaborItem[];
  labor?: LaborItem[];
  wplabor_collectionref?: string;
};

export interface MaximoLaborResponse {
  member?: Array<{
    taskid?: string;
    laborcode?: string;
    description?: string;
    labhrs?: string | number;
  }>;
}

// ─── Typage pour WorkOrder (si pas déjà fait) ────
export type LaborItem = {
  taskid: string;
  laborcode?: string;
  description?: string;
  labhrs?: number;
};
export interface WPLaborItem {
  laborcode: string;
  labhrs: number;
  taskid?: string;
  description?: string;
}