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
  if (!Array.isArray(value)) return [];

  return value.map(item => ({
    assetnum: safeTrim(item?.assetnum),
    description: safeTrim(item?.description),
    location: safeTrim(item?.location),
    siteid: safeTrim(item?.siteid),
    parent: safeTrim(item?.parent),
    assettype: safeTrim(item?.assettype),
    source: safeTrim(item?.source),
    score:
      typeof item?.score === 'number'
        ? item.score
        : Number(item?.score ?? 0),
  }));
}

function normalizeConfidence(value: unknown): number | undefined {
  if (typeof value === 'string') {
    if (value === 'high') return 90;
    if (value === 'medium') return 60;
    if (value === 'low') return 30;
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) return undefined;

  if (numberValue <= 1) {
    return Math.round(numberValue * 100);
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
    safeTrim(nlpAny.assetnum) ||
    safeTrim(nlpAny.suggested_assetnum);

  const location =
    safeTrim(nlpAny.location) ||
    safeTrim(nlpAny.suggested_location);

  const candidates = normalizeCandidates(
    nlpAny.candidates || nlpAny.asset_candidates,
  );

  const assetLabel =
    safeTrim(nlpAny.asset_label) ||
    safeTrim(nlpAny.suggested_asset_label) ||
    (assetnum && assetDescription
      ? `${assetnum} - ${assetDescription}`
      : assetnum);

  return {
    needed: Boolean(nlpAny.needed),

    reason: safeTrim(nlpAny.reason),

    description:
      safeTrim(nlpAny.description) ||
      safeTrim(nlpAny.suggested_description),

    details:
      safeTrim(nlpAny.details) ||
      safeTrim(nlpAny.suggested_details),

    assetnum,
    suggested_assetnum: safeTrim(nlpAny.suggested_assetnum),

    asset_description: assetDescription,
    suggested_asset_description: safeTrim(
      nlpAny.suggested_asset_description,
    ),
    asset_label: assetLabel,

    location,
    suggested_location: safeTrim(nlpAny.suggested_location),

    confidence: normalizeConfidence(nlpAny.confidence),

    asset_match_reliable:
      safeTrim(nlpAny.asset_confidence) === 'high' &&
      safeTrim(nlpAny.asset_strategy) !== 'mongodb_assets' &&
      safeTrim(nlpAny.asset_strategy) !== 'mongodb_asset_match',

    asset_selection_source:
      safeTrim(nlpAny.asset_selection_source) ||
      safeTrim(nlpAny.asset_strategy),

    asset_reason: safeTrim(nlpAny.asset_reason),

    symptoms: Array.isArray(nlpAny.symptoms) ? nlpAny.symptoms : [],
    equipment: Array.isArray(nlpAny.equipment) ? nlpAny.equipment : [],
    severity: safeTrim(nlpAny.severity),

    candidates,

    cleaned_text: safeTrim(nlpAny.cleaned_text),
    total_assets:
      typeof nlpAny.total_assets === 'number'
        ? nlpAny.total_assets
        : candidates.length,

    ml_result: nlpAny.ml_result ?? null,

    nlp_result: nlpResult,
  };
}

export async function generateRelatedWorkOrderSmart(params: {
  request: string;
  context: any;
}) {
  console.log('========== RELATED WO LLM MCP CALL ==========');
  console.log('TEXT =', params.request);
  console.log('CONTEXT =', JSON.stringify(params.context, null, 2));

  const nlpResult = await analyzeRelatedWorkOrderNLP({
    text: params.request,
    context: params.context,
  });

  console.log('LLM MCP RELATED RESULT =', JSON.stringify(nlpResult, null, 2));

  return {
    related_workorder: mapNlpResultToRelatedWorkOrder(nlpResult),
  };
}

export function getRelatedWorkOrderAIResult(
  data: any,
): RelatedWorkOrderAIResult | null {
  return data?.related_workorder ?? null;
}