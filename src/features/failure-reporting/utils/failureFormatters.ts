import type {
  AiFailurePredictionResponse,
  FailureCodeRow,
  FailureCodeType,
  PredictedFailureDetails,
} from '../types/failureReporting.types';

export function safeTrim(value: unknown): string {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

export function toArray<T = any>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value.filter(Boolean) as T[];
  }

  if (value && typeof value === 'object') {
    return [value as T];
  }

  return [];
}
export function hasUsefulFailureData(data: any): boolean {
  if (!data) return false;

  return !!(
    safeTrim(data.failureClass) ||
    safeTrim(data.failure_class) ||
    safeTrim(data.problem) ||
    safeTrim(data.cause) ||
    safeTrim(data.remedy) ||
    safeTrim(data.remark) ||
    safeTrim(data.remarkdesc)
  );
}

export function getFailureReportCreationDate(): string {
  return new Date().toISOString();
}

function makeCodeRow(
  type: FailureCodeType,
  code?: string | null,
  description?: string | null,
): FailureCodeRow | null {
  const cleanCode = safeTrim(code);
  if (!cleanCode) return null;

  return {
    type,
    code: cleanCode,
    description: safeTrim(description),
  };
}

export function buildPredictedFailureDetails(
  data: AiFailurePredictionResponse,
  creationDate: string,
): PredictedFailureDetails {
  const codes: FailureCodeRow[] = [
    makeCodeRow('PROBLEM', data.problem, data.problem_description),
    makeCodeRow('CAUSE', data.cause, data.cause_description),
    makeCodeRow('REMEDY', data.remedy, data.remedy_description),
  ].filter((item): item is FailureCodeRow => item !== null);

  return {
    failureClass: safeTrim(data.failure_class),
    failureClassDescription: safeTrim(data.failure_class_description),
    remarks: safeTrim(data.remarkdesc),
    failureDate: creationDate,
    remarkDate: creationDate,
    codes,

    confidence: Number(data.confidence ?? 0),
    lowConfidence: !!data.low_confidence,
    validationRequired: true,
    recommendationMessage:
      safeTrim(data.recommendation_message) ||
      'Veuillez vérifier et valider la proposition IA avant enregistrement.',
  };
}