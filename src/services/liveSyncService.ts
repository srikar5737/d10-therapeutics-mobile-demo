/**
 * D-10 Therapeutics — Live BLE-to-Firebase Sync Service
 *
 * Implements TelemetrySink so that live BLE wearable snapshots flow from
 * the iPhone patient app to Firestore in real time.
 *
 * ── Live patient identity ─────────────────────────────────────────────────────
 * LIVE_PATIENT_ID is the single real wearable patient whose data is written
 * to Firebase. Every other patient shown in the dashboards is seeded demo data.
 * When real auth is added, replace this constant with the Firebase uid or
 * a patient record id resolved after sign-in.
 *
 * ── What is live vs seeded ────────────────────────────────────────────────────
 * LIVE (written here from BLE):
 *   heartRate, spo2, hbTrendIndex, battery, fingerDetected, vocRisk, deviceId
 *   painLevel  →  forwarded ONLY when the hardware payload includes it
 *                 (snapshot.painLevel !== undefined). When the payload omits
 *                 painLevel, it is intentionally left off the merge write so
 *                 prior self-reported pain (from PainTrackerScreen via
 *                 writeLivePainLevel()) is never overwritten by BLE.
 *
 * NOT SYNCED (stays seeded/static):
 *   name, age, condition, medications, crisisEvents  →  DemoPatient fields
 *   temperature  →  hardware does not send temperature; remains at 98.6°F fallback
 *
 * ── Write throttling ──────────────────────────────────────────────────────────
 * BLE packets arrive every 1–2 seconds. Unthrottled writes would be ~30–60
 * Firestore writes per minute, which is both expensive and unnecessary.
 *   Current state: at most 1 write per CURRENT_WRITE_INTERVAL_MS (default 5 s)
 *   History sample: at most 1 append per HISTORY_APPEND_INTERVAL_MS (default 60 s)
 *
 * ── Graceful fallback ────────────────────────────────────────────────────────
 * All Firebase calls are fire-and-forget (.catch(() => {})). If Firestore is
 * unreachable, unconfigured, or returns an error, the BLE → UI data path is
 * completely unaffected. The patient app keeps showing live vitals normally.
 *
 * ── Activation ───────────────────────────────────────────────────────────────
 * Wired into SensorAdapter.ts as the module-level telemetrySink.
 * Activates only when:
 *   (a) BLE mode is active (SensorAdapter.mode === 'ble')
 *   (b) isFirebaseConfigured() returns true (real credentials in firebaseConfig.ts)
 *   (c) snapshot.fingerDetected === true (valid physiological readings)
 */

import { TelemetrySink, WearableConnectionState } from '../data/telemetrySink';
import {
  NormalizedWearableSnapshot,
  mapHardwareSnapshotToRisk,
} from '../data/hardwareSnapshotAdapter';
import { writeCurrentPatientState } from './livePatientService';
import { appendHistorySample, toDateKey, HistorySample } from './historySyncService';
import { isFirebaseConfigured } from '../config/firebaseConfig';
import { LIVE_DEMO_PATIENT_ID } from '../data/demoPatients';

// ── Live patient identity ─────────────────────────────────────────────────────

/**
 * Firestore document key for the real wearable patient.
 * Kept in sync with `LIVE_DEMO_PATIENT_ID` (Solomon B. / D10-SC-001) so
 * telemetry, caregiver overlays, and `resolveLivePatients()` all target one id.
 */
export const LIVE_PATIENT_ID = LIVE_DEMO_PATIENT_ID;

// ── Throttle intervals ────────────────────────────────────────────────────────

/** Maximum one current-state Firestore write per this many milliseconds. */
const CURRENT_WRITE_INTERVAL_MS = 5_000; // 5 seconds

/** Maximum one history-sample append per this many milliseconds. */
const HISTORY_APPEND_INTERVAL_MS = 60_000; // 1 minute

// ── Sink factory ──────────────────────────────────────────────────────────────

/**
 * Creates and returns a TelemetrySink that bridges live BLE snapshots to
 * Firebase Firestore.
 *
 * Each call returns a new independent sink instance with its own throttle
 * state, so multiple patients could be synced independently in the future.
 *
 * @param patientId  Firestore document key for the live patient.
 *                   Pass LIVE_PATIENT_ID in normal usage.
 */
export function createFirebaseTelemetrySink(patientId: string): TelemetrySink {
  let lastCurrentWriteAt = 0;
  let lastHistoryAppendAt = 0;

  return {
    /**
     * Connection-state changes are not written to Firestore yet.
     * Future: write deviceId + connectionState to livePatients/{patientId}
     * so the caregiver dashboard can show a real-time "wearable offline" badge.
     */
    onConnectionStateChange(_state: WearableConnectionState): void {},

    onSnapshotReceived(snapshot: NormalizedWearableSnapshot): void {
      // Gate 1: Skip entirely if Firebase credentials are not filled in yet.
      // The demo keeps running on local mock/BLE data with no cloud interaction.
      if (!isFirebaseConfigured()) return;

      // Gate 2: No finger on sensor → zero-value readings, not physiological.
      // SensorAdapter already excludes these from snapshotHistory; we guard
      // here independently so this sink is self-contained.
      if (!snapshot.fingerDetected) return;

      const now = Date.now();

      // ── Current state write ───────────────────────────────────────────────
      if (now - lastCurrentWriteAt >= CURRENT_WRITE_INTERVAL_MS) {
        lastCurrentWriteAt = now;

        const riskStatus = mapHardwareSnapshotToRisk(snapshot);

        // painLevel is only forwarded when the hardware actually emits it.
        // When the payload omits it (the common case today), we leave it out
        // of the merge write entirely so the last self-reported pain from
        // PainTrackerScreen survives. BLE must never overwrite that with null.
        const basePayload = {
          heartRate: snapshot.heartRate,
          spo2: snapshot.spo2,
          hbTrendIndex: snapshot.hbTrendIndex,
          battery: typeof snapshot.battery === 'number' ? snapshot.battery : null,
          fingerDetected: true,
          vocRisk: riskStatus.level,
          deviceId: snapshot.deviceId,
          source: 'wearable' as const,
          clientTimestamp: snapshot.timestamp,
        };

        const payload =
          typeof snapshot.painLevel === 'number'
            ? { ...basePayload, painLevel: snapshot.painLevel }
            : basePayload;

        writeCurrentPatientState(patientId, payload).catch(() => {
          // Silent: Firestore unavailable → UI continues from local BLE data
        });
      }

      // ── History sample append ─────────────────────────────────────────────
      if (now - lastHistoryAppendAt >= HISTORY_APPEND_INTERVAL_MS) {
        lastHistoryAppendAt = now;

        const sample: HistorySample = {
          heartRate: snapshot.heartRate,
          spo2: snapshot.spo2,
          hbTrendIndex: snapshot.hbTrendIndex,
          battery: typeof snapshot.battery === 'number' ? snapshot.battery : null,
          fingerDetected: true,
          recordedAt: snapshot.timestamp,
        };

        appendHistorySample(patientId, sample, toDateKey()).catch(() => {
          // Silent: Firestore unavailable → history will resume on reconnect
        });
      }
    },
  };
}
