/**
 * D-10 Therapeutics — Live Patient State Service
 *
 * Reads and writes the current wearable snapshot for a patient to Firestore.
 * Called by the TelemetrySink (mobile side) to push data, and by the
 * caregiver/hematologist dashboards to receive real-time updates.
 *
 * ── Firestore path ───────────────────────────────────────────────────────────
 *   livePatients/{patientId}
 *     heartRate:       number        — beats per minute
 *     spo2:            number        — blood oxygen %, 0–100
 *     hbTrendIndex:    number        — relative Hb index, hardware 0–99.99 scale
 *     battery:         number | null — wearable battery %, omitted if unknown
 *     fingerDetected:  boolean       — false = sensor idle, values not physiological
 *     painLevel:       number | null — 0–10 self-reported, null if not reported
 *     vocRisk:         string        — 'low' | 'moderate' | 'high'
 *     deviceId:        string        — BLE device identifier
 *     source:          string        — 'wearable' | 'manual'
 *     updatedAt:       Timestamp     — Firestore server timestamp
 *
 * ── NOT wired to UI yet ──────────────────────────────────────────────────────
 * This module is scaffolding only. To activate:
 *   1. Fill in firebaseConfig.ts with real project credentials
 *   2. In SensorAdapter.ts, replace NoopTelemetrySink with a real sink that
 *      calls writeCurrentPatientState() on each snapshot
 *   3. In CaregiverDashboardScreen / HematologistDashboardScreen, call
 *      subscribeToCurrentPatientState() per patient instead of reading demoPatients.ts
 */

import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db, PATHS } from './firebase';
import { isFirebaseConfigured } from '../config/firebaseConfig';

// ── Types ─────────────────────────────────────────────────────────────────────

export type VocRiskLevel = 'low' | 'moderate' | 'high';
export type LivePatientSource = 'wearable' | 'manual';

/**
 * The shape written to and read from Firestore at livePatients/{patientId}.
 * Mirrors NormalizedWearableSnapshot but is cloud-transport friendly
 * (no Uint8Array, no class instances).
 */
export interface LivePatientState {
  heartRate: number;
  spo2: number;
  /** Relative Hb trend index on 0–99.99 hardware scale. Not absolute g/dL. */
  hbTrendIndex: number;
  battery: number | null;
  fingerDetected: boolean;
  /**
   * Self-reported pain 0–10. Optional so BLE snapshot writes can omit it
   * and avoid overwriting a value the patient set via PainTrackerScreen.
   * Written separately by writeLivePainLevel().
   */
  painLevel?: number | null;
  vocRisk: VocRiskLevel;
  deviceId: string;
  source: LivePatientSource;
  /** ISO-8601 string — set by the client when writing. Use for display only. */
  clientTimestamp: string;
}

/** Shape returned from Firestore reads — adds the Firestore-managed timestamp. */
export interface LivePatientStateDoc extends LivePatientState {
  updatedAt: unknown; // Firestore Timestamp — cast if needed
}

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Writes (or merges) the current patient state to Firestore.
 * Called from the TelemetrySink when a new BLE snapshot arrives.
 *
 * No-ops silently if Firebase is not yet configured.
 *
 * @param patientId   e.g. 'D10-SC-001'
 * @param state       The normalized snapshot to persist
 */
export async function writeCurrentPatientState(
  patientId: string,
  state: LivePatientState
): Promise<void> {
  if (!isFirebaseConfigured()) {
    return;
  }
  try {
    const ref = doc(db, PATHS.livePatient(patientId));
    await setDoc(ref, { ...state, updatedAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    console.warn('[D10] livePatientService.write failed:', error);
  }
}

// ── Pain level write (separate from BLE) ─────────────────────────────────────

/**
 * Writes only the patient's self-reported pain level to Firestore.
 * Merges into the existing document so BLE vitals are preserved.
 *
 * Called from PainTrackerScreen when the patient submits a pain report.
 * Not called from the BLE telemetry path.
 *
 * @param patientId   e.g. LIVE_PATIENT_ID (same as LIVE_DEMO_PATIENT_ID / Solomon)
 * @param painLevel   Self-reported pain 0–10
 */
export async function writeLivePainLevel(
  patientId: string,
  painLevel: number
): Promise<void> {
  if (!isFirebaseConfigured()) {
    return;
  }
  try {
    const ref = doc(db, PATHS.livePatient(patientId));
    await setDoc(
      ref,
      { painLevel, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (error) {
    console.warn('[D10] livePatientService.writePainLevel failed:', error);
  }
}

// ── One-shot read ─────────────────────────────────────────────────────────────

/**
 * Reads the current patient state once. Useful for initial page loads
 * before a real-time subscription takes over.
 *
 * Returns null if Firebase is not configured or the document does not exist.
 *
 * @param patientId   e.g. 'D10-SC-001'
 */
export async function readCurrentPatientState(
  patientId: string
): Promise<LivePatientStateDoc | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }
  try {
    const ref = doc(db, PATHS.livePatient(patientId));
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return null;
    }
    return snap.data() as LivePatientStateDoc;
  } catch (error) {
    console.warn('[D10] livePatientService.read failed:', error);
    return null;
  }
}

// ── Real-time subscription ────────────────────────────────────────────────────

/**
 * Subscribes to real-time updates for a patient's current state.
 * The callback fires immediately with the current value, then on every change.
 *
 * Returns an unsubscribe function — call it on component unmount.
 *
 * When Firebase is not configured, calls callback(null) once and returns a no-op.
 *
 * @param patientId   e.g. 'D10-SC-001'
 * @param callback    Called with the latest state, or null if doc doesn't exist
 *
 * @example
 *   const unsub = subscribeToCurrentPatientState('D10-SC-001', (state) => {
 *     if (state) setLiveVitals(state);
 *   });
 *   return () => unsub(); // in useEffect cleanup
 */
export function subscribeToCurrentPatientState(
  patientId: string,
  callback: (state: LivePatientStateDoc | null) => void
): Unsubscribe {
  if (!isFirebaseConfigured()) {
    callback(null);
    return () => {};
  }

  const ref = doc(db, PATHS.livePatient(patientId));
  return onSnapshot(
    ref,
    (snap) => {
      callback(snap.exists() ? (snap.data() as LivePatientStateDoc) : null);
    },
    (error) => {
      console.warn('[D10] livePatientService.subscribe error:', error);
      callback(null);
    }
  );
}
