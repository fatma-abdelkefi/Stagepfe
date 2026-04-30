export type RelatedWorkOrderRelation = 'FOLLOWUP' | 'RELATED';

export type AddRelatedWorkOrderRouteParams = {
  wonum: string;
  siteid?: string;
  description?: string | null;
  assetnum?: string | null;
  location?: string | null;
  woHref?: string;
  mxwoDetailsHref?: string;
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