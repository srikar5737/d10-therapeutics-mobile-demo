/**
 * D-10 Therapeutics — Sensor Adapter System
 *
 * This file defines the interface for health data and the mock implementation
 * used for the demo. When real hardware (BLE/Watch) is ready, a new
 * implementation of `ISensorAdapter` can be created and swapped in.
 */

import {
  VitalReading,
  VocRiskStatus,
  TrendDataPoint,
  mockVitals,
  mockRiskStatus,
  generateTrendPoints,
} from './mockData';

// ── Interface ───────────────────────────────────────────

/**
 * The standard interface for all health sensor data.
 * Future BLE or API-based adapters must implement these methods.
 */
export interface ISensorAdapter {
  /** Returns the most recent snapshot of vitals */
  getLatestVitals(): Promise<VitalReading[]>;

  /** Returns the calculated VOC risk assessment */
  getRiskAssessment(): Promise<VocRiskStatus>;

  /** Returns historical data points for a specific metric */
  getTrendHistory(
    metricId: string,
    range: 'day' | 'week' | 'month'
  ): Promise<TrendDataPoint[]>;
}

// ── Mock Implementation ─────────────────────────────────

/**
 * Current implementation using local mock data.
 * Simulates network/sensor delay with a simple timeout.
 */
class MockSensorAdapter implements ISensorAdapter {
  async getLatestVitals(): Promise<VitalReading[]> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockVitals), 500);
    });
  }

  async getRiskAssessment(): Promise<VocRiskStatus> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockRiskStatus), 500);
    });
  }

  async getTrendHistory(
    metricId: string,
    range: 'day' | 'week' | 'month'
  ): Promise<TrendDataPoint[]> {
    // Determine number of points based on range
    const days = range === 'day' ? 1 : range === 'week' ? 7 : 30;

    return new Promise((resolve) => {
      setTimeout(() => {
        // We use the generator from mockData to keep things believable
        const baseValue = metricId === 'hemoglobin' ? 9.2 : 98;
        const variance = metricId === 'hemoglobin' ? 0.8 : 2;
        resolve(generateTrendPoints(baseValue, variance, days));
      }, 800);
    });
  }
}

// ── Plugin Point ────────────────────────────────────────

/**
 * The global sensor data provider.
 * CHANGE THIS LINE to swap from Mock to Real BLE later.
 */
export const SensorAdapter: ISensorAdapter = new MockSensorAdapter();
