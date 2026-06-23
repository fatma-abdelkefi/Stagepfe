export type FailureCodeType =
  | 'FAILURE_CLASS'
  | 'PROBLEM'
  | 'CAUSE'
  | 'REMEDY';

export type FailureCodeRow = {
  id?: string;
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
  problemCode?: string;
  problemDescription?: string;

  cause?: string;
  causeCode?: string;
  causeDescription?: string;

  remedy?: string;
  remedyCode?: string;
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

  problem?: string;
  problemCode?: string;
  problemDescription?: string;

  cause?: string;
  causeCode?: string;
  causeDescription?: string;

  remedy?: string;
  remedyCode?: string;
  remedyDescription?: string;

  codes: FailureCodeRow[];

  confidence?: number;
  lowConfidence?: boolean;
  validationRequired: boolean;
  recommendationMessage?: string;
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
  failure_class?: string | null;
  failure_class_description?: string | null;

  problem?: string | null;
  problem_code?: string | null;
  problem_description?: string | null;

  cause?: string | null;
  cause_code?: string | null;
  cause_description?: string | null;

  remedy?: string | null;
  remedy_code?: string | null;
  remedy_description?: string | null;

  assetnum?: string | null;
  remarkdesc?: string | null;
  remarks?: string | null;

  confidence?: number;
  low_confidence?: boolean;
  validation_required?: boolean;
  recommendation_message?: string;

  top_predictions?: Array<{
    value?: string | null;
    confidence?: number;
  }>;

  models?: Record<string, any>;
};

export type LlmFailureSimilarExample = {
  text?: string;
  failure_class?: string;
  problem?: string;
  cause?: string;
  remedy?: string;
  source?: string;
  example_hash?: string;
};

export type LlmFailureUiData = {
  failure_class?: string | null;
  failure_class_description?: string | null;

  problem?: string | null;
  problem_code?: string | null;
  problem_description?: string | null;

  cause?: string | null;
  cause_code?: string | null;
  cause_description?: string | null;

  remedy?: string | null;
  remedy_code?: string | null;
  remedy_description?: string | null;

  confidence?: number | null;
  validation_required?: boolean | null;

  source?: string;
  tool?: string;
  model?: string;

  input_used?: string;

  mongodb_used?: boolean;
  mongodb_similar_examples_count?: number;
  mongodb_similar_examples?: LlmFailureSimilarExample[];
};

export type LlmAssistantResponse = {
  success: boolean;
  intent: string;
  user_request?: string;
  context?: Record<string, any>;
  llm_raw_plan?: Record<string, any>;
  llm_plan?: Record<string, any>;
  tool_results?: Array<Record<string, any>>;
  ui_data?: {
    failure?: LlmFailureUiData | null;
    materials?: any[];
    labor?: any[];
    estimated_hours?: any;
    priority?: any;
    safety?: any;
    activities?: any[];
    document_summary?: any;
    related_workorder?: any;
    worklog?: any;
    errors?: any[];
  };
  final_answer?: string;
};

export type AddFailureReportingExampleRequest = {
  text: string;
  failure_class: string;
  problem: string;
  cause: string;
  remedy: string;

  wonum?: string;
  siteid?: string;
  description?: string;
  details?: string;
  assetnum?: string;
  asset_description?: string;
  location?: string;
  source?: string;
  metadata?: Record<string, any>;
};

export type AddFailureReportingExampleResponse = {
  success: boolean;
  inserted: boolean;
  duplicate: boolean;
  message?: string;
  example_hash?: string;
  id?: string;
  error?: string;
};