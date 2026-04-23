/**
 * D-10 Therapeutics — History Sync Service
 *
 * Reads and writes time-series wearable samples to Firestore.
 * Each document holds all samples for one patient for one calendar day.
 * The TrendsScreen and hematologist history view will eventually read from here.
 *
 * ── Firestore path ───────────────────────────────────────────────────────────
 *   livePatients/{patientId}/history/{dateKey}
 *     patientId:  string            — e.g. 'D10-SC-001'
 *     date:       string            — YYYY-MM-DD, matches the document key
 *     samples:    HistorySample[]   — array of readings for the day, appended each write
 *     updatedAt:  Timestamp         — Firestore server timestamp
 *
 *   Each HistorySample:
 *     heartRate:      number
 *     spo2:           number
 *     hbTrendIndex:   number
 *     battery:        number | null
 *     fingerDetected: boolean
 *     recordedAt:     string  — ISO-8601 client timestamp
 *
 * ── Storage note ─────────────────────────────────────────────────────────────
 * Firestore documents have a 1 MiB limit. At one sample every 5 seconds,
 * a 24-hour day produces ~17,000 samples. At ~100 bytes per sample that's
 * ~1.7 MB — too large for one document. In production, write samples every
 * 30–60 seconds or use a sub-collection per hour. For demo purposes (short
 * sessions), the single-document-per-day approach is fine.
 *
 * ── NOT wired to UI yet ──────────────────────────────────────────────────────
 * To activate:
 *   1. In SensorAdapter.ts, call appendHistorySample() from the telemetry sink
 *      (throttled to once per minute or per meaningful change)
 *   2. In TrendsScreen.tsx, call readDayHistory() or subscribeToDayHistory()
 *      instead of generating random trend points from mockData.ts
 */

import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  Unsubscribe,
} from 'firebase/firestore';
import { db, PATHS } from './firebase';
import { isFirebaseConfigured } from '../config/firebaseConfig';

// ── Types ─────────────────────────────────────────────────────────────────────

/** A single timestamped wearable reading stored inside a history document. */
export interface HistorySample {
  heartRate: number;
  spo2: number;
  /** Relative Hb trend index on 0–99.99 hardware scale. Not absolute g/dL. */
  hbTrendIndex: number;
  battery: number | null;
  fingerDetected: boolean;
  /** ISO-8601 string — set by client at time of recording. */
  recordedAt: string;
}

/** The shape of one livePatients/{patientId}/history/{dateKey} document. */
export interface DayHistoryDoc {
  patientId: string;
  date: string;
  samples: HistorySample[];
  updatedAt: unknown; // Firestore Timestamp
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the YYYY-MM-DD key for a given date in local time.
 * Pass a Date object or leave empty for today.
 */
export function toDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Appends one sample to today's history document for a patient.
 * Creates the document if it does not yet exist.
 *
 * Silently no-ops if Firebase is not configured.
 * Call this from the telemetry sink, throttled to at most once per minute.
 *
 * @param patientId   e.g. 'D10-SC-001'
 * @param sample      The wearable reading to append
 * @param dateKey     Optional override — defaults to today (YYYY-MM-DD)
 */
export async function appendHistorySample(
  patientId: string,
  sample: HistorySample,
  dateKey: string = toDateKey()
): Promise<void> {
  if (!isFirebaseConfigured()) {
    return;
  }
  try {
    const ref = doc(db, PATHS.liveHistory(patientId, dateKey));
    await setDoc(
      ref,
      {
        patientId,
        date: dateKey,
        samples: arrayUnion(sample),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('[D10] historySyncService.append failed:', error);
  }
}

// ── One-shot read ─────────────────────────────────────────────────────────────

/**
 * Reads all samples for a patient on a given day.
 * Returns null if Firebase is not configured or no data exists.
 *
 * @param patientId   e.g. 'D10-SC-001'
 * @param dateKey     YYYY-MM-DD — use toDateKey() for today
 */
export async function readDayHistory(
  patientId: string,
  dateKey: string = toDateKey()
): Promise<DayHistoryDoc | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }
  try {
    const ref = doc(db, PATHS.liveHistory(patientId, dateKey));
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return null;
    }
    return snap.data() as DayHistoryDoc;
  } catch (error) {
    console.warn('[D10] historySyncService.read failed:', error);
    return null;
  }
}

// ── Real-time subscription ────────────────────────────────────────────────────

/**
 * Subscribes to real-time updates for a patient's history on a given day.
 * Fires immediately with current data, then on every new sample appended.
 *
 * Returns an unsubscribe function — call it on component unmount.
 *
 * When Firebase is not configured, calls callback(null) once and returns a no-op.
 *
 * @param patientId   e.g. 'D10-SC-001'
 * @param dateKey     YYYY-MM-DD — use toDateKey() for today
 * @param callback    Called with the latest DayHistoryDoc, or null if no data
 *
 * @example
 *   const unsub = subscribeToDayHistory('D10-SC-001', toDateKey(), (doc) => {
 *     if (doc) setTrendData(doc.samples);
 *   });
 *   return () => unsub();
 */
export function subscribeToDayHistory(
  patientId: string,
  dateKey: string = toDateKey(),
  callback: (history: DayHistoryDoc | null) => void
): Unsubscribe {
  if (!isFirebaseConfigured()) {
    callback(null);
    return () => {};
  }

  const ref = doc(db, PATHS.liveHistory(patientId, dateKey));
  return onSnapshot(
    ref,
    (snap) => {
      callback(snap.exists() ? (snap.data() as DayHistoryDoc) : null);
    },
    (error) => {
      console.warn('[D10] historySyncService.subscribe error:', error);
      callback(null);
    }
  );
}
