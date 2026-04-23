/**
 * D-10 Therapeutics — Demo Escalation Configuration
 *
 * Single source of truth for all alert threshold logic.
 * Change values here to adjust demo behavior during presentations.
 *
 * IMPORTANT: These are DEMO THRESHOLDS only.
 * Production alert thresholds require clinical validation and regulatory review.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type AlertSeverity = 'info' | 'warning' | 'high' | 'extreme';
export type AlertTarget = 'patient' | 'caregiver' | 'hematologist';

/** Extended risk level used in demo patient data. Hardware only maps to low/moderate/high. */
export type DemoRiskLevel = 'low' | 'moderate' | 'high' | 'extreme';

// ── Pain Thresholds (0–10 patient self-report scale) ────────────────────────

export const PAIN_THRESHOLDS = {
  /** Patient receives a supportive in-app warning */
  patientWarning: 4,
  /** Caregiver is alerted (pain is getting serious) */
  caregiverAlert: 6,
  /** Hematologist escalation (severe pain crisis indicators) */
  hematologistAlert: 8,
} as const;

// ── VOC Risk Thresholds ──────────────────────────────────────────────────────

export const VOC_RISK_THRESHOLDS = {
  patientWarning: 'moderate' as DemoRiskLevel,
  caregiverAlert: 'moderate' as DemoRiskLevel,
  hematologistAlert: 'high' as DemoRiskLevel,
} as const;

// ── Hb Trend Thresholds (hbTrendIndex, hardware 0–99.99 scale) ──────────────
// Lower = worse. These are RELATIVE INDEX values, not absolute hemoglobin g/dL.

export const HB_TREND_THRESHOLDS = {
  patientWarning: 75,
  caregiverAlert: 72,
  hematologistAlert: 68,
  /** A drop of this many points in a single reading triggers escalation */
  criticalDropMagnitude: 5,
} as const;

// ── Medication Adherence ─────────────────────────────────────────────────────

export const MED_ADHERENCE_THRESHOLDS = {
  /** ≥1 missed dose triggers caregiver info alert */
  missedDosesCaregiverInfo: 1,
  /** ≥2 missed doses triggers caregiver warning */
  missedDosesCaregiverWarning: 2,
} as const;

// ── Display Config ───────────────────────────────────────────────────────────

export const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  info: 'Info',
  warning: 'Caution',
  high: 'High Alert',
  extreme: 'Critical',
};

export const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  info: '#00488d',
  warning: '#a04401',
  high: '#ba1a1a',
  extreme: '#6b0000',
};

export const SEVERITY_BG_COLORS: Record<AlertSeverity, string> = {
  info: '#e3f0ff',
  warning: '#fff3e0',
  high: '#ffdad6',
  extreme: '#ffb4ab',
};

export const SEVERITY_BORDER_COLORS: Record<AlertSeverity, string> = {
  info: '#b3d4ff',
  warning: '#ffcc80',
  high: '#ef9a9a',
  extreme: '#ff8a80',
};

export const RISK_LEVEL_COLORS: Record<DemoRiskLevel, string> = {
  low: '#2e7d32',
  moderate: '#a04401',
  high: '#ba1a1a',
  extreme: '#6b0000',
};

export const RISK_LEVEL_BG_COLORS: Record<DemoRiskLevel, string> = {
  low: '#c8e6c9',
  moderate: '#fff3e0',
  high: '#ffdad6',
  extreme: '#ffb4ab',
};

// ── Escalation Logic ─────────────────────────────────────────────────────────

const RISK_ORDER: DemoRiskLevel[] = ['low', 'moderate', 'high', 'extreme'];

function riskIndex(level: DemoRiskLevel): number {
  return RISK_ORDER.indexOf(level);
}

export function painTriggersAlert(painLevel: number, target: AlertTarget): boolean {
  if (target === 'patient') return painLevel >= PAIN_THRESHOLDS.patientWarning;
  if (target === 'caregiver') return painLevel >= PAIN_THRESHOLDS.caregiverAlert;
  if (target === 'hematologist') return painLevel >= PAIN_THRESHOLDS.hematologistAlert;
  return false;
}

export function vocRiskTriggersAlert(level: DemoRiskLevel, target: AlertTarget): boolean {
  const idx = riskIndex(level);
  if (target === 'patient') return idx >= riskIndex(VOC_RISK_THRESHOLDS.patientWarning);
  if (target === 'caregiver') return idx >= riskIndex(VOC_RISK_THRESHOLDS.caregiverAlert);
  if (target === 'hematologist') return idx >= riskIndex(VOC_RISK_THRESHOLDS.hematologistAlert);
  return false;
}

/**
 * hbTrendIndex is on the 0–99.99 hardware scale (not absolute g/dL).
 * Lower values indicate worse trend.
 */
export function hbTrendTriggersAlert(hbTrendIndex: number, target: AlertTarget): boolean {
  if (target === 'patient') return hbTrendIndex <= HB_TREND_THRESHOLDS.patientWarning;
  if (target === 'caregiver') return hbTrendIndex <= HB_TREND_THRESHOLDS.caregiverAlert;
  if (target === 'hematologist') return hbTrendIndex <= HB_TREND_THRESHOLDS.hematologistAlert;
  return false;
}

/**
 * Compute the overall alert severity for a patient based on their current state.
 * Used to sort and filter the patient list and route notifications.
 */
export function computeAlertSeverity(
  painLevel: number,
  vocRisk: DemoRiskLevel,
  hbTrendIndex: number
): AlertSeverity {
  const ri = riskIndex(vocRisk);
  if (vocRisk === 'extreme' || painLevel >= 9 || hbTrendIndex <= HB_TREND_THRESHOLDS.hematologistAlert) {
    return 'extreme';
  }
  if (ri >= riskIndex('high') || painLevel >= PAIN_THRESHOLDS.hematologistAlert || hbTrendIndex <= HB_TREND_THRESHOLDS.caregiverAlert) {
    return 'high';
  }
  if (ri >= riskIndex('moderate') || painLevel >= PAIN_THRESHOLDS.caregiverAlert || hbTrendIndex <= HB_TREND_THRESHOLDS.patientWarning) {
    return 'warning';
  }
  return 'info';
}
