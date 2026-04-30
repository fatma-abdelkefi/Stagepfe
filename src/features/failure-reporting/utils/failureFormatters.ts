import type {
  AiFailurePredictionResponse,
  FailureCodeRow,
  FailureCodeType,
  PredictedFailureDetails,
  WorkOrderFailureReport,
} from '../types/failureReporting.types';

export function safeTrim(value: any): string {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

export function toArray<T = any>(value: any): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.member)) return value.member;
  return [value];
}

export function hasUsefulFailureData(
  report: WorkOrderFailureReport | null | undefined,
): boolean {
  if (!report) return false;

  return !!(
    safeTrim(report.failureClass) ||
    safeTrim(report.problem) ||
    safeTrim(report.cause) ||
    safeTrim(report.remedy) ||
    safeTrim(report.remark) ||
    (Array.isArray(report.codes) && report.codes.length > 0)
  );
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export function formatDateTime(date: Date): string {
  return (
    pad2(date.getDate()) +
    '/' +
    pad2(date.getMonth() + 1) +
    '/' +
    date.getFullYear() +
    ' ' +
    pad2(date.getHours()) +
    ':' +
    pad2(date.getMinutes())
  );
}

export function getFailureReportCreationDate(): string {
  return formatDateTime(new Date());
}

export function getFailureTypeLabel(type: FailureCodeType): string {
  if (type === 'PROBLEM') return 'PROBLÈME';
  if (type === 'CAUSE') return 'CAUSE';
  return 'REMISE';
}

export function translateFailureClass(code?: string | null, desc?: string | null): string {
  const c = safeTrim(code).toUpperCase();

  const map: Record<string, string> = {
    BLDGS: 'Maintenance des bâtiments et CVC',
    BUILDING: 'Maintenance des bâtiments',
    BURNERS: 'Défaillances des brûleurs',
    BOILERS: 'Défaillances des chaudières',
    PUMPS: 'Défaillances des pompes',
    PKG: 'Défaillances de ligne de conditionnement',
    PACKAGING: 'Défaillances de ligne de conditionnement',
    CONVEYORS: 'Défaillances des convoyeurs',
    HVAC: 'Chauffage, ventilation et climatisation',
  };

  return map[c] || safeTrim(desc) || c || '-';
}

export function translateProblem(code?: string | null, desc?: string | null): string {
  const c = safeTrim(code).toUpperCase();

  const map: Record<string, string> = {
    LIGHTING: 'Problème d’éclairage',
    TOOCOLD: 'Trop froid',
    TOOHOT: 'Trop chaud',
    LOWPRES: 'Basse pression',
    LOWVOL: 'Faible débit',
    FLAME: 'Défaut de flamme',
    FEED: 'Problème d’alimentation',
    STOPPED: 'Équipement arrêté',
    LEAK: 'Fuite',
  };

  return map[c] || safeTrim(desc) || c || '-';
}

export function translateCause(code?: string | null, desc?: string | null): string {
  const c = safeTrim(code).toUpperCase();

  const map: Record<string, string> = {
    BREAKTRP: 'Disjoncteur déclenché',
    SENSOR: 'Capteur défectueux',
    JAMPIPE: 'Tuyau bloqué',
    PILOT: 'Défaillance du pilote',
    THERM: 'Thermostat défectueux',
    FAN: 'Ventilateur défectueux',
    BELT: 'Courroie usée ou cassée',
    SHAFT: 'Arbre défectueux',
    SEAL: 'Joint défectueux',
  };

  return map[c] || safeTrim(desc) || c || '-';
}

export function translateRemedy(code?: string | null, desc?: string | null): string {
  const c = safeTrim(code).toUpperCase();

  const map: Record<string, string> = {
    RESET: 'Réarmer le disjoncteur',
    ADJSENSR: 'Ajuster le capteur',
    CLRPIPE: 'Déboucher le tuyau',
    REPLACE: 'Remplacer le composant',
    CLEAN: 'Nettoyer',
    RESETBRK: 'Réarmer le disjoncteur',
  };

  return map[c] || safeTrim(desc) || c || '-';
}

export function translateRemark(text?: string | null): string {
  const t = safeTrim(text);
  if (!t) return '-';

  return t
    .replace(/Observed issue:/gi, 'Problème observé :')
    .replace(/Probable cause:/gi, 'Cause probable :')
    .replace(/Action taken \/ recommended:/gi, 'Action réalisée / recommandée :')
    .replace(/Risk:/gi, 'Risque :')
    .replace(/Recommendation:/gi, 'Recommandation :');
}

export function buildPredictedFailureDetails(
  ai: AiFailurePredictionResponse,
  creationDate: string,
): PredictedFailureDetails {
  const codes: FailureCodeRow[] = [];

  if (ai.problem) {
    codes.push({
      type: 'PROBLEM',
      code: safeTrim(ai.problem),
      description: translateProblem(ai.problem, ai.problem_description),
    });
  }

  if (ai.cause) {
    codes.push({
      type: 'CAUSE',
      code: safeTrim(ai.cause),
      description: translateCause(ai.cause, ai.cause_description),
    });
  }

  if (ai.remedy) {
    codes.push({
      type: 'REMEDY',
      code: safeTrim(ai.remedy),
      description: translateRemedy(ai.remedy, ai.remedy_description),
    });
  }

  return {
    failureClass: safeTrim(ai.failure_class),
    failureClassDescription: translateFailureClass(
      ai.failure_class,
      ai.failure_class_description,
    ),
    remarks: translateRemark(ai.remarkdesc),
    failureDate: creationDate,
    remarkDate: creationDate,
    codes,
  };
}