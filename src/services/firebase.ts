/**
 * D-10 Therapeutics — Firebase Initialization
 *
 * Initializes the Firebase app exactly once and exports the Firestore
 * instance (`db`) used across all service modules.
 *
 * Safe to import from multiple modules — getApps() guard prevents
 * "Firebase App named '[DEFAULT]' already exists" errors.
 *
 * When Firebase is not yet configured (placeholder keys), the app
 * initializes but any Firestore call will fail at the network layer.
 * All service modules check `isFirebaseConfigured()` before making
 * cloud calls so the demo keeps running intact.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import firebaseConfig from '../config/firebaseConfig';

const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db: Firestore = getFirestore(app);

export { app };

// ── Firestore Collection / Document Path Constants ────────────────────────────
//
// All service modules reference these paths — one place to change if the
// schema evolves.  Do not hard-code path strings anywhere else.
//
// Firestore layout:
//
//   livePatients/{patientId}
//     current document fields:  heartRate, spo2, hbTrendIndex, battery,
//                                fingerDetected, painLevel, vocRisk,
//                                deviceId, source, updatedAt
//
//     history/  (subcollection)
//       {dateKey}  (YYYY-MM-DD)
//         samples: LivePatientSample[]
//         date: string
//         patientId: string
//         updatedAt: Timestamp
//
//   alerts/{alertId}
//     patientId, patientName, severity, title, body,
//     target, createdAt, read, readBy[]
//
//   demoPatients/{patientId}
//     mirrors DemoPatient shape — used to seed / share demo scenarios
//     across devices without touching livePatients data

export const PATHS = {
  livePatient: (patientId: string) => `livePatients/${patientId}`,
  liveHistory: (patientId: string, dateKey: string) =>
    `livePatients/${patientId}/history/${dateKey}`,
  alerts: 'alerts',
  alert: (alertId: string) => `alerts/${alertId}`,
  demoPatient: (patientId: string) => `demoPatients/${patientId}`,
} as const;
