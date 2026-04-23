/**
 * D-10 Therapeutics — Alert Sync Service
 *
 * Reads and writes clinical alerts to Firestore so they persist across
 * devices and sessions. Designed to work alongside the existing in-memory
 * notificationService.ts — alerts can be written to both stores during
 * the transition period, then the in-memory store can be retired.
 *
 * ── Firestore path ───────────────────────────────────────────────────────────
 *   alerts/{alertId}
 *     patientId:    string    — e.g. 'D10-SC-003'
 *     patientName:  string    — e.g. 'Marcus T.'
 *     severity:     string    — 'info' | 'warning' | 'high' | 'extreme'
 *     title:        string    — short display title
 *     body:         string    — full alert message
 *     target:       string    — 'patient' | 'caregiver' | 'hematologist'
 *     createdAt:    Timestamp — Firestore server timestamp
 *     read:         boolean   — whether any recipient has read it
 *     readBy:       string[]  — list of userIds or role strings that have read it
 *
 * ── NOT wired to UI yet ──────────────────────────────────────────────────────
 * To activate:
 *   1. In notificationService.ts emitAlert(), call writeCloudAlert() after
 *      pushing to the in-memory store
 *   2. In AlertCenterScreen.tsx, replace subscribeAlerts() with
 *      subscribeToAlerts() from this module (or run both in parallel during rollout)
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db, PATHS } from './firebase';
import { isFirebaseConfigured } from '../config/firebaseConfig';
import { AlertSeverity, AlertTarget } from '../data/escalationConfig';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * The shape written to Firestore for each alert.
 * Intentionally flat — no nested objects so Firestore queries stay simple.
 */
export interface CloudAlert {
  patientId: string;
  patientName: string;
  severity: AlertSeverity;
  title: string;
  body: string;
  target: AlertTarget;
  read: boolean;
  readBy: string[];
  /** ISO-8601 from client — for display ordering before server timestamp resolves. */
  clientTimestamp: string;
}

/** A CloudAlert as returned from Firestore — includes the document ID and server timestamp. */
export interface CloudAlertDoc extends CloudAlert {
  id: string;
  createdAt: unknown; // Firestore Timestamp
}

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Writes a new alert to the Firestore `alerts` collection.
 * Returns the auto-generated alertId, or null if Firebase is not configured.
 *
 * @example
 *   const alertId = await writeCloudAlert({
 *     patientId: 'D10-SC-003',
 *     patientName: 'Marcus T.',
 *     severity: 'high',
 *     title: 'HIGH RISK — VOC Crisis Indicators',
 *     body: 'SpO₂ 92%, HR 118 bpm...',
 *     target: 'hematologist',
 *   });
 */
export async function writeCloudAlert(
  params: Omit<CloudAlert, 'read' | 'readBy' | 'clientTimestamp'>
): Promise<string | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }
  try {
    const alertsRef = collection(db, PATHS.alerts);
    const docRef = await addDoc(alertsRef, {
      ...params,
      read: false,
      readBy: [],
      clientTimestamp: new Date().toISOString(),
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.warn('[D10] alertSyncService.write failed:', error);
    return null;
  }
}

// ── Mark read ─────────────────────────────────────────────────────────────────

/**
 * Marks a single alert as read and records who read it.
 *
 * @param alertId     Firestore document ID returned by writeCloudAlert()
 * @param readerId    A userId or role string, e.g. 'caregiver' or a Firebase uid
 */
export async function markCloudAlertRead(
  alertId: string,
  readerId: string
): Promise<void> {
  if (!isFirebaseConfigured()) {
    return;
  }
  try {
    const ref = doc(db, PATHS.alert(alertId));
    await updateDoc(ref, {
      read: true,
      readBy: [readerId], // arrayUnion would be ideal; use simple overwrite for now
    });
  } catch (error) {
    console.warn('[D10] alertSyncService.markRead failed:', error);
  }
}

// ── One-shot read ─────────────────────────────────────────────────────────────

/**
 * Reads alerts from Firestore once, optionally filtered by target role.
 * Ordered by createdAt descending (newest first).
 *
 * Returns [] if Firebase is not configured.
 *
 * @param target  Optional role filter: 'caregiver' | 'hematologist' | 'patient'
 */
export async function readCloudAlerts(
  target?: AlertTarget
): Promise<CloudAlertDoc[]> {
  if (!isFirebaseConfigured()) {
    return [];
  }
  try {
    const alertsRef = collection(db, PATHS.alerts);
    const q = target
      ? query(
          alertsRef,
          where('target', '==', target),
          orderBy('createdAt', 'desc')
        )
      : query(alertsRef, orderBy('createdAt', 'desc'));

    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CloudAlertDoc));
  } catch (error) {
    console.warn('[D10] alertSyncService.read failed:', error);
    return [];
  }
}

// ── Real-time subscription ────────────────────────────────────────────────────

/**
 * Subscribes to real-time alert updates, optionally filtered by target role.
 * Fires immediately with current alerts, then on every change.
 *
 * Returns an unsubscribe function — call it on component unmount.
 *
 * When Firebase is not configured, calls callback([]) once and returns a no-op.
 *
 * @param callback    Called with the full sorted alert list on each change
 * @param target      Optional role filter
 *
 * @example
 *   const unsub = subscribeToAlerts((alerts) => setAlerts(alerts), 'caregiver');
 *   return () => unsub();
 */
export function subscribeToAlerts(
  callback: (alerts: CloudAlertDoc[]) => void,
  target?: AlertTarget
): Unsubscribe {
  if (!isFirebaseConfigured()) {
    callback([]);
    return () => {};
  }

  const alertsRef = collection(db, PATHS.alerts);
  const q = target
    ? query(
        alertsRef,
        where('target', '==', target),
        orderBy('createdAt', 'desc')
      )
    : query(alertsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snap) => {
      const alerts = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as CloudAlertDoc)
      );
      callback(alerts);
    },
    (error) => {
      console.warn('[D10] alertSyncService.subscribe error:', error);
      callback([]);
    }
  );
}
