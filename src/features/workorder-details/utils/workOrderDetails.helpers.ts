export const CATEGORY_SECTIONS = [
  {
    title: 'Planification',
    items: [
      { key: 'Activités', icon: 'list', gradient: ['#124aa5', '#0b4bd4'] },
      { key: "Main d'œuvre planifiée", icon: 'users', gradient: ['#93c5fd', '#3b82f6'] },
      { key: 'Matériel planifié', icon: 'package', gradient: ['#93c5fd', '#3b82f6'] },
    ],
  },
  {
    title: 'Attachements',
    items: [{ key: 'Documents', icon: 'file-text', gradient: ['#124aa5', '#0b4bd4'] }],
  },
  {
    title: 'Réelle',
    items: [
      { key: "Main d'œuvre réelle", icon: 'user-check', gradient: ['#005ed1', '#0ea5e9'] },
      { key: 'Matériel réel', icon: 'clipboard', gradient: ['#005ed1', '#0ea5e9'] },
      { key: 'Work log', icon: 'clock', gradient: ['#124aa5', '#93c5fd'] },
    ],
  },
  {
    title: 'Signalement de défaillances',
    items: [
      { key: "Détails de l'échec", icon: 'alert-triangle', gradient: ['#242b97', '#409ff7'] },
    ],
  },
  {
    title: 'Relations',
    items: [
      { key: 'Ordres de travail liés', icon: 'link', gradient: ['#124aa5', '#0b4bd4'] },
    ],
  },
  
] as const;

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function safeTrim(v: any): string {
  return typeof v === 'string' ? v.trim() : String(v ?? '').trim();
}

export function upper(s?: string) {
  return safeTrim(s).toUpperCase();
}

export function isFinalStatus(status?: string) {
  const s = upper(status);
  return s === 'COMP' || s === 'CLOSE' || s === 'CAN' || s === 'CANC';
}
export function normalizeStatus(status?: string): string {
  return String(status ?? '').trim().toUpperCase();
}

export function canAddPlannedMaterial(status?: string, ishistory?: boolean): boolean {
  const s = normalizeStatus(status);
  if (ishistory) return false;

  return s === 'WAPPR';
}

export function canAddActualMaterial(status?: string, ishistory?: boolean): boolean {
  const s = normalizeStatus(status);
  if (ishistory) return false;

  return s === 'WAPPR' || s === 'INPRG';
}

export function getBlockedAddMessage(
  kind: 'plannedMaterial' | 'actualMaterial',
  status?: string,
  ishistory?: boolean,
): string {
  if (ishistory) {
    return "Impossible de modifier cet OT car il est historisé.";
  }

  const s = normalizeStatus(status) || 'INCONNU';

  if (kind === 'plannedMaterial') {
    return `Ajout de matériel planifié interdit pour le statut OT (${s}).`;
  }

  return `Ajout de matériel réel interdit pour le statut OT (${s}).`;
}