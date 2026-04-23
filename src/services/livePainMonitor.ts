/**
 * D-10 Therapeutics — Live Pain Monitor
 *
 * ── Purpose ─────────────────────────────────────────────────────────────────
 * Bridges live wearable `painLevel` readings into the monitoring workflow
 * so patient / caregiver / hematologist alerts fire when pain crosses the
 * tiers defined in escalationConfig (PAIN_THRESHOLDS).
 *
 * ── What this module does ───────────────────────────────────────────────────
 * • Subscribes to SensorAdapter snapshots via `subscribeSensorData`
 * • Reads the live pain state from `getLatestPainState()`
 *   (null unless mode is BLE/hardwareSnapshot AND the payload has painLevel)
 * • Emits in-memory alerts + outbound SMS demo records through
 *   `notificationService` when a NEW tier is reached within an episode
 *
 * ── Spam prevention (deterministic, demo-safe) ──────────────────────────────
 * An "episode" starts when painLevel first reaches `patientWarning` (≥4).
 * We track the highest tier fired during that episode (patient / caregiver /
 * hematologist). An alert fires ONLY on upward tier transitions. The episode
 * resets once the live painLevel drops back below `patientWarning` (or the
 * feed drops to not-live), so a later rise will legitimately re-alert.
 * Same-tier samples never re-emit.
 *
 * ── Fallback behavior ───────────────────────────────────────────────────────
 * • Mock mode: `getLatestPainState()` returns `isLive: false` → monitor is a
 *   complete no-op. Demo screens stay intact exactly as seeded.
 * • BLE mode without `painLevel` in the payload: same → no-op.
 * • `fingerDetected === false`: same → no-op, episode resets.
 *
 * ── Patient identity ────────────────────────────────────────────────────────
 * Live readings are attributed to the "live demo patient" slot so that
 * escalations show up on the correct caregiver/hematologist patient record
 * without inventing a new entity. See `LIVE_DEMO_PATIENT_ID` in demoPatients.
 */

import {
  getLatestPainState,
  subscribeSensorData,
} from '../data/SensorAdapter';
import {
  LIVE_DEMO_PATIENT_ID,
  LIVE_DEMO_PATIENT_NAME,
} from '../data/demoPatients';
import { PAIN_THRESHOLDS } from '../data/escalationConfig';
import { emitAlert, emitSmsRecord } from './notificationService';

// ── Tier model ───────────────────────────────────────────────────────────────

type PainTier = 'none' | 'patient' | 'caregiver' | 'hematologist';

const TIER_ORDER: Record<PainTier, number> = {
  none: 0,
  patient: 1,
  caregiver: 2,
  hematologist: 3,
};

function tierForLevel(level: number): PainTier {
  if (level >= PAIN_THRESHOLDS.hematologistAlert) return 'hematologist';
  if (level >= PAIN_THRESHOLDS.caregiverAlert) return 'caregiver';
  if (level >= PAIN_THRESHOLDS.patientWarning) return 'patient';
  return 'none';
}

// ── Monitor state ────────────────────────────────────────────────────────────

let unsubscribeSensor: (() => void) | null = null;
let started = false;

// Highest tier fired in the current pain episode. Resets to 'none' when pain
// drops below patientWarning or the live feed becomes unavailable.
let episodeHighestFired: PainTier = 'none';

// ── Public API ───────────────────────────────────────────────────────────────

export function startLivePainMonitor(): void {
  if (started) return;
  started = true;
  episodeHighestFired = 'none';

  unsubscribeSensor = subscribeSensorData(() => {
    const state = getLatestPainState();

    if (!state.isLive || state.painLevel === null) {
      episodeHighestFired = 'none';
      return;
    }

    const level = state.painLevel;
    const tier = tierForLevel(level);

    if (tier === 'none') {
      episodeHighestFired = 'none';
      return;
    }

    if (TIER_ORDER[tier] <= TIER_ORDER[episodeHighestFired]) {
      return;
    }

    // Fire alerts for every tier crossed since the last fired tier so a jump
    // from 0 → 9 still notifies patient + caregiver + hematologist in order.
    const startIdx = TIER_ORDER[episodeHighestFired] + 1;
    const endIdx = TIER_ORDER[tier];
    for (let idx = startIdx; idx <= endIdx; idx++) {
      const crossedTier = tierFromIndex(idx);
      if (crossedTier === 'none') continue;
      fireAlertForTier(crossedTier, level);
    }

    episodeHighestFired = tier;
  });
}

export function stopLivePainMonitor(): void {
  unsubscribeSensor?.();
  unsubscribeSensor = null;
  started = false;
  episodeHighestFired = 'none';
}

/** Exposed for tests and dev tooling. Resets episode gate without detaching. */
export function resetLivePainMonitorState(): void {
  episodeHighestFired = 'none';
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function tierFromIndex(idx: number): PainTier {
  switch (idx) {
    case 1:
      return 'patient';
    case 2:
      return 'caregiver';
    case 3:
      return 'hematologist';
    default:
      return 'none';
  }
}

function fireAlertForTier(tier: PainTier, level: number): void {
  const patientId = LIVE_DEMO_PATIENT_ID;
  const patientName = LIVE_DEMO_PATIENT_NAME;
  const painStr = `${level}/10`;

  if (tier === 'patient') {
    emitAlert({
      severity: 'warning',
      title: 'Pain Level Rising',
      body: `Your pain level is at ${painStr}. Please rest, stay well-hydrated, and contact your caregiver if pain increases. You are not alone.`,
      target: 'patient',
      patientId,
      patientName,
    });
    return;
  }

  if (tier === 'caregiver') {
    emitAlert({
      severity: 'warning',
      title: `Pain Alert — ${patientName}`,
      body: `${patientName} self-reported pain ${painStr} from the wearable — above caregiver threshold (≥${PAIN_THRESHOLDS.caregiverAlert}). Please check in with the patient.`,
      target: 'caregiver',
      patientId,
      patientName,
    });
    emitSmsRecord({
      to: '+1 (555) 000-0001',
      recipientRole: 'caregiver',
      recipientName: `Caregiver (${patientName})`,
      body: `[D10] ${patientName} pain ${painStr} (live wearable). Above caregiver threshold. Please check in. Open D10 app for details.`,
      severity: 'warning',
      patientId,
      patientName,
    });
    return;
  }

  if (tier === 'hematologist') {
    emitAlert({
      severity: 'high',
      title: `SEVERE PAIN — ${patientName}`,
      body: `${patientName} wearable pain ${painStr} — severe threshold reached (≥${PAIN_THRESHOLDS.hematologistAlert}). Clinical review recommended.`,
      target: 'hematologist',
      patientId,
      patientName,
    });
    emitAlert({
      severity: 'high',
      title: `Critical Patient Alert — ${patientName}`,
      body: `Pain ${painStr} from wearable. Hematologist has been notified. Please stand by.`,
      target: 'caregiver',
      patientId,
      patientName,
    });
    emitSmsRecord({
      to: '+1 (555) 000-0010',
      recipientRole: 'hematologist',
      recipientName: 'Dr. Rivera',
      body: `[D10 Clinical] SEVERE — ${patientName} (${patientId}) live wearable pain ${painStr}. Log in to D10 clinical dashboard.`,
      severity: 'high',
      patientId,
      patientName,
    });
    return;
  }
}
