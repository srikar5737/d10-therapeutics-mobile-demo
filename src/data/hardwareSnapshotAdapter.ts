import { TrendDataPoint, VitalReading, VocRiskStatus } from './mockData';
import { HB_TREND_THRESHOLDS } from './escalationConfig';

/* ─────────────────────────────────────────────────────────────────────────────
 * D-10 Therapeutics — Wearable Payload Contract (SINGLE SOURCE OF TRUTH)
 *
 * Anything the mobile app receives from the PicoW-BLE wearable is described
 * here. There is exactly ONE incoming payload type (`WearableSnapshotPayload`),
 * ONE normalized app-internal snapshot (`NormalizedWearableSnapshot`), and ONE
 * parser/normalizer (`parseAndNormalizeWearableSnapshot`) — do not add others.
 *
 * ── Required vs optional fields ──────────────────────────────────────────────
 * A well-formed "finger on" payload SHOULD include:
 *   • heartRate       (number, bpm)
 *   • spo2            (number, %)
 *   • hbTrendIndex    (number, 0.00–99.99 relative index, NOT g/dL)
 *   • fingerDetected  (boolean, defaults to true if omitted)
 *
 * Optional fields the hardware MAY include:
 *   • painLevel   (number, 0–10 self-reported; undefined when not emitted)
 *   • battery     (number, 0–100; carried forward by SensorAdapter when missing)
 *   • deviceId    (string; falls back to 'PicoW-BLE-UNKNOWN')
 *   • timestamp   (ISO-8601 string; app generates receipt time if absent)
 *
 * Fields the hardware DOES NOT send (treated as demo/fallback in the app):
 *   • temperature → see FALLBACK_DEMO_VALUES.temperatureF
 *   • hydration   → retired; no live wearable metric
 *
 * ── Canonical example payloads ──────────────────────────────────────────────
 * See EXAMPLE_WEARABLE_PAYLOAD_FINGER_ON / _FINGER_OFF / _WITH_PAIN below.
 *
 * ── Safety guarantees of the parser ─────────────────────────────────────────
 *  • Unknown keys in the raw payload are SILENTLY IGNORED (no throw).
 *  • Non-numeric / missing required fields fall back to safe seed values so
 *    the app never crashes on a malformed BLE packet.
 *  • Values outside physical ranges are clamped (HR 35–220, SpO₂ 70–100,
 *    hbTrendIndex 0–100, painLevel 0–10, battery 0–100).
 *  • fingerDetected=false → heartRate/spo2/hbTrendIndex stay as the raw (zero)
 *    values so callers MUST gate on fingerDetected before treating them as
 *    physiological readings.
 *  • The hardware does not send a timestamp; app stamps on receipt.
 *
 * ── Integration guidance (for Dylan / future firmware changes) ──────────────
 *  • Send JSON over the BLE `latestSnapshot` characteristic exactly as shown
 *    in EXAMPLE_WEARABLE_PAYLOAD_FINGER_ON.
 *  • Adding a new field is safe: older app builds will ignore it until the
 *    contract here is extended and a normalizer branch is added.
 *  • Never repurpose an existing field's semantics — add a new named field.
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Raw shape of a BLE payload from the wearable. Every field is optional so a
 * partially-populated packet still parses successfully; see the parser for
 * field-by-field fallback behavior.
 */
export interface WearableSnapshotPayload {
  /** Optional device identifier. Falls back to 'PicoW-BLE-UNKNOWN'. */
  deviceId?: string;
  /** Optional ISO-8601 timestamp. App stamps receipt time if absent/invalid. */
  timestamp?: string;
  /** Beats per minute. Clamped to 35–220 when fingerDetected is true. */
  heartRate?: number;
  /** SpO₂ %. Clamped to 70–100 when fingerDetected is true. */
  spo2?: number;
  /** Relative Hb trend index, 0.00–99.99. Not absolute hemoglobin (g/dL). */
  hbTrendIndex?: number;
  /** Optional 0–10 self-reported pain. Undefined when the hardware omits it. */
  painLevel?: number;
  /** Optional battery %, 0–100. SensorAdapter carries forward the last value. */
  battery?: number;
  /** Defaults to true when omitted. False means sensor is idle; vitals are 0. */
  fingerDetected?: boolean;
}

/**
 * Normalized, app-internal wearable snapshot.
 *
 * Fields marked "live" are the primary wearable-driven fields and should be
 * the only metrics the patient dashboard treats as device-of-record vitals.
 * Everything else is intentionally fallback/demo data owned elsewhere in
 * the app (e.g. temperature, hydration, trends history) and must NOT be
 * confused with live hardware values.
 */
export interface NormalizedWearableSnapshot {
  deviceId: string;
  timestamp: string;
  /** LIVE — bpm from PicoW-BLE sensor. */
  heartRate: number;
  /** LIVE — blood oxygen % from PicoW-BLE sensor. */
  spo2: number;
  /** LIVE — relative Hb trend index from hardware, 0.00–99.99. Not absolute g/dL. */
  hbTrendIndex: number;
  /** LIVE (optional) — 0–10 self-reported pain if hardware forwards it. Undefined when not emitted. */
  painLevel?: number;
  /** LIVE (optional) — battery %. May be omitted; carried forward by SensorAdapter. */
  battery?: number;
  /** LIVE — true when a finger is placed on the sensor and values are valid. */
  fingerDetected: boolean;
}

/**
 * The complete set of fields that flow live from the wearable into this app.
 * Anything outside this list is fallback/demo and must be labeled as such.
 */
export const LIVE_WEARABLE_FIELDS = [
  'heartRate',
  'spo2',
  'hbTrendIndex',
  'painLevel',
  'battery',
  'fingerDetected',
] as const;

/**
 * Fields the hardware SHOULD include on every "finger on" sample. A payload
 * missing these is still parsed, but the normalizer seeds safe defaults and
 * the result must NOT be treated as a live clinical reading.
 */
export const REQUIRED_WEARABLE_FIELDS = [
  'heartRate',
  'spo2',
  'hbTrendIndex',
  'fingerDetected',
] as const;

/**
 * Fields the hardware MAY include. All are safe to omit — the parser/consumer
 * has explicit fallback behavior for each.
 */
export const OPTIONAL_WEARABLE_FIELDS = [
  'painLevel',
  'battery',
  'deviceId',
  'timestamp',
] as const;

/**
 * Canonical example payloads. These are the exact shapes Dylan's firmware
 * should emit. Kept as plain constants so they can be imported by dev tools,
 * tests, or the dev panel without drifting from the contract in this file.
 */
export const EXAMPLE_WEARABLE_PAYLOAD_FINGER_ON: WearableSnapshotPayload = {
  heartRate: 72,
  spo2: 98,
  hbTrendIndex: 81.2,
  battery: 84,
  fingerDetected: true,
};

export const EXAMPLE_WEARABLE_PAYLOAD_FINGER_OFF: WearableSnapshotPayload = {
  heartRate: 0,
  spo2: 0,
  hbTrendIndex: 0.0,
  fingerDetected: false,
};

export const EXAMPLE_WEARABLE_PAYLOAD_WITH_PAIN: WearableSnapshotPayload = {
  heartRate: 68,
  spo2: 97,
  hbTrendIndex: 79.8,
  painLevel: 4,
  fingerDetected: true,
};

/**
 * Demo/fallback values used by the UI when the wearable does not (or cannot)
 * provide a metric. These are NOT live data — they are here so the dashboard
 * remains demo-safe. Treat any consumer of these values as synthetic.
 */
export const FALLBACK_DEMO_VALUES = {
  /** Hardware does not send temperature today. Fixed demo value only. */
  temperatureF: 98.6,
} as const;

/**
 * Defaults used only when a BLE payload is malformed AND we still need to
 * produce a finite NormalizedWearableSnapshot (e.g. first-time scaffolding).
 * These are NOT displayed-as-live values; they seed the local buffer only.
 */
const FALLBACKS = {
  deviceId: 'PicoW-BLE-UNKNOWN',
  heartRate: 74,
  spo2: 97,
  hbTrendIndex: 80.0,
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function toFiniteOrFallback(value: number | undefined, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return value;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function decodeBytePayload(payload: Uint8Array): string {
  return new TextDecoder().decode(payload);
}

function parseJsonObject(text: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, unknown>;
    }
  } catch (_error) {
    // Ignore parse errors and fall back to defaults.
  }
  return {};
}

function toOptionalFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toBoolean(value: unknown, defaultValue: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return defaultValue;
}

/**
 * Single parser/normalizer for raw device payloads.
 *
 * ── Accepts ─────────────────────────────────────────────────────────────────
 *   • a JSON string (from BLE characteristic value)
 *   • a Uint8Array or ArrayBuffer of UTF-8 bytes
 *   • a plain object already matching WearableSnapshotPayload
 *   • anything else — returns a safe seeded snapshot
 *
 * ── Safety guarantees ───────────────────────────────────────────────────────
 *   1. Never throws. Malformed JSON → returns a seeded snapshot.
 *   2. Unknown / unsupported keys in the raw payload are SILENTLY IGNORED.
 *      Hardware can send extra fields without breaking the app; they will
 *      simply not appear on the normalized snapshot.
 *   3. Non-number values for numeric fields are coerced if possible
 *      (e.g. "97" → 97) and otherwise dropped to the field's fallback.
 *   4. Out-of-range values are CLAMPED to physical ranges
 *      (HR 35–220, SpO₂ 70–100, hbTrendIndex 0–100, painLevel 0–10,
 *      battery 0–100). painLevel is rounded to the nearest integer.
 *   5. When fingerDetected is false, heartRate/spo2/hbTrendIndex are preserved
 *      as the raw (typically zero) values. Callers MUST gate on fingerDetected
 *      before treating them as physiological readings.
 *   6. timestamp falls back to `new Date().toISOString()` at receipt time when
 *      hardware omits it or sends an unparseable string.
 *
 * ── Missing painLevel ───────────────────────────────────────────────────────
 * If the payload does not include `painLevel`, the normalized snapshot omits
 * the field entirely (undefined). Downstream consumers (`getLatestPainState`,
 * `useLivePain`, `livePainMonitor`) then report `isLive: false` and the UI
 * falls back to the patient's last manual self-report / seeded demo value.
 * BLE never overwrites a self-reported pain value with null.
 *
 * ── Missing temperature / hydration ─────────────────────────────────────────
 * Hardware does not emit these. The normalized snapshot does not carry them.
 * UI consumers render `FALLBACK_DEMO_VALUES.temperatureF` as a demo/fallback
 * value, clearly tagged in the dashboards. Hydration has been retired as a
 * live metric entirely.
 */
export function parseAndNormalizeWearableSnapshot(
  payload: unknown
): NormalizedWearableSnapshot {
  const raw = (() => {
    if (typeof payload === 'string') {
      return parseJsonObject(payload);
    }

    if (payload instanceof Uint8Array) {
      return parseJsonObject(decodeBytePayload(payload));
    }

    if (payload instanceof ArrayBuffer) {
      return parseJsonObject(decodeBytePayload(new Uint8Array(payload)));
    }

    if (payload !== null && typeof payload === 'object') {
      return payload as Record<string, unknown>;
    }

    return {};
  })();

  const fingerDetected = toBoolean(raw.fingerDetected, true);

  // Timestamp: hardware doesn't send one — use current time or fallback.
  const timestampCandidate = toOptionalString(raw.timestamp);
  const timestamp =
    timestampCandidate && Number.isFinite(Date.parse(timestampCandidate))
      ? timestampCandidate
      : new Date().toISOString();

  const batteryCandidate = toOptionalFiniteNumber(raw.battery);
  const painCandidate = toOptionalFiniteNumber(raw.painLevel);

  // When finger is not detected, heartRate/spo2/hbTrendIndex will be 0.
  // We preserve them as-is so callers can inspect them, but callers MUST
  // check fingerDetected before displaying or using these values.
  const heartRate = fingerDetected
    ? clamp(
        toFiniteOrFallback(
          toOptionalFiniteNumber(raw.heartRate),
          FALLBACKS.heartRate
        ),
        35,
        220
      )
    : toFiniteOrFallback(toOptionalFiniteNumber(raw.heartRate), 0);

  const spo2 = fingerDetected
    ? clamp(
        toFiniteOrFallback(
          toOptionalFiniteNumber(raw.spo2),
          FALLBACKS.spo2
        ),
        70,
        100
      )
    : toFiniteOrFallback(toOptionalFiniteNumber(raw.spo2), 0);

  // hbTrendIndex is on a 0.00–99.99 scale from hardware.
  const hbTrendIndex = fingerDetected
    ? clamp(
        toFiniteOrFallback(
          toOptionalFiniteNumber(raw.hbTrendIndex),
          FALLBACKS.hbTrendIndex
        ),
        0.0,
        100.0
      )
    : toFiniteOrFallback(toOptionalFiniteNumber(raw.hbTrendIndex), 0);

  return {
    deviceId: toOptionalString(raw.deviceId) ?? FALLBACKS.deviceId,
    timestamp,
    heartRate,
    spo2,
    hbTrendIndex,
    painLevel:
      typeof painCandidate === 'number'
        ? clamp(Math.round(painCandidate), 0, 10)
        : undefined,
    battery:
      typeof batteryCandidate === 'number'
        ? clamp(batteryCandidate, 0, 100)
        : undefined,
    fingerDetected,
  };
}

/**
 * Backward-compatible alias. New code should call
 * `parseAndNormalizeWearableSnapshot` directly.
 */
export const normalizeWearableSnapshotPayload = parseAndNormalizeWearableSnapshot;

/**
 * Returns the metric value for a given snapshot.
 * For 'hemoglobin', returns hbTrendIndex directly (not a derived g/dL).
 * 'temperature' is a fallback/demo value — the hardware does not emit it.
 */
export function getWearableMetricValue(
  snapshot: NormalizedWearableSnapshot,
  metricId: string
): number {
  if (metricId === 'hemoglobin') {
    return snapshot.hbTrendIndex;
  }
  if (metricId === 'heartRate') {
    return snapshot.heartRate;
  }
  if (metricId === 'temperature') {
    return FALLBACK_DEMO_VALUES.temperatureF;
  }
  return snapshot.spo2;
}

function getVitalStatus(value: number, min: number, max: number): VitalReading['status'] {
  if (value < min || value > max) {
    return 'alert';
  }
  const lowerCaution = min + (max - min) * 0.1;
  const upperCaution = max - (max - min) * 0.1;
  if (value < lowerCaution || value > upperCaution) {
    return 'caution';
  }
  return 'optimal';
}

/**
 * Maps an hbTrendIndex (0–99.99, higher=better) to a vital-card status.
 * Uses the same thresholds as the escalation config so UI + alerting agree.
 */
function getHbTrendStatus(value: number): VitalReading['status'] {
  if (value <= HB_TREND_THRESHOLDS.caregiverAlert) {
    return 'alert';
  }
  if (value <= HB_TREND_THRESHOLDS.patientWarning) {
    return 'caution';
  }
  return 'optimal';
}

export function mapHardwareSnapshotToVitals(
  snapshot: NormalizedWearableSnapshot
): VitalReading[] {
  const noReading = !snapshot.fingerDetected;

  // LIVE cards (driven by real BLE values). When fingerDetected=false the
  // hardware sends zeros, so we deliberately display a placeholder instead of
  // treating 0 as a clinical value.
  const vitals: VitalReading[] = [
    {
      label: 'Blood Oxygen',
      value: noReading ? '—' : Math.round(snapshot.spo2),
      unit: noReading ? '' : '%',
      icon: 'water-outline',
      status: noReading ? 'optimal' : getVitalStatus(snapshot.spo2, 95, 100),
      normalRange: '95–100',
    },
    {
      label: 'Heart Rate',
      value: noReading ? '—' : Math.round(snapshot.heartRate),
      unit: noReading ? '' : 'bpm',
      icon: 'heart-pulse',
      status: noReading ? 'optimal' : getVitalStatus(snapshot.heartRate, 60, 100),
      normalRange: '60–100',
    },
    // FALLBACK/DEMO card — hardware does not emit temperature.
    // Kept on the dashboard for demo completeness only.
    {
      label: 'Temperature',
      value: FALLBACK_DEMO_VALUES.temperatureF,
      unit: '°F',
      icon: 'thermometer',
      status: 'optimal',
      normalRange: '97.8–99.1',
    },
    // LIVE card — Hb Trend Index replaces the old Hydration card as the
    // primary wearable-driven metric alongside SpO₂ and Heart Rate.
    {
      label: noReading ? 'No Reading' : 'Hb Trend',
      value: noReading ? '—' : snapshot.hbTrendIndex.toFixed(1),
      unit: noReading ? '' : 'idx',
      icon: noReading ? 'hand-wave-outline' : 'water-percent',
      status: noReading ? 'optimal' : getHbTrendStatus(snapshot.hbTrendIndex),
      normalRange: '75–99',
    },
  ];

  if (typeof snapshot.battery === 'number') {
    vitals.push({
      label: 'Battery',
      value: Math.round(snapshot.battery),
      unit: '%',
      icon: 'battery-medium',
      status:
        snapshot.battery < 20
          ? 'alert'
          : snapshot.battery < 40
          ? 'caution'
          : 'optimal',
    });
  }

  return vitals;
}

export function mapHardwareSnapshotToRisk(
  snapshot: NormalizedWearableSnapshot
): VocRiskStatus {
  // No finger on sensor — do not derive risk from zero values.
  if (!snapshot.fingerDetected) {
    return {
      level: 'low',
      label: 'NO DATA',
      description:
        'Place finger on sensor for live VOC risk assessment.',
    };
  }

  if (snapshot.spo2 <= 93 || snapshot.heartRate >= 115) {
    return {
      level: 'high',
      label: 'HIGH RISK',
      description:
        'One or more indicators are outside safe thresholds. Prompt clinical follow-up is recommended.',
    };
  }

  if (snapshot.spo2 <= 95 || snapshot.heartRate >= 95) {
    return {
      level: 'moderate',
      label: 'MODERATE RISK',
      description:
        'Mild drift detected in current wearable indicators. Continue hydration protocol and monitor closely.',
    };
  }

  return {
    level: 'low',
    label: 'LOW RISK',
    description:
      'Current wearable indicators appear stable. Continue routine hydration and medication guidance.',
  };
}

export function mapHardwareSnapshotToTrendHistory(
  snapshot: NormalizedWearableSnapshot,
  metricId: string,
  range: 'day' | 'week' | 'month'
): TrendDataPoint[] {
  const points = range === 'day' ? 6 : range === 'week' ? 7 : 30;
  const parsedTimestamp = Date.parse(snapshot.timestamp);
  const minuteSeed = Number.isFinite(parsedTimestamp)
    ? new Date(parsedTimestamp).getUTCMinutes() % 5
    : 0;

  const pattern = [-0.6, -0.3, -0.1, 0, 0.2, 0.4, 0.1];

  const baseByMetric: Record<string, number> = {
    hemoglobin: getWearableMetricValue(snapshot, 'hemoglobin'),
    spo2: getWearableMetricValue(snapshot, 'spo2'),
    heartRate: getWearableMetricValue(snapshot, 'heartRate'),
    temperature: getWearableMetricValue(snapshot, 'temperature'),
  };

  const base = baseByMetric[metricId] ?? baseByMetric.spo2;

  // Scale variation to match each metric's natural range.
  // hbTrendIndex is 0–100 scale, so use ~±3 variation to look realistic.
  const scaleByMetric: Record<string, number> = {
    hemoglobin: 3.0,
    spo2: 0.8,
    heartRate: 2.8,
    temperature: 0.18,
  };
  const scale = scaleByMetric[metricId] ?? 1;

  return Array.from({ length: points }, (_, i) => {
    const dayIndex = i % DAY_LABELS.length;
    const wave = pattern[(i + minuteSeed) % pattern.length];
    const raw = base + wave * scale;
    const value = Math.round(raw * 10) / 10;

    return {
      date: DAY_LABELS[dayIndex],
      value,
    };
  });
}
