export type RelatedWorkOrderRelation = 'FOLLOWUP' | 'RELATED';

export type RelatedWorkOrderAIAssetStrategy =
  | 'same_asset'
  | 'related_asset'
  | 'unknown_asset'
  | string;

export type RelatedWorkOrderFailureContext = {
  problem?: string | null;
  cause?: string | null;
  remedy?: string | null;
};

export type RelatedWorkOrderAssetCandidate = {
  assetnum?: string;
  description?: string;
  location?: string;
  siteid?: string;
  parent?: string;
  assettype?: string;
  source?: string;
  score?: number;
};

export type RelatedWorkOrderMLPrediction = {
  value?: string | boolean | null;
  confidence?: number;
  top_predictions?: Array<{
    value?: string | boolean | null;
    confidence?: number;
  }>;
};

export type RelatedWorkOrderMLResult = {
  model_available?: boolean;
  needed?: boolean;
  confidence?: number;
  assetnum?: string;
  needed_prediction?: RelatedWorkOrderMLPrediction | null;
  asset_prediction?: RelatedWorkOrderMLPrediction | null;
};

export type AddRelatedWorkOrderRouteParams = {
  wonum: string;
  siteid?: string;
  description?: string | null;
  assetnum?: string | null;
  asset_description?: string | null;
  assetDescription?: string | null;
  location?: string | null;
  worktype?: string | null;
  priority?: number | string | null;
  failure?: RelatedWorkOrderFailureContext | null;
  woHref?: string;
  mxwoDetailsHref?: string;
  related_assets?: RelatedWorkOrderAssetCandidate[];
  relatedAssets?: RelatedWorkOrderAssetCandidate[];
  assets?: RelatedWorkOrderAssetCandidate[];
};

export type AddRelatedWorkOrderPayload = {
  originWonum: string;
  siteid: string;
  description: string;
  details?: string;
  assetnum?: string;
  location?: string;
  relation: RelatedWorkOrderRelation;
};

export type AddRelatedWorkOrderResult = {
  wonum: string;
  href?: string;
};

export type RelatedWorkOrderAIResult = {
  needed?: boolean;
  reason?: string | null;

  description?: string;
  details?: string;

  suggested_description?: string | null;
  suggested_details?: string | null;

  assetnum?: string;
  suggested_assetnum?: string | null;

  asset_description?: string;
  suggested_asset_description?: string | null;
  asset_label?: string;

  location?: string;
  suggested_location?: string | null;

  confidence?: number;
  asset_match_reliable?: boolean;
  asset_selection_source?: string;
  asset_strategy?: RelatedWorkOrderAIAssetStrategy;
  asset_reason?: string | null;

  symptoms?: string[];
  equipment?: string[];
  severity?: string;

  candidates?: RelatedWorkOrderAssetCandidate[];

  cleaned_text?: string;
  total_assets?: number;

  ml_result?: RelatedWorkOrderMLResult | null;

  nlp_result?: any;
};