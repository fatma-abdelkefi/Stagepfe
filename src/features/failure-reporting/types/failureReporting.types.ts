export type FailureCodeType = 'PROBLEM' | 'CAUSE' | 'REMEDY';

export type FailureCodeRow = {
  type: FailureCodeType;
  code: string;
  description: string;
};

export type WorkOrderFailureReport = {
  failureClass?: string;
  failureClassDescription?: string;
  failureDate?: string;
  remarkDate?: string;
  remark?: string;
  problem?: string;
  problemDescription?: string;
  cause?: string;
  causeDescription?: string;
  remedy?: string;
  remedyDescription?: string;
  codes: FailureCodeRow[];
};

export type SavedFailureReport = WorkOrderFailureReport & {
  wonum: string;
  siteid: string;
};

export type PredictedFailureDetails = {
  failureClass: string;
  failureClassDescription: string;
  remarks: string;
  failureDate: string;
  remarkDate: string;
  codes: FailureCodeRow[];
};

export type AiFailurePredictionRequest = {
  description: string;
  long_description: string;
  worklog: string[];
  activities: string[];
  actual_materials: string[];
  actual_labor: string[];
  assetnum: string;
  location: string;
  lang: 'fr' | 'en';
  debug?: boolean;
};

export type AiFailurePredictionResponse = {
  language?: string;
  failure_class?: string | null;
  failure_class_description?: string | null;
  model_predicted_class?: string | null;
  class_selection_method?: string | null;
  problem?: string | null;
  problem_description?: string | null;
  cause?: string | null;
  cause_description?: string | null;
  remedy?: string | null;
  remedy_description?: string | null;
  remarkdesc?: string | null;
  confidence?: number;
  low_confidence?: boolean;
  top3_predictions?: Array<{
    failure_class?: string | null;
    failure_class_description?: string | null;
    confidence?: number;
  }>;
};