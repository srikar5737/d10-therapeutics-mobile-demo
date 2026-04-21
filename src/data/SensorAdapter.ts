/**
 * D-10 Therapeutics — Sensor Adapter System
 *
 * Mock and wearable/BLE data are routed through this file.
 * Keeps UI consumers unchanged while adding BLE-ready integration seams.
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
import { NoopTelemetrySink, WearableConnectionState } from './telemetrySink';
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

const HISTORY_LIMIT = 120;

const fallbackSnapshot = parseAndNormalizeWearableSnapshot({
  deviceId: 'PicoW-BLE-001',
  timestamp: new Date().toISOString(),
  heartRate: 78,
  spo2: 97,
  hbTrendIndex: 80.0,   // 0–99.99 scale
  battery: 88,
  fingerDetected: true,
} satisfies WearableSnapshotPayload);

// Valid-reading history used for trend charts. Zero-value no-finger readings
// are NOT pushed here so they never corrupt trend data.
const snapshotHistory: NormalizedWearableSnapshot[] = [fallbackSnapshot];

// Tracks the very latest snapshot (including fingerDetected=false) for UI display.
let lastReceivedSnapshot: NormalizedWearableSnapshot = fallbackSnapshot;

// Carries forward the last known battery level when hardware omits it.
let lastKnownBattery: number | undefined = fallbackSnapshot.battery;

const dataListeners = new Set<() => void>();
const runtimeListeners = new Set<(state: SensorRuntimeState) => void>();

let runtimeState: SensorRuntimeState = {
  mode: 'mock',
  connectionState: 'disconnected',
  lastRawPayload: '',
  lastNormalizedPayload: '',
};

const telemetrySink = NoopTelemetrySink;

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
    ingestWearableSnapshot(snapshot, rawPayload);
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

function ingestWearableSnapshot(snapshotInput: unknown, rawPayload?: string) {
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

function buildHistoryTrendPoints(
  metricId: string,
  range: 'day' | 'week' | 'month'
): TrendDataPoint[] {
  const count = getHistoryPointTarget(range);
  // Use only valid-reading history for trends.
  const recent = snapshotHistory.slice(-count);

  if (recent.length < 3) {
    return mapHardwareSnapshotToTrendHistory(
      snapshotHistory[snapshotHistory.length - 1] ?? fallbackSnapshot,
      metricId,
      range
    );
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

class WearableSnapshotSensorAdapter implements ISensorAdapter {
  async getLatestVitals(): Promise<VitalReading[]> {
    return mapHardwareSnapshotToVitals(getLatestSnapshot());
  }

  async getRiskAssessment(): Promise<VocRiskStatus> {
    return mapHardwareSnapshotToRisk(getLatestSnapshot());
  }

  async getTrendHistory(
    metricId: string,
    range: 'day' | 'week' | 'month'
  ): Promise<TrendDataPoint[]> {
    return buildHistoryTrendPoints(metricId, range);
  }
}

const mockAdapter = new MockSensorAdapter();
const wearableAdapter = new WearableSnapshotSensorAdapter();

function getActiveAdapter(): ISensorAdapter {
  return runtimeState.mode === 'mock' ? mockAdapter : wearableAdapter;
}

export const SensorAdapter: ISensorAdapter = {
  getLatestVitals: () => getActiveAdapter().getLatestVitals(),
  getRiskAssessment: () => getActiveAdapter().getRiskAssessment(),
  getTrendHistory: (metricId, range) =>
    getActiveAdapter().getTrendHistory(metricId, range),
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

export function setSensorMode(mode: SensorMode) {
  runtimeState = {
    ...runtimeState,
    mode,
    lastError: undefined,
    connectionState: mode === 'ble' ? runtimeState.connectionState : 'disconnected',
  };

  if (mode === 'hardwareSnapshot') {
    ingestWearableSnapshot(fallbackSnapshot, JSON.stringify(fallbackSnapshot));
  }

  if (mode !== 'ble') {
    bleService.disconnect().catch(() => {});
  }

  notifyRuntime();
  notifyData();
}

/**
 * Dylan's real sample payloads for quick manual testing via the dev panel.
 * Values match the confirmed hardware contract exactly.
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
  ingestWearableSnapshot(normalized, JSON.stringify(next));
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
