/**
 * D-10 Therapeutics — Multi-Patient Demo Dataset
 *
 * Seeded demonstration data for the caregiver and hematologist dashboards.
 * These are FICTIONAL demo patients with invented-but-realistic values.
 * None of these represent real clinical measurements or real individuals.
 *
 * ── Demo story ───────────────────────────────────────────────────────────────
 * The app supports ONE live patient (Solomon B. / `LIVE_DEMO_PATIENT_ID`) whose
 * *current* SpO₂, heart rate, Hb Trend Index and pain level are supplied in
 * real time by the wearable via `resolveLivePatients()` (see the overlay logic
 * at the bottom of this file).
 *
 * Everything in the seeded data below — including 14-day trend arrays, the
 * 7-day adherence log, the VOC-risk history and the crisis-event list — is
 * HISTORICAL CONTEXT. For the live patient those seeded values end on the
 * previous day (`Apr 22`) so they never conflict with the live "now" value
 * shown in the header, LIVE badge and vital cards.
 *
 * Six demo scenarios:
 *   1. Solomon B. — Live wearable, stable baseline
 *   2. Aisha M.   — Rising self-reported pain, caregiver alert
 *   3. Marcus T.  — Acute VOC crisis, hematologist escalation (critical)
 *   4. Priya K.   — Missed medications, adherence alert
 *   5. James L.   — No active wearable, last-known stable
 *   6. Nia R.     — Rising VOC risk (Hb drop + HR climb), caregiver alert
 */

import { Medication, CrisisEvent } from './mockData';
import {
  AlertSeverity,
  DemoRiskLevel,
  computeAlertSeverity,
} from './escalationConfig';

// ── Types ────────────────────────────────────────────────────────────────────

export interface DemoPatientTrendPoint {
  date: string;
  value: number;
}

export interface DemoVocRisk {
  level: DemoRiskLevel;
  label: string;
  description: string;
}

export interface DemoPatientVitals {
  spo2: number;
  heartRate: number;
  /** Relative Hb trend index on 0–99.99 hardware scale. Not absolute g/dL. */
  hbTrendIndex: number;
  temperatureF: number;
}

export interface DemoPatientTrends {
  hbTrend: DemoPatientTrendPoint[];
  spo2: DemoPatientTrendPoint[];
  heartRate: DemoPatientTrendPoint[];
  pain: DemoPatientTrendPoint[];
}

/** One day of caregiver-visible medication adherence. */
export interface DemoAdherenceHistoryPoint {
  date: string;
  /** 0–100, doses taken ÷ doses scheduled for the day */
  pct: number;
  /** Doses skipped that day (for quick annotations) */
  missed: number;
}

/** VOC risk state captured once per day. */
export interface DemoVocRiskHistoryPoint {
  date: string;
  level: DemoRiskLevel;
}

export interface DemoPatient {
  id: string;
  name: string;
  initials: string;
  age: number;
  condition: string;
  patientIdLabel: string;
  /** Current self-reported pain 0–10 */
  currentPainLevel: number;
  vocRisk: DemoVocRisk;
  vitals: DemoPatientVitals;
  medications: Medication[];
  crisisEvents: CrisisEvent[];
  trends: DemoPatientTrends;
  /** Last 7 days of medication adherence. Oldest → newest. */
  adherenceHistory: DemoAdherenceHistoryPoint[];
  /** Last 7 days of VOC risk state. Oldest → newest. */
  vocRiskHistory: DemoVocRiskHistoryPoint[];
  wearableConnected: boolean;
  lastSynced: string;
  /** Pre-computed severity used for sorting and routing */
  alertSeverity: AlertSeverity;
  /** Short label for demo scenario switcher */
  scenarioLabel: string;
}

// ── Date labels (demo reference: today = Apr 23, history ends Apr 22) ───────

/**
 * 14-day seeded history window. The last point is "yesterday" — so for the
 * LIVE patient the current-day live reading is visibly distinct from seeded
 * history, and for the seeded patients the trend represents the two weeks
 * leading up to (but not including) today.
 */
const HISTORY_14 = [
  'Apr 9', 'Apr 10', 'Apr 11', 'Apr 12', 'Apr 13', 'Apr 14', 'Apr 15',
  'Apr 16', 'Apr 17', 'Apr 18', 'Apr 19', 'Apr 20', 'Apr 21', 'Apr 22',
] as const;

/** 7-day adherence / VOC-history window — the last full week before today. */
const HISTORY_7 = [
  'Apr 16', 'Apr 17', 'Apr 18', 'Apr 19', 'Apr 20', 'Apr 21', 'Apr 22',
] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function buildTrend(values: number[]): DemoPatientTrendPoint[] {
  if (values.length !== HISTORY_14.length) {
    throw new Error(
      `buildTrend expects ${HISTORY_14.length} values, got ${values.length}`
    );
  }
  return HISTORY_14.map((date, i) => ({ date, value: round1(values[i]) }));
}

function buildAdherence(
  pcts: number[],
  missed: number[]
): DemoAdherenceHistoryPoint[] {
  return HISTORY_7.map((date, i) => ({
    date,
    pct: pcts[i] ?? 100,
    missed: missed[i] ?? 0,
  }));
}

function buildRiskHistory(
  levels: DemoRiskLevel[]
): DemoVocRiskHistoryPoint[] {
  return HISTORY_7.map((date, i) => ({
    date,
    level: levels[i] ?? 'low',
  }));
}

// ── Patient 1: Solomon B. — Live Wearable, Stable Baseline ───────────────────
//
// Solomon is the ONE patient whose *current* vitals + pain come from the live
// wearable feed. The values below are his seeded 14-day CONTEXT (ending Apr 22,
// "yesterday"). They are intentionally calm and stable so that when the live
// overlay paints today's real sensor reading on top, any meaningful deviation
// stands out immediately. `vitals` and `currentPainLevel` here are the fallback
// snapshot used only when no live payload is available yet.

const solomonMeds: Medication[] = [
  { id: 's1', name: 'Hydroxyurea', dosage: '500mg', instructions: 'Take with food', timeOfDay: 'morning', status: 'taken', takenAt: '8:14 AM', icon: 'pill' },
  { id: 's2', name: 'Folic Acid', dosage: '1mg', instructions: '', timeOfDay: 'morning', status: 'taken', takenAt: '8:15 AM', icon: 'pill' },
  { id: 's3', name: 'Ibuprofen', dosage: '400mg', instructions: 'As needed for pain', timeOfDay: 'afternoon', status: 'pending', icon: 'medical-bag' },
  { id: 's4', name: 'Hydroxyurea', dosage: '500mg', instructions: 'Take with food', timeOfDay: 'evening', status: 'pending', icon: 'pill' },
];

const solomon: DemoPatient = {
  id: 'D10-SC-001',
  name: 'Solomon B.',
  initials: 'SB',
  age: 28,
  condition: 'Sickle Cell Disease (HbSS)',
  patientIdLabel: 'Patient ID · D10-SC-001',
  currentPainLevel: 2,
  vocRisk: {
    level: 'low',
    label: 'LOW RISK',
    description:
      'All primary indicators are within optimal ranges. Continue hydration protocol.',
  },
  vitals: { spo2: 98, heartRate: 72, hbTrendIndex: 81.2, temperatureF: 98.6 },
  medications: solomonMeds,
  crisisEvents: [
    { id: 'sc1-1', dateRange: 'Oct 12–15, 2025', duration: '72 hours', severity: 'severe', location: 'Hospital Admission', triggers: ['Infection', 'Cold Weather'], notes: 'Admitted to ER. Treated with IV fluids and pain protocols.' },
    { id: 'sc1-2', dateRange: 'Aug 05–06, 2025', duration: '36 hours', severity: 'moderate', location: 'At-Home Care', triggers: ['Dehydration', 'Overexertion'], notes: 'Managed at home. Pain localized to lower back.' },
    { id: 'sc1-3', dateRange: 'Mar 14, 2025', duration: '8 hours', severity: 'mild', location: 'At-Home Care', triggers: ['Stress'], notes: 'Resolved with hydration and rest.' },
  ],
  trends: {
    hbTrend: buildTrend([
      80.1, 80.4, 80.7, 80.5, 80.9, 81.0, 80.8,
      80.6, 80.9, 81.1, 80.8, 81.0, 81.2, 81.0,
    ]),
    spo2: buildTrend([
      97.6, 97.8, 98.0, 97.9, 98.1, 98.0, 97.8,
      97.9, 98.0, 98.1, 98.0, 98.2, 98.0, 97.9,
    ]),
    heartRate: buildTrend([
      72, 70, 74, 73, 71, 72, 74,
      72, 73, 72, 71, 72, 73, 72,
    ]),
    pain: buildTrend([
      1, 2, 2, 1, 1, 2, 2,
      1, 2, 2, 1, 2, 1, 2,
    ]),
  },
  adherenceHistory: buildAdherence(
    [100, 100, 75, 100, 100, 100, 100],
    [0, 0, 1, 0, 0, 0, 0]
  ),
  vocRiskHistory: buildRiskHistory([
    'low', 'low', 'low', 'low', 'low', 'low', 'low',
  ]),
  wearableConnected: true,
  lastSynced: 'Today, 10:42 AM',
  alertSeverity: 'info',
  scenarioLabel: 'Stable · Live Wearable',
};

// ── Patient 2: Aisha M. — Rising Pain, Caregiver Alert ──────────────────────

const aishaMeds: Medication[] = [
  { id: 'a1', name: 'Hydroxyurea', dosage: '500mg', instructions: 'Take with food', timeOfDay: 'morning', status: 'taken', takenAt: '7:50 AM', icon: 'pill' },
  { id: 'a2', name: 'Folic Acid', dosage: '1mg', instructions: '', timeOfDay: 'morning', status: 'taken', takenAt: '7:52 AM', icon: 'pill' },
  { id: 'a3', name: 'Oxycodone', dosage: '5mg', instructions: 'For acute pain, as directed', timeOfDay: 'afternoon', status: 'taken', takenAt: '1:30 PM', icon: 'medical-bag' },
  { id: 'a4', name: 'Hydroxyurea', dosage: '500mg', instructions: 'Take with food', timeOfDay: 'evening', status: 'pending', icon: 'pill' },
];

const aisha: DemoPatient = {
  id: 'D10-SC-002',
  name: 'Aisha M.',
  initials: 'AM',
  age: 34,
  condition: 'Sickle Cell Disease (HbSS)',
  patientIdLabel: 'Patient ID · D10-SC-002',
  currentPainLevel: 7,
  vocRisk: {
    level: 'moderate',
    label: 'MODERATE RISK',
    description:
      'Pain level is elevated and climbing over the last 4 days. Monitor closely and ensure hydration. Caregiver has been notified.',
  },
  vitals: { spo2: 96, heartRate: 88, hbTrendIndex: 74.3, temperatureF: 99.1 },
  medications: aishaMeds,
  crisisEvents: [
    { id: 'sc2-1', dateRange: 'Mar 18–20, 2026', duration: '48 hours', severity: 'moderate', location: 'Urgent Care Visit', triggers: ['Stress', 'Dehydration'], notes: 'Received IV fluids and pain management, discharged same day.' },
    { id: 'sc2-2', dateRange: 'Nov 03, 2025', duration: '18 hours', severity: 'mild', location: 'At-Home Care', triggers: ['Cold Weather'], notes: '' },
    { id: 'sc2-3', dateRange: 'Jul 22, 2025', duration: '30 hours', severity: 'moderate', location: 'At-Home Care', triggers: ['Overexertion'], notes: 'Pain localized to hips. Managed with escalation to oxycodone.' },
  ],
  trends: {
    hbTrend: buildTrend([
      79.9, 80.0, 79.6, 79.2, 78.8, 78.2, 77.6,
      76.9, 76.4, 75.8, 75.2, 74.8, 74.5, 74.3,
    ]),
    spo2: buildTrend([
      97.8, 97.6, 97.5, 97.4, 97.2, 97.0, 96.9,
      96.8, 96.6, 96.4, 96.3, 96.2, 96.1, 96.0,
    ]),
    heartRate: buildTrend([
      76, 77, 78, 78, 79, 80, 81,
      82, 83, 84, 85, 86, 87, 88,
    ]),
    pain: buildTrend([
      2, 2, 3, 3, 3, 4, 4,
      4, 5, 5, 6, 6, 7, 7,
    ]),
  },
  adherenceHistory: buildAdherence(
    [100, 100, 100, 75, 100, 75, 75],
    [0, 0, 0, 1, 0, 1, 1]
  ),
  vocRiskHistory: buildRiskHistory([
    'low', 'low', 'low', 'moderate', 'moderate', 'moderate', 'moderate',
  ]),
  wearableConnected: true,
  lastSynced: 'Today, 2:18 PM',
  alertSeverity: 'warning',
  scenarioLabel: 'Rising Pain — Caregiver Alert',
};

// ── Patient 3: Marcus T. — Acute VOC Crisis, Hematologist Escalation ────────

const marcusMeds: Medication[] = [
  { id: 'm1', name: 'Hydroxyurea', dosage: '1000mg', instructions: 'Take with food', timeOfDay: 'morning', status: 'taken', takenAt: '9:05 AM', icon: 'pill' },
  { id: 'm2', name: 'Folic Acid', dosage: '1mg', instructions: '', timeOfDay: 'morning', status: 'taken', takenAt: '9:06 AM', icon: 'pill' },
  { id: 'm3', name: 'Oxycodone', dosage: '10mg', instructions: 'For acute pain', timeOfDay: 'afternoon', status: 'taken', takenAt: '12:45 PM', icon: 'medical-bag' },
  { id: 'm4', name: 'Morphine', dosage: '4mg IV', instructions: 'Administered by clinician', timeOfDay: 'afternoon', status: 'taken', takenAt: '3:00 PM', icon: 'needle' },
  { id: 'm5', name: 'Hydroxyurea', dosage: '1000mg', instructions: 'Take with food', timeOfDay: 'evening', status: 'pending', icon: 'pill' },
];

const marcus: DemoPatient = {
  id: 'D10-SC-003',
  name: 'Marcus T.',
  initials: 'MT',
  age: 42,
  condition: 'Sickle Cell Disease (HbSS)',
  patientIdLabel: 'Patient ID · D10-SC-003',
  currentPainLevel: 9,
  vocRisk: {
    level: 'high',
    label: 'HIGH RISK',
    description:
      'Multiple indicators suggest an active VOC crisis (Hb trend dropped 7+ points in 10 days, pain escalated to 9/10). Immediate clinical attention recommended. Hematologist notified.',
  },
  vitals: { spo2: 92, heartRate: 118, hbTrendIndex: 66.5, temperatureF: 100.4 },
  medications: marcusMeds,
  crisisEvents: [
    { id: 'sc3-1', dateRange: 'Apr 19–23, 2026', duration: 'Ongoing', severity: 'severe', location: 'Hospital Admission', triggers: ['Infection', 'Dehydration', 'Overexertion'], notes: 'Currently admitted. IV fluids + pain protocol active. Transfusion under evaluation.' },
    { id: 'sc3-2', dateRange: 'Jan 14–17, 2026', duration: '72 hours', severity: 'severe', location: 'Hospital Admission', triggers: ['Cold Weather', 'Stress'], notes: 'Admitted with acute chest syndrome. Transfusion administered.' },
    { id: 'sc3-3', dateRange: 'Sep 28, 2025', duration: '24 hours', severity: 'moderate', location: 'Urgent Care Visit', triggers: ['Dehydration'], notes: '' },
    { id: 'sc3-4', dateRange: 'May 04, 2025', duration: '48 hours', severity: 'moderate', location: 'Hospital Admission', triggers: ['Infection'], notes: 'Treated for pneumonia concurrent with VOC.' },
  ],
  trends: {
    hbTrend: buildTrend([
      75.8, 75.6, 75.4, 74.8, 74.0, 73.0, 72.1,
      71.0, 70.0, 69.2, 68.5, 67.8, 67.2, 66.5,
    ]),
    spo2: buildTrend([
      97.0, 96.8, 96.5, 96.0, 95.4, 94.7, 94.0,
      93.5, 93.2, 93.0, 92.8, 92.5, 92.3, 92.0,
    ]),
    heartRate: buildTrend([
      82, 84, 86, 88, 92, 96, 100,
      104, 108, 110, 112, 114, 116, 118,
    ]),
    pain: buildTrend([
      4, 4, 5, 5, 6, 6, 7,
      7, 8, 8, 8, 9, 9, 9,
    ]),
  },
  adherenceHistory: buildAdherence(
    [75, 75, 50, 50, 100, 100, 100],
    [1, 1, 2, 2, 0, 0, 0]
  ),
  vocRiskHistory: buildRiskHistory([
    'moderate', 'moderate', 'moderate', 'high', 'high', 'high', 'high',
  ]),
  wearableConnected: true,
  lastSynced: 'Today, 3:41 PM',
  alertSeverity: 'high',
  scenarioLabel: 'Critical Escalation — VOC Crisis',
};

// ── Patient 4: Priya K. — Missed Medications, Adherence Alert ───────────────

const priyaMeds: Medication[] = [
  { id: 'p1', name: 'Hydroxyurea', dosage: '500mg', instructions: 'Take with food', timeOfDay: 'morning', status: 'skipped', icon: 'pill' },
  { id: 'p2', name: 'Folic Acid', dosage: '1mg', instructions: '', timeOfDay: 'morning', status: 'skipped', icon: 'pill' },
  { id: 'p3', name: 'Voxelotor', dosage: '1500mg', instructions: 'Daily with or without food', timeOfDay: 'afternoon', status: 'skipped', icon: 'pill' },
  { id: 'p4', name: 'Hydroxyurea', dosage: '500mg', instructions: 'Take with food', timeOfDay: 'evening', status: 'pending', icon: 'pill' },
];

const priya: DemoPatient = {
  id: 'D10-SC-004',
  name: 'Priya K.',
  initials: 'PK',
  age: 22,
  condition: 'Sickle Cell Disease (HbSC)',
  patientIdLabel: 'Patient ID · D10-SC-004',
  currentPainLevel: 5,
  vocRisk: {
    level: 'moderate',
    label: 'MODERATE RISK',
    description:
      'Two consecutive days of 0% adherence. Missed Hydroxyurea + Voxelotor doses may be driving elevated risk indicators. Caregiver follow-up recommended.',
  },
  vitals: { spo2: 95, heartRate: 84, hbTrendIndex: 73.8, temperatureF: 98.9 },
  medications: priyaMeds,
  crisisEvents: [
    { id: 'sc4-1', dateRange: 'Feb 08, 2026', duration: '10 hours', severity: 'mild', location: 'At-Home Care', triggers: ['Stress'], notes: '' },
    { id: 'sc4-2', dateRange: 'Oct 22, 2025', duration: '20 hours', severity: 'moderate', location: 'Urgent Care Visit', triggers: ['Cold Weather', 'Dehydration'], notes: 'Received fluids, discharged same day.' },
    { id: 'sc4-3', dateRange: 'Jun 11, 2025', duration: '14 hours', severity: 'mild', location: 'At-Home Care', triggers: ['Missed medication'], notes: 'Resolved after resuming hydroxyurea schedule.' },
  ],
  trends: {
    hbTrend: buildTrend([
      77.0, 76.9, 76.7, 76.4, 76.2, 75.9, 75.5,
      75.1, 74.9, 74.6, 74.4, 74.2, 74.0, 73.8,
    ]),
    spo2: buildTrend([
      97.0, 96.9, 96.7, 96.5, 96.3, 96.1, 96.0,
      95.8, 95.6, 95.4, 95.3, 95.2, 95.1, 95.0,
    ]),
    heartRate: buildTrend([
      78, 79, 79, 80, 80, 81, 81,
      82, 82, 83, 83, 83, 84, 84,
    ]),
    pain: buildTrend([
      3, 3, 3, 4, 3, 4, 4,
      4, 5, 4, 5, 5, 5, 5,
    ]),
  },
  adherenceHistory: buildAdherence(
    [75, 50, 25, 50, 25, 0, 0],
    [1, 2, 3, 2, 3, 4, 4]
  ),
  vocRiskHistory: buildRiskHistory([
    'low', 'low', 'moderate', 'moderate', 'moderate', 'moderate', 'moderate',
  ]),
  wearableConnected: true,
  lastSynced: 'Today, 11:05 AM',
  alertSeverity: 'warning',
  scenarioLabel: 'Missed Medications — Adherence Alert',
};

// ── Patient 5: James L. — No Active Wearable, Last-Known Stable ─────────────

const jamesMeds: Medication[] = [
  { id: 'j1', name: 'Hydroxyurea', dosage: '500mg', instructions: 'Take with food', timeOfDay: 'morning', status: 'taken', takenAt: '8:30 AM', icon: 'pill' },
  { id: 'j2', name: 'Folic Acid', dosage: '1mg', instructions: '', timeOfDay: 'morning', status: 'taken', takenAt: '8:31 AM', icon: 'pill' },
  { id: 'j3', name: 'Ibuprofen', dosage: '400mg', instructions: 'As needed for pain', timeOfDay: 'afternoon', status: 'pending', icon: 'medical-bag' },
];

const james: DemoPatient = {
  id: 'D10-SC-005',
  name: 'James L.',
  initials: 'JL',
  age: 55,
  condition: 'Sickle Cell Disease (HbSS)',
  patientIdLabel: 'Patient ID · D10-SC-005',
  currentPainLevel: 3,
  vocRisk: {
    level: 'low',
    label: 'LOW RISK',
    description:
      'No active wearable. Last known status: stable. Manual check-in recommended — wearable last synced yesterday.',
  },
  vitals: { spo2: 97, heartRate: 74, hbTrendIndex: 79.5, temperatureF: 98.5 },
  medications: jamesMeds,
  crisisEvents: [
    { id: 'sc5-1', dateRange: 'Dec 18–20, 2025', duration: '48 hours', severity: 'moderate', location: 'Urgent Care Visit', triggers: ['Cold Weather', 'Infection'], notes: '' },
    { id: 'sc5-2', dateRange: 'May 02, 2025', duration: '12 hours', severity: 'mild', location: 'At-Home Care', triggers: ['Dehydration'], notes: '' },
  ],
  trends: {
    hbTrend: buildTrend([
      79.3, 79.4, 79.6, 79.5, 79.7, 79.6, 79.5,
      79.6, 79.5, 79.4, 79.6, 79.5, 79.5, 79.5,
    ]),
    spo2: buildTrend([
      97.0, 97.1, 97.0, 97.2, 97.1, 97.0, 97.1,
      97.0, 97.1, 97.0, 97.2, 97.1, 97.0, 97.0,
    ]),
    heartRate: buildTrend([
      74, 75, 73, 74, 74, 75, 73,
      74, 74, 75, 73, 74, 74, 74,
    ]),
    pain: buildTrend([
      2, 2, 3, 2, 3, 2, 3,
      2, 2, 3, 2, 3, 3, 3,
    ]),
  },
  adherenceHistory: buildAdherence(
    [100, 100, 100, 75, 100, 100, 75],
    [0, 0, 0, 1, 0, 0, 1]
  ),
  vocRiskHistory: buildRiskHistory([
    'low', 'low', 'low', 'low', 'low', 'low', 'low',
  ]),
  wearableConnected: false,
  lastSynced: 'Yesterday, 6:22 PM',
  alertSeverity: 'info',
  scenarioLabel: 'No Active Wearable',
};

// ── Patient 6: Nia R. — Rising VOC Risk (Trend Escalation) ──────────────────
//
// Distinct from Aisha (pain-dominant rise) and Marcus (already in crisis).
// Nia's PHYSIOLOGY is trending toward a VOC: Hb Trend Index is dropping
// steadily, heart rate is climbing, SpO₂ is slipping. Pain is elevated but
// not severe. Caregiver-level escalation today; early warning for clinicians.

const niaMeds: Medication[] = [
  { id: 'n1', name: 'Hydroxyurea', dosage: '750mg', instructions: 'Take with food', timeOfDay: 'morning', status: 'taken', takenAt: '8:02 AM', icon: 'pill' },
  { id: 'n2', name: 'Folic Acid', dosage: '1mg', instructions: '', timeOfDay: 'morning', status: 'taken', takenAt: '8:03 AM', icon: 'pill' },
  { id: 'n3', name: 'Voxelotor', dosage: '1500mg', instructions: 'Daily with or without food', timeOfDay: 'afternoon', status: 'taken', takenAt: '1:10 PM', icon: 'pill' },
  { id: 'n4', name: 'Ibuprofen', dosage: '400mg', instructions: 'As needed for pain', timeOfDay: 'afternoon', status: 'taken', takenAt: '2:45 PM', icon: 'medical-bag' },
  { id: 'n5', name: 'Hydroxyurea', dosage: '750mg', instructions: 'Take with food', timeOfDay: 'evening', status: 'pending', icon: 'pill' },
];

const nia: DemoPatient = {
  id: 'D10-SC-006',
  name: 'Nia R.',
  initials: 'NR',
  age: 30,
  condition: 'Sickle Cell Disease (HbSS)',
  patientIdLabel: 'Patient ID · D10-SC-006',
  currentPainLevel: 6,
  vocRisk: {
    level: 'moderate',
    label: 'MODERATE RISK',
    description:
      'Hb Trend Index has fallen 5+ points over 10 days and heart rate is steadily rising. Early VOC-risk pattern — caregiver notified; clinician review recommended if trajectory continues.',
  },
  vitals: { spo2: 95, heartRate: 98, hbTrendIndex: 73.1, temperatureF: 99.4 },
  medications: niaMeds,
  crisisEvents: [
    { id: 'sc6-1', dateRange: 'Feb 24–25, 2026', duration: '30 hours', severity: 'moderate', location: 'Urgent Care Visit', triggers: ['Stress', 'Cold Weather'], notes: 'Managed with IV fluids; discharged.' },
    { id: 'sc6-2', dateRange: 'Sep 10, 2025', duration: '16 hours', severity: 'mild', location: 'At-Home Care', triggers: ['Dehydration'], notes: '' },
  ],
  trends: {
    hbTrend: buildTrend([
      78.9, 78.6, 78.2, 77.8, 77.2, 76.7, 76.0,
      75.4, 74.9, 74.5, 74.0, 73.6, 73.3, 73.1,
    ]),
    spo2: buildTrend([
      97.1, 97.0, 96.8, 96.7, 96.5, 96.3, 96.1,
      96.0, 95.8, 95.6, 95.4, 95.3, 95.1, 95.0,
    ]),
    heartRate: buildTrend([
      78, 79, 80, 82, 83, 85, 87,
      88, 90, 92, 93, 94, 96, 98,
    ]),
    pain: buildTrend([
      2, 2, 3, 3, 3, 4, 4,
      4, 5, 5, 5, 6, 6, 6,
    ]),
  },
  adherenceHistory: buildAdherence(
    [100, 100, 100, 100, 100, 75, 100],
    [0, 0, 0, 0, 0, 1, 0]
  ),
  vocRiskHistory: buildRiskHistory([
    'low', 'low', 'moderate', 'moderate', 'moderate', 'moderate', 'moderate',
  ]),
  wearableConnected: true,
  lastSynced: 'Today, 1:12 PM',
  alertSeverity: 'warning',
  scenarioLabel: 'Rising VOC Risk — Trend Escalation',
};

// ── Exports ──────────────────────────────────────────────────────────────────

export const DEMO_PATIENTS: DemoPatient[] = [solomon, aisha, marcus, priya, james, nia];

/**
 * The patient slot that real wearable readings are attributed to.
 * Solomon B. is the primary patient-app user in this demo, so his record is
 * the canonical merge target when the BLE feed emits live values.
 */
export const LIVE_DEMO_PATIENT_ID = 'D10-SC-001';
export const LIVE_DEMO_PATIENT_NAME = 'Solomon B.';

export function getDemoPatient(id: string): DemoPatient {
  return DEMO_PATIENTS.filter((p) => p.id === id)[0] ?? DEMO_PATIENTS[0];
}

/**
 * Overlay describing the live-wearable fields that should replace a demo
 * patient's seeded values. Any field left undefined falls back to the seeded
 * value — the dashboards rely on that to keep demo-only metrics (Temperature,
 * crisis history, medications, adherence history, VOC risk history, trend
 * series, etc.) intact for the live patient.
 *
 * Temperature is deliberately NOT part of this overlay because the hardware
 * does not emit it; see hardwareSnapshotAdapter.FALLBACK_DEMO_VALUES.
 */
export interface LivePatientOverlay {
  patientId: string;
  painLevel?: number;
  spo2?: number;
  heartRate?: number;
  hbTrendIndex?: number;
  fingerDetected?: boolean;
  battery?: number | null;
}

/**
 * Returns the DEMO_PATIENTS list with the live patient's wearable-backed
 * vitals and pain overlaid from the wearable feed. When `overlay` is null
 * (no live feed available), returns DEMO_PATIENTS unchanged so all seeded
 * demo scenarios keep working exactly as before.
 *
 * IMPORTANT: Only `vitals.{spo2,heartRate,hbTrendIndex}`, `currentPainLevel`
 * and `alertSeverity` are replaced. The 14-day `trends`, 7-day
 * `adherenceHistory` and 7-day `vocRiskHistory` series remain the seeded
 * demo context — they represent the days BEFORE today and intentionally do
 * not include the live "now" reading, so seeded history never gets confused
 * with the real-time live value.
 *
 * Severity is recomputed via `computeAlertSeverity` using the final (live or
 * seeded) values so the caregiver + hematologist queues stay consistent with
 * the thresholds in escalationConfig.
 */
export function resolveLivePatients(
  overlay: LivePatientOverlay | null
): DemoPatient[] {
  if (!overlay) return DEMO_PATIENTS;
  return DEMO_PATIENTS.map((p) => {
    if (p.id !== overlay.patientId) return p;

    const nextVitals: DemoPatient['vitals'] = {
      ...p.vitals,
      spo2: overlay.spo2 ?? p.vitals.spo2,
      heartRate: overlay.heartRate ?? p.vitals.heartRate,
      hbTrendIndex: overlay.hbTrendIndex ?? p.vitals.hbTrendIndex,
    };
    const nextPain = overlay.painLevel ?? p.currentPainLevel;
    const nextSeverity = computeAlertSeverity(
      nextPain,
      p.vocRisk.level,
      nextVitals.hbTrendIndex
    );

    return {
      ...p,
      currentPainLevel: nextPain,
      vitals: nextVitals,
      alertSeverity: nextSeverity,
    };
  });
}

/** Patients with warning-or-above alerts → shown prominently in caregiver view */
export function getCaregiverAlertPatients(
  patients: DemoPatient[] = DEMO_PATIENTS
): DemoPatient[] {
  return patients.filter(
    (p) => p.alertSeverity === 'warning' || p.alertSeverity === 'high' || p.alertSeverity === 'extreme'
  );
}

/** Patients requiring hematologist attention (high or extreme only) */
export function getHematologistEscalationPatients(
  patients: DemoPatient[] = DEMO_PATIENTS
): DemoPatient[] {
  return patients.filter(
    (p) => p.alertSeverity === 'high' || p.alertSeverity === 'extreme'
  );
}

export function getMedAdherence(patient: DemoPatient): {
  taken: number;
  skipped: number;
  pending: number;
  total: number;
  pct: number;
} {
  const meds = patient.medications;
  const taken = meds.filter((m) => m.status === 'taken').length;
  const skipped = meds.filter((m) => m.status === 'skipped').length;
  const pending = meds.filter((m) => m.status === 'pending').length;
  const total = meds.length;
  const pct = total > 0 ? Math.round((taken / total) * 100) : 0;
  return { taken, skipped, pending, total, pct };
}

/**
 * Weekly adherence % averaged across the seeded 7-day history.
 * Useful for caregiver-facing "this week" summaries.
 */
export function getWeeklyAdherencePct(patient: DemoPatient): number {
  if (patient.adherenceHistory.length === 0) return 0;
  const sum = patient.adherenceHistory.reduce((acc, p) => acc + p.pct, 0);
  return Math.round(sum / patient.adherenceHistory.length);
}
