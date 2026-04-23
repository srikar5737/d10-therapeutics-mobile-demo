/**
 * D-10 Therapeutics — Notification Service (Demo Abstraction)
 *
 * ── What this module does (demo) ────────────────────────────────────────────
 * • Maintains an in-memory alert feed for all three roles (patient / caregiver / hematologist)
 * • Generates mock OutboundSmsRecord entries showing what would be dispatched via
 *   Twilio or AWS SNS in production
 * • Provides a subscribe/unsubscribe API so UI components can react to new alerts
 *
 * ── What this module does NOT do ────────────────────────────────────────────
 * • Send real SMS or push notifications
 * • Use expo-notifications
 * • Perform HIPAA-compliant routing or audit logging
 *
 * ── Production integration points ───────────────────────────────────────────
 * • Replace `emitSmsRecord` body with a POST to your backend / Twilio endpoint
 * • Add server-side deduplication and escalation suppression
 * • Add HIPAA-compliant audit log writes on `emitAlert`
 * • Wire expo-notifications for real push delivery
 */

import { AlertSeverity, AlertTarget } from '../data/escalationConfig';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AppAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  body: string;
  target: AlertTarget;
  patientId: string;
  patientName: string;
  timestamp: string;
  read: boolean;
}

/**
 * Represents what would be sent via Twilio / AWS SNS to a caregiver or clinician.
 * DEMO ONLY — no real messages are sent. The `status` field is always 'demo-pending'.
 *
 * In production:
 *   - Replace the mock emit with a real backend call
 *   - Track status as 'queued' | 'sent' | 'delivered' | 'failed'
 *   - Add message SID / delivery receipt from the SMS provider
 */
export interface OutboundSmsRecord {
  id: string;
  to: string;
  recipientRole: 'caregiver' | 'hematologist';
  recipientName: string;
  body: string;
  severity: AlertSeverity;
  patientId: string;
  patientName: string;
  timestamp: string;
  status: 'demo-pending';
  demoNote: string;
}

// ── In-memory store ──────────────────────────────────────────────────────────

const alertStore: AppAlert[] = [];
const smsStore: OutboundSmsRecord[] = [];
const alertListeners = new Set<(alerts: AppAlert[]) => void>();
const smsListeners = new Set<(records: OutboundSmsRecord[]) => void>();
let _idCounter = 1;

function nextId(prefix: string) {
  return `${prefix}-${Date.now()}-${_idCounter++}`;
}

function notifyAlerts() {
  const snapshot = [...alertStore].reverse();
  alertListeners.forEach((l) => l(snapshot));
}

function notifySms() {
  const snapshot = [...smsStore].reverse();
  smsListeners.forEach((l) => l(snapshot));
}

// ── Public API ───────────────────────────────────────────────────────────────

export function emitAlert(params: Omit<AppAlert, 'id' | 'timestamp' | 'read'>): AppAlert {
  const alert: AppAlert = {
    ...params,
    id: nextId('alert'),
    timestamp: new Date().toISOString(),
    read: false,
  };
  alertStore.push(alert);
  notifyAlerts();
  return alert;
}

export function emitSmsRecord(
  params: Omit<OutboundSmsRecord, 'id' | 'timestamp' | 'status' | 'demoNote'>
): OutboundSmsRecord {
  const record: OutboundSmsRecord = {
    ...params,
    id: nextId('sms'),
    timestamp: new Date().toISOString(),
    status: 'demo-pending',
    demoNote:
      'DEMO ONLY — This record shows what would be dispatched via Twilio / AWS SNS in production. No real message was sent.',
  };
  smsStore.push(record);
  notifySms();
  return record;
}

export function markAlertRead(id: string) {
  const alert = alertStore.find((a) => a.id === id);
  if (alert) {
    alert.read = true;
    notifyAlerts();
  }
}

export function markAllRead(target?: AlertTarget) {
  let changed = false;
  for (const alert of alertStore) {
    if (!alert.read && (!target || alert.target === target)) {
      alert.read = true;
      changed = true;
    }
  }
  if (changed) notifyAlerts();
}

export function getAlerts(target?: AlertTarget): AppAlert[] {
  const all = [...alertStore].reverse();
  return target ? all.filter((a) => a.target === target) : all;
}

export function getUnreadCount(target?: AlertTarget): number {
  return alertStore.filter((a) => !a.read && (!target || a.target === target)).length;
}

export function getSmsRecords(): OutboundSmsRecord[] {
  return [...smsStore].reverse();
}

export function subscribeAlerts(
  listener: (alerts: AppAlert[]) => void,
  target?: AlertTarget
): () => void {
  const wrapped = (all: AppAlert[]) =>
    listener(target ? all.filter((a) => a.target === target) : all);
  alertListeners.add(wrapped);
  wrapped([...alertStore].reverse());
  return () => alertListeners.delete(wrapped);
}

export function subscribeSmsRecords(
  listener: (records: OutboundSmsRecord[]) => void
): () => void {
  smsListeners.add(listener);
  listener([...smsStore].reverse());
  return () => smsListeners.delete(listener);
}

// ── Seeded demo alert history ────────────────────────────────────────────────

let _seeded = false;

/**
 * Pre-populate the notification store with realistic demo alerts.
 * Call once at app startup (idempotent).
 */
export function seedDemoAlerts(): void {
  if (_seeded) return;
  _seeded = true;

  const now = Date.now();
  const MIN = 60_000;

  function addAlert(
    minutesAgo: number,
    params: Omit<AppAlert, 'id' | 'timestamp' | 'read'>
  ) {
    alertStore.push({
      ...params,
      id: nextId('alert'),
      timestamp: new Date(now - minutesAgo * MIN).toISOString(),
      read: minutesAgo > 90,
    });
  }

  function addSms(
    minutesAgo: number,
    params: Omit<OutboundSmsRecord, 'id' | 'timestamp' | 'status' | 'demoNote'>
  ) {
    smsStore.push({
      ...params,
      id: nextId('sms'),
      timestamp: new Date(now - minutesAgo * MIN).toISOString(),
      status: 'demo-pending',
      demoNote: 'DEMO ONLY — No real SMS sent.',
    });
  }

  // ── Marcus T. — High Risk, most recent ──────────────────────────────────
  addAlert(6, {
    severity: 'high',
    title: 'HIGH RISK — VOC Crisis Indicators',
    body: 'Marcus T. · SpO₂ 92%, HR 118 bpm. Multiple indicators suggest possible VOC episode. Immediate clinical review recommended.',
    target: 'hematologist',
    patientId: 'D10-SC-003',
    patientName: 'Marcus T.',
  });
  addSms(6, {
    to: '+1 (555) 000-0010',
    recipientRole: 'hematologist',
    recipientName: 'Dr. Rivera',
    body: '[D10 Clinical] HIGH RISK — Marcus T. (D10-SC-003): SpO₂ 92%, HR 118 bpm, Hb Trend ↓↓. Possible VOC crisis. Log in to D10 clinical dashboard immediately.',
    severity: 'high',
    patientId: 'D10-SC-003',
    patientName: 'Marcus T.',
  });

  addAlert(7, {
    severity: 'high',
    title: 'Critical Patient Alert — Marcus T.',
    body: 'Pain level 9/10. Wearable indicators showing significant deterioration. Hematologist has been contacted. Please stand by.',
    target: 'caregiver',
    patientId: 'D10-SC-003',
    patientName: 'Marcus T.',
  });
  addSms(7, {
    to: '+1 (555) 000-0003',
    recipientRole: 'caregiver',
    recipientName: 'Caregiver (T. Washington)',
    body: '[D10] CRITICAL — Marcus T. pain 9/10, SpO₂ 92%. Hematologist notified. Patient may need immediate care. Open D10 app for details.',
    severity: 'high',
    patientId: 'D10-SC-003',
    patientName: 'Marcus T.',
  });

  // ── Aisha M. — Rising Pain ───────────────────────────────────────────────
  addAlert(22, {
    severity: 'warning',
    title: 'Pain Alert — Aisha M.',
    body: 'Aisha M. pain level reached 7/10 — above caregiver threshold. VOC risk: Moderate. Please check in with patient.',
    target: 'caregiver',
    patientId: 'D10-SC-002',
    patientName: 'Aisha M.',
  });
  addSms(22, {
    to: '+1 (555) 000-0002',
    recipientRole: 'caregiver',
    recipientName: 'Caregiver (M. Morgan)',
    body: '[D10] Aisha M. pain 7/10 — above alert threshold. VOC risk: Moderate. Please check in. Open D10 app for details.',
    severity: 'warning',
    patientId: 'D10-SC-002',
    patientName: 'Aisha M.',
  });

  addAlert(25, {
    severity: 'warning',
    title: 'Pain Level Rising',
    body: "Your pain level is elevated today. Please rest, stay well-hydrated, and contact your caregiver if pain increases. You're not alone.",
    target: 'patient',
    patientId: 'D10-SC-002',
    patientName: 'Aisha M.',
  });

  // ── Priya K. — Missed Medications ───────────────────────────────────────
  addAlert(47, {
    severity: 'warning',
    title: 'Missed Medications — Priya K.',
    body: 'Priya K. has missed 3 scheduled doses today (Hydroxyurea, Folic Acid, Voxelotor). Caregiver follow-up recommended.',
    target: 'caregiver',
    patientId: 'D10-SC-004',
    patientName: 'Priya K.',
  });
  addSms(47, {
    to: '+1 (555) 000-0004',
    recipientRole: 'caregiver',
    recipientName: 'Caregiver (K. Sharma)',
    body: '[D10] Priya K. missed 3 doses today (Hydroxyurea, Folic Acid, Voxelotor). Please follow up. Open D10 app for details.',
    severity: 'warning',
    patientId: 'D10-SC-004',
    patientName: 'Priya K.',
  });

  // ── James L. — Wearable Offline ─────────────────────────────────────────
  addAlert(118, {
    severity: 'info',
    title: 'Wearable Offline — James L.',
    body: 'James L. wearable has been offline for over 18 hours. Last known status: stable. Manual check-in recommended.',
    target: 'caregiver',
    patientId: 'D10-SC-005',
    patientName: 'James L.',
  });

  // ── Solomon B. — Daily Summary ───────────────────────────────────────────
  addAlert(175, {
    severity: 'info',
    title: 'Daily Summary — Solomon B.',
    body: 'Solomon B. daily check-in complete. All indicators stable. Medications on track. Pain level 2/10. No action required.',
    target: 'caregiver',
    patientId: 'D10-SC-001',
    patientName: 'Solomon B.',
  });

  notifyAlerts();
  notifySms();
}
