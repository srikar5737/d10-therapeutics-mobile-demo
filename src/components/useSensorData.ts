/**
 * D-10 Therapeutics — Sensor Data Hook
 *
 * A simple hook to consume sensor data in React components.
 * This abstracts away the SensorAdapter and handles loading states.
 */

import { useState, useEffect } from 'react';
import { SensorAdapter } from '../data/SensorAdapter';
import { VitalReading, VocRiskStatus, TrendDataPoint } from '../data/mockData';

export function useVitals() {
  const [vitals, setVitals] = useState<VitalReading[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    SensorAdapter.getLatestVitals().then((data) => {
      setVitals(data);
      setLoading(false);
    });
  }, []);

  return { vitals, loading };
}

export function useRiskStatus() {
  const [risk, setRisk] = useState<VocRiskStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    SensorAdapter.getRiskAssessment().then((data) => {
      setRisk(data);
      setLoading(false);
    });
  }, []);

  return { risk, loading };
}

export function useTrends(metricId: string, range: 'day' | 'week' | 'month') {
  const [data, setData] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    SensorAdapter.getTrendHistory(metricId, range).then((points) => {
      setData(points);
      setLoading(false);
    });
  }, [metricId, range]);

  return { data, loading };
}
