export type PlannedActivity = {
  taskid?: string;
  description?: string;
  status?: string;
  labhrs?: number;
  source?: string;
};

export type PlannedMaterial = {
  itemnum?: string;
  description?: string;
  quantity?: number;
  location?: string;
  barcode?: string;
  source?: string;
};

export type PlannedLabor = {
  laborcode?: string;
  laborhrs?: number;
  quantity?: number;
  wplaborid?: number | string;
  source?: string;
};

export type AddWorkOrderSuggestion = {
  description?: string;
  long_description?: string;

  assetnum?: string;
  asset_description?: string;
  location?: string;
  siteid?: string;

  status?: string;
  priority?: number;
  worktype?: string;
  reportedby?: string;

  scheduled_start?: string | null;
  scheduled_finish?: string | null;
  target_start?: string | null;
  target_finish?: string | null;

  activities?: PlannedActivity[];
  planned_materials?: PlannedMaterial[];
  planned_labor?: PlannedLabor[];

  source?: string;
  ml_prediction_used?: boolean;
  needs_review?: boolean;
  auto_save?: boolean;
};
export type AddWorkOrderAIRequest = {
  text: string;
  context?: {
    reportedby?: string;
    siteid?: string;
    assetnum?: string;
    location?: string;
    scheduled_start?: string | null;
    scheduled_finish?: string | null;
    target_start?: string | null;
    target_finish?: string | null;
    source?: 'text' | 'voice';
    [key: string]: unknown;
  };
};

export type AddWorkOrderAIResponse = {
  success: boolean;
  intent?: string;
  user_request?: string;
  ui_data?: {
    workorder?: AddWorkOrderSuggestion;
  };
  final_answer?: string;
  tool_results?: unknown[];
};