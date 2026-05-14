import {
  analyzeRelatedWorkOrderNLP,
  type NlpRelatedWorkOrderResult,
} from './nlpApi';

import type {
  RelatedWorkOrderAIResult,
  RelatedWorkOrderAssetCandidate,
} from '../types/relatedWorkOrder.types';

function safeTrim(value: unknown): string {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function normalizeCandidates(value: unknown): RelatedWorkOrderAssetCandidate[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(item => ({
    assetnum: safeTrim(item?.assetnum),
    description: safeTrim(item?.description),
    location: safeTrim(item?.location),
    siteid: safeTrim(item?.siteid),
    parent: safeTrim(item?.parent),
    assettype: safeTrim(item?.assettype),
    score:
      typeof item?.score === 'number'
        ? item.score
        : Number(item?.score ?? 0),
  }));
}

function normalizeConfidence(value: unknown): number | undefined {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return undefined;
  }

  return Math.max(0, Math.min(100, numberValue));
}

function mapNlpResultToRelatedWorkOrder(
  nlpResult: NlpRelatedWorkOrderResult,
): RelatedWorkOrderAIResult {
  const nlpAny = nlpResult as any;

  const assetDescription =
    safeTrim(nlpAny.asset_description) ||
    safeTrim(nlpAny.description_asset) ||
    safeTrim(nlpAny.suggested_asset_description);

  const assetnum =
    safeTrim(nlpAny.assetnum) || safeTrim(nlpAny.suggested_assetnum);

  const location =
    safeTrim(nlpAny.location) || safeTrim(nlpAny.suggested_location);

  const assetLabel =
    safeTrim(nlpAny.asset_label) ||
    (assetnum && assetDescription
      ? `${assetnum} - ${assetDescription}`
      : assetnum);

  return {
    needed: Boolean(nlpAny.needed),

    description:
      safeTrim(nlpAny.description) || safeTrim(nlpAny.suggested_description),

    details: safeTrim(nlpAny.details) || safeTrim(nlpAny.suggested_details),

    assetnum,
    asset_description: assetDescription,
    asset_label: assetLabel,

    location,

    confidence: normalizeConfidence(nlpAny.confidence),

    asset_match_reliable: Boolean(nlpAny.asset_match_reliable),
    asset_selection_source: safeTrim(nlpAny.asset_selection_source),

    symptoms: Array.isArray(nlpAny.symptoms) ? nlpAny.symptoms : [],
    equipment: Array.isArray(nlpAny.equipment) ? nlpAny.equipment : [],
    severity: safeTrim(nlpAny.severity),

    candidates: normalizeCandidates(nlpAny.candidates),

    cleaned_text: safeTrim(nlpAny.cleaned_text),
    total_assets:
      typeof nlpAny.total_assets === 'number'
        ? nlpAny.total_assets
        : Number(nlpAny.total_assets ?? 0),

    nlp_result: nlpResult,
  };
}

export async function generateRelatedWorkOrderSmart(params: {
  request: string;
  context: any;
}) {
  console.log('========== RELATED WO NLP CALL ==========');
  console.log('TEXT =', params.request);
  console.log('CONTEXT =', JSON.stringify(params.context, null, 2));

  const nlpResult = await analyzeRelatedWorkOrderNLP({
    text: params.request,
    context: params.context,
  });

  console.log('NLP RESULT =', JSON.stringify(nlpResult, null, 2));

  return {
    related_workorder: mapNlpResultToRelatedWorkOrder(nlpResult),
  };
}

export function getRelatedWorkOrderAIResult(
  data: any,
): RelatedWorkOrderAIResult | null {
  return data?.related_workorder ?? null;
}