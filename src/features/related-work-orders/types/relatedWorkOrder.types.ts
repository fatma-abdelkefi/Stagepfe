export type RelatedWorkOrderRelation = 'FOLLOWUP' | 'RELATED';

export type RelatedWorkOrderAIAssetStrategy =
  | 'same_asset'
  | 'related_asset'
  | 'unknown_asset';

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
  score?: number;
};

export type RelatedWorkOrderAssetSelectionSource =
  | 'related_assets_system_number'
  | 'related_assets_equipment'
  | 'global_asset_match'
  | 'candidate_equipment'
  | 'context_fallback'
  | string;

export type AddRelatedWorkOrderRouteParams = {
  wonum: string;
  siteid?: string;
  description?: string | null;
  assetnum?: string | null;
  asset_description?: string | null;
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
  asset_selection_source?: RelatedWorkOrderAssetSelectionSource;
  asset_strategy?: RelatedWorkOrderAIAssetStrategy;
  asset_reason?: string | null;

  symptoms?: string[];
  equipment?: string[];
  severity?: string;

  candidates?: RelatedWorkOrderAssetCandidate[];

  cleaned_text?: string;
  total_assets?: number;

  nlp_result?: any;
};