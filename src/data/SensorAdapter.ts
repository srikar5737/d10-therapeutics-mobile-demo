/**
 * D-10 Therapeutics — Sensor Adapter System
 *
 * Mock and wearable/BLE data are routed through this file.
 * Keeps UI consumers unchanged while adding BLE-ready integration seams.
 *
 * ── Live vs fallback (single hybrid adapter) ────────────────────────────────
 * Default mode is BLE: the UI shows demo vitals/risk/trends until the watch
 * sends finger-on snapshots; then those metrics switch to live hardware.
 * Dev panel "mock" forces demo-only (legacy behavior).
 *
 * LIVE fields on every snapshot (see NormalizedWearableSnapshot):
 *   heartRate, spo2, hbTrendIndex, painLevel?, battery?, fingerDetected
 * FALLBACK/DEMO-only values served by the patient dashboard:
 *   temperatureF  (see FALLBACK_DEMO_VALUES in hardwareSnapshotAdapter)
 *
 * Hb Trend Index is the primary live "trend" metric; Hydration has been
 * retired from the live patient experience.
 */

import {
  VitalReading,
  VocRiskStatus,
  TrendDataPoint,
  mockVitals,
  mockRiskStatus,
  generateTrendPoints,
} from './mockData';
import {
  getWearableMetricValue,
  NormalizedWearableSnapshot,
  parseAndNormalizeWearableSnapshot,
  WearableSnapshotPayload,
  mapHardwareSnapshotToRisk,
  mapHardwareSnapshotToTrendHistory,
  mapHardwareSnapshotToVitals,
} from './hardwareSnapshotAdapter';
import { WearableConnectionState } from './telemetrySink';
import { createFirebaseTelemetrySink, LIVE_PATIENT_ID } from '../services/liveSyncService';
import { WearableBleService } from '../ble/wearableBleService';

export type SensorMode = 'mock' | 'hardwareSnapshot' | 'ble';

export interface SensorRuntimeState {
  mode: SensorMode;
  connectionState: WearableConnectionState;
  lastRawPayload: string;
  lastNormalizedPayload: string;
  lastError?: string;
  lastParseError?: string;
}

/**
 * The standard interface for all health sensor data.
 */
export interface ISensorAdapter {
  getLatestVitals(): Promise<VitalReading[]>;
  getRiskAssessment(): Promise<VocRiskStatus>;
  getTrendHistory(
    metricId: string,
    range: 'day' | 'week' | 'month'
  ): Promise<TrendDataPoint[]>;
}

/**
 * Current patient pain state as surfaced to the UI.
 *
 *  - `painLevel`  : 0–10 self-report value, or null if neither the wearable
 *                   nor any local entry has provided one yet.
 *  - `isLive`     : true when the value originated from a wearable payload
 *                   in the current session. False for mock mode and for any
 *                   local/manual fallback source.
 *  - `fingerDetected` : mirror of the latest snapshot, so the UI can suppress
 *                   a stale live value while the sensor is idle.
 */
export interface LivePainState {
  painLevel: number | null;
  isLive: boolean;
  fingerDetected: boolean;
}

/**
 * Full live-wearable vitals surface for the one live patient.
 *
 *  - `isLive`     : true only when in BLE/hardwareSnapshot mode AND
 *                   fingerDetected is true. When false, callers MUST fall back
 *                   to the seeded demo values for that patient.
 *  - `painLevel`  : 0–10 if the payload included it, otherwise null.
 *  - `battery`    : last known battery %, or null if never reported.
 *  - `lastUpdatedIso` : timestamp from the most recent payload.
 *
 * Hardware does NOT emit temperature — see FALLBACK_DEMO_VALUES in
 * hardwareSnapshotAdapter. Callers should clearly label temperature as a
 * demo/fallback value when rendering alongside these live fields.
 */
export interface LiveWearableVitals {
  isLive: boolean;
  fingerDetected: boolean;
  spo2: number;
  heartRate: number;
  hbTrendIndex: number;
  painLevel: number | null;
  battery: number | null;
  lastUpdatedIso: string;
}

const HISTORY_LIMIT = 120;

// Seed snapshot used only until the first real payload arrives. Values here
// are demo placeholders, NOT live hardware readings, and must never be shown
// as "current" vitals when a real finger-on BLE reading is active.
const fallbackSnapshot = parseAndNormalizeWearableSnapshot({
  deviceId: 'PicoW-BLE-001',
  timestamp: new Date().toISOString(),
  heartRate: 78,
  spo2: 97,
  hbTrendIndex: 80.0,   // 0–99.99 hardware scale, not g/dL
  battery: 88,
  fingerDetected: true,
} satisfies WearableSnapshotPayload);

// Display snapshot until the first packet: no finger so hybrid mode shows demo
// vitals (not the seeded numeric placeholders below).
const idleDisplaySnapshot = parseAndNormalizeWearableSnapshot({
  deviceId: 'PicoW-BLE-001',
  timestamp: new Date().toISOString(),
  heartRate: 0,
  spo2: 0,
  hbTrendIndex: 0,
  fingerDetected: false,
} satisfies WearableSnapshotPayload);

// Valid-reading history used for trend charts. Zero-value no-finger readings
// are NOT pushed here so they never corrupt trend data. Starts empty so web
// and offline clients use demo trends until a real BLE stream exists.
const snapshotHistory: NormalizedWearableSnapshot[] = [];

// Tracks the very latest snapshot (including fingerDetected=false) for UI display.
let lastReceivedSnapshot: NormalizedWearableSnapshot = idleDisplaySnapshot;

// Carries forward the last known battery level when hardware omits it.
let lastKnownBattery: number | undefined = fallbackSnapshot.battery;

/** True after at least one payload was ingested from the physical BLE link. */
let hasEverReceivedBlePayload = false;

const dataListeners = new Set<() => void>();
const runtimeListeners = new Set<(state: SensorRuntimeState) => void>();

let runtimeState: SensorRuntimeState = {
  // Default to BLE-capable hybrid mode: UI shows demo vitals until the watch
  // reports finger-on readings; iOS/Android auto-connect fills this path.
  mode: 'ble',
  connectionState: 'disconnected',
  lastRawPayload: '',
  lastNormalizedPayload: '',
};

// Firebase sink — throttled BLE-to-Firestore bridge for the real live patient.
// Falls back silently to no-op behavior when Firebase is not configured or
// when the device is offline. Mock mode is unaffected (sink only receives
// calls when BLE mode is active and fingerDetected is true).
const telemetrySink = createFirebaseTelemetrySink(LIVE_PATIENT_ID);

const bleService = new WearableBleService(
  (state, errorMessage) => {
    runtimeState = {
      ...runtimeState,
      connectionState: state,
      lastError: errorMessage,
    };
    telemetrySink.onConnectionStateChange(state);
    notifyRuntime();
  },
  (snapshot, rawPayload) => {
    ingestWearableSnapshot(snapshot, rawPayload, 'ble');
  },
  (parseErrorMessage) => {
    runtimeState = { ...runtimeState, lastParseError: parseErrorMessage };
    notifyRuntime();
  }
);

function getHistoryPointTarget(range: 'day' | 'week' | 'month') {
  return range === 'day' ? 6 : range === 'week' ? 7 : 30;
}

function notifyData() {
  dataListeners.forEach((listener) => listener());
}

function notifyRuntime() {
  runtimeListeners.forEach((listener) => listener(runtimeState));
}

function getLatestSnapshot(): NormalizedWearableSnapshot {
  return lastReceivedSnapshot;
}

type IngestSource = 'ble' | 'manual' | 'seed';

function isBleTransportReady(): boolean {
  return (
    runtimeState.mode !== 'ble' ||
    runtimeState.connectionState === 'connected'
  );
}

function isLiveReading(): boolean {
  if (runtimeState.mode === 'mock') {
    return false;
  }
  if (!isBleTransportReady()) {
    return false;
  }
  const snapshot = lastReceivedSnapshot;
  return (
    (runtimeState.mode === 'ble' ||
      runtimeState.mode === 'hardwareSnapshot') &&
    snapshot.fingerDetected
  );
}

function shouldUseBufferedTrendHistory(): boolean {
  return (
    runtimeState.mode === 'hardwareSnapshot' || hasEverReceivedBlePayload
  );
}

function ingestWearableSnapshot(
  snapshotInput: unknown,
  rawPayload?: string,
  source?: IngestSource
) {
  if (source === 'ble') {
    hasEverReceivedBlePayload = true;
  }

  let normalized = parseAndNormalizeWearableSnapshot(snapshotInput);

  // Battery carry-forward: if payload omits battery, preserve last known level.
  if (typeof normalized.battery === 'number') {
    lastKnownBattery = normalized.battery;
  } else if (typeof lastKnownBattery === 'number') {
    normalized = { ...normalized, battery: lastKnownBattery };
  }

  // Always update the display snapshot so UI reflects current finger state.
  lastReceivedSnapshot = normalized;

  // Only push valid readings to trend history.
  // fingerDetected=false readings are zero-value and must not corrupt charts.
  if (normalized.fingerDetected) {
    snapshotHistory.push(normalized);
    if (snapshotHistory.length > HISTORY_LIMIT) {
      snapshotHistory.splice(0, snapshotHistory.length - HISTORY_LIMIT);
    }
  }

  runtimeState = {
    ...runtimeState,
    lastRawPayload: rawPayload ?? JSON.stringify(normalized),
    lastNormalizedPayload: JSON.stringify(normalized, null, 2),
    lastError: undefined,
  };

  telemetrySink.onSnapshotReceived(normalized);
  notifyRuntime();
  notifyData();
}

function buildMockTrendHistory(
  metricId: string,
  range: 'day' | 'week' | 'month'
): TrendDataPoint[] {
  const days = range === 'day' ? 6 : range === 'week' ? 7 : 30;
  const byMetric: Record<string, { base: number; variance: number }> = {
    hemoglobin: { base: 80.5, variance: 3.0 },
    spo2: { base: 97.5, variance: 3 },
    heartRate: { base: 74, variance: 12 },
    temperature: { base: 98.4, variance: 1.2 },
  };
  const { base, variance } = byMetric[metricId] ?? {
    base: 98,
    variance: 2,
  };
  return generateTrendPoints(base, variance, days);
}

function buildHistoryTrendPoints(
  metricId: string,
  range: 'day' | 'week' | 'month'
): TrendDataPoint[] {
  const count = getHistoryPointTarget(range);
  const fingerOn = snapshotHistory.filter((s) => s.fingerDetected);
  const recent = fingerOn.slice(-count);

  if (recent.length < 3) {
    if (runtimeState.mode === 'hardwareSnapshot') {
      return mapHardwareSnapshotToTrendHistory(
        getLatestSnapshot(),
        metricId,
        range
      );
    }
    return buildMockTrendHistory(metricId, range);
  }

  return recent.map((snapshot) => {
    const date = new Date(snapshot.timestamp);
    const weekday = Number.isFinite(date.getTime())
      ? date.toLocaleDateString('en-US', { weekday: 'short' })
      : 'Today';

    return {
      date: weekday,
      value: Math.round(getWearableMetricValue(snapshot, metricId) * 10) / 10,
    };
  });
}

class MockSensorAdapter implements ISensorAdapter {
  async getLatestVitals(): Promise<VitalReading[]> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockVitals), 450);
    });
  }

  async getRiskAssessment(): Promise<VocRiskStatus> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockRiskStatus), 450);
    });
  }

  async getTrendHistory(
    metricId: string,
    range: 'day' | 'week' | 'month'
  ): Promise<TrendDataPoint[]> {
    const days = range === 'day' ? 6 : range === 'week' ? 7 : 30;
    return new Promise((resolve) => {
      setTimeout(() => {
        // hbTrendIndex is on the 0–99.99 hardware scale.
        const baseValue = metricId === 'hemoglobin' ? 80.0 : 98;
        const variance = metricId === 'hemoglobin' ? 3.0 : 2;
        resolve(generateTrendPoints(baseValue, variance, days));
      }, 700);
    });
  }
}

/**
 * Single adapter: demo vitals/risk/trends when the wearable is idle or
 * unavailable; live hardware values whenever finger-on readings exist.
 */
class HybridSensorAdapter implements ISensorAdapter {
  async getLatestVitals(): Promise<VitalReading[]> {
    if (runtimeState.mode === 'mock') {
      return mockAdapter.getLatestVitals();
    }
    if (isLiveReading()) {
      return mapHardwareSnapshotToVitals(getLatestSnapshot());
    }
    return mockVitals.map((v) => ({ ...v }));
  }

  async getRiskAssessment(): Promise<VocRiskStatus> {
    if (runtimeState.mode === 'mock') {
      return mockAdapter.getRiskAssessment();
    }
    if (isLiveReading()) {
      return mapHardwareSnapshotToRisk(getLatestSnapshot());
    }
    return mockRiskStatus;
  }

  async getTrendHistory(
    metricId: string,
    range: 'day' | 'week' | 'month'
  ): Promise<TrendDataPoint[]> {
    if (runtimeState.mode === 'mock') {
      return mockAdapter.getTrendHistory(metricId, range);
    }
    if (shouldUseBufferedTrendHistory()) {
      return buildHistoryTrendPoints(metricId, range);
    }
    return buildMockTrendHistory(metricId, range);
  }
}

const mockAdapter = new MockSensorAdapter();
const hybridAdapter = new HybridSensorAdapter();

export const SensorAdapter: ISensorAdapter = {
  getLatestVitals: () => hybridAdapter.getLatestVitals(),
  getRiskAssessment: () => hybridAdapter.getRiskAssessment(),
  getTrendHistory: (metricId, range) =>
    hybridAdapter.getTrendHistory(metricId, range),
};

export function subscribeSensorData(listener: () => void): () => void {
  dataListeners.add(listener);
  return () => {
    dataListeners.delete(listener);
  };
}

export function subscribeSensorRuntime(
  listener: (state: SensorRuntimeState) => void
): () => void {
  runtimeListeners.add(listener);
  listener(runtimeState);
  return () => {
    runtimeListeners.delete(listener);
  };
}

export function getSensorRuntimeState(): SensorRuntimeState {
  return runtimeState;
}

/**
 * Returns the latest self-reported pain level surfaced by the wearable.
 *
 * Live only when:
 *   (a) the sensor is in wearable mode (`ble` or `hardwareSnapshot`), AND
 *   (b) the most recent payload actually included `painLevel`, AND
 *   (c) `fingerDetected` is true (no stale zero readings).
 *
 * Otherwise `painLevel` is null and the UI should fall back to the patient's
 * manually logged value (PainTrackerScreen) or the demo patient record.
 */
/**
 * Returns the full set of wearable-backed vitals for the live patient.
 *
 * `isLive` is true only when:
 *   (a) the sensor is in BLE/hardwareSnapshot mode, AND
 *   (b) the most recent payload had fingerDetected=true.
 *
 * When `isLive` is false, the returned values are the current (possibly
 * zeroed or stale) snapshot and UI should fall back to the patient's seeded
 * demo vitals. Temperature is NEVER included here because the hardware does
 * not emit it — render it as a demo/fallback value.
 */
export function getLatestLiveWearableVitals(): LiveWearableVitals {
  const snapshot = lastReceivedSnapshot;
  const modeSupportsLive =
    runtimeState.mode === 'ble' || runtimeState.mode === 'hardwareSnapshot';
  const isLive =
    modeSupportsLive && isBleTransportReady() && snapshot.fingerDetected;

  return {
    isLive,
    fingerDetected: snapshot.fingerDetected,
    spo2: snapshot.spo2,
    heartRate: snapshot.heartRate,
    hbTrendIndex: snapshot.hbTrendIndex,
    painLevel:
      typeof snapshot.painLevel === 'number' ? snapshot.painLevel : null,
    battery: typeof snapshot.battery === 'number' ? snapshot.battery : null,
    lastUpdatedIso: snapshot.timestamp,
  };
}

export function getLatestPainState(): LivePainState {
  const snapshot = lastReceivedSnapshot;
  const modeSupportsLive =
    runtimeState.mode === 'ble' || runtimeState.mode === 'hardwareSnapshot';

  if (
    modeSupportsLive &&
    isBleTransportReady() &&
    snapshot.fingerDetected &&
    typeof snapshot.painLevel === 'number'
  ) {
    return {
      painLevel: snapshot.painLevel,
      isLive: true,
      fingerDetected: true,
    };
  }

  return {
    painLevel: null,
    isLive: false,
    fingerDetected: snapshot.fingerDetected,
  };
}

export function setSensorMode(mode: SensorMode) {
  runtimeState = {
    ...runtimeState,
    mode,
    lastError: undefined,
    connectionState: mode === 'ble' ? runtimeState.connectionState : 'disconnected',
  };

  if (mode === 'hardwareSnapshot') {
    ingestWearableSnapshot(
      fallbackSnapshot,
      JSON.stringify(fallbackSnapshot),
      'seed'
    );
  }

  if (mode !== 'ble') {
    bleService.disconnect().catch(() => {});
  }

  notifyRuntime();
  notifyData();
}

/**
 * Sample payloads for manual testing via the dev panel.
 *
 * These intentionally conform to the canonical contract in
 * `hardwareSnapshotAdapter.ts`. `fingerOn` is the same shape as
 * `EXAMPLE_WEARABLE_PAYLOAD_FINGER_ON`; `fingerOff` mirrors
 * `EXAMPLE_WEARABLE_PAYLOAD_FINGER_OFF`. `fingerOnLow` is an extra variant
 * (low Hb trend index, no battery field) used for demoing caution states.
 */
export const DYLAN_SAMPLE_PAYLOADS = {
  fingerOn: {
    heartRate: 72,
    spo2: 98,
    hbTrendIndex: 81.20,
    battery: 84,
    fingerDetected: true,
  },
  fingerOff: {
    heartRate: 0,
    spo2: 0,
    hbTrendIndex: 0.00,
    fingerDetected: false,
  },
  fingerOnLow: {
    heartRate: 68,
    spo2: 97,
    hbTrendIndex: 79.80,
    fingerDetected: true,
  },
} as const;

export function injectSimulatedWearablePayload(payload?: unknown) {
  const next = payload ?? {
    ...DYLAN_SAMPLE_PAYLOADS.fingerOn,
    timestamp: new Date().toISOString(),
  };
  const normalized = parseAndNormalizeWearableSnapshot(next);
  ingestWearableSnapshot(normalized, JSON.stringify(next), 'manual');
}

export async function connectToWearable() {
  runtimeState = { ...runtimeState, mode: 'ble', lastError: undefined };
  notifyRuntime();
  try {
    await bleService.scanConnectAndSubscribe();
  } catch (error) {
    runtimeState = {
      ...runtimeState,
      connectionState: 'error',
      lastError:
        error instanceof Error ? error.message : 'BLE connection failed.',
    };
    notifyRuntime();
  }
}

export async function disconnectWearable() {
  await bleService.disconnect();
}
