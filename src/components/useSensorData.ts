/**
 * D-10 Therapeutics — Sensor Data Hook
 *
 * A simple hook to consume sensor data in React components.
 * This abstracts away the SensorAdapter and handles loading states.
 *
 * `loading` is only true on the first fetch per hook instance so that
 * incoming live BLE snapshots don't cause the UI to flash back to a
 * loading state on every update.
 */

import { useState, useEffect, useRef } from 'react';
import {
  connectToWearable,
  disconnectWearable,
  getSensorRuntimeState,
  injectSimulatedWearablePayload,
  SensorAdapter,
  SensorMode,
  SensorRuntimeState,
  setSensorMode,
  subscribeSensorData,
  subscribeSensorRuntime,
} from '../data/SensorAdapter';
import { VitalReading, VocRiskStatus, TrendDataPoint } from '../data/mockData';

export function useVitals() {
  const [vitals, setVitals] = useState<VitalReading[]>([]);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const load = () => {
      if (!loadedRef.current) {
        setLoading(true);
      }
      SensorAdapter.getLatestVitals().then((data) => {
        if (!mounted) {
          return;
        }
        setVitals(data);
        loadedRef.current = true;
        setLoading(false);
      });
    };

    load();
    const unsubscribe = subscribeSensorData(load);

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return { vitals, loading };
}

export function useRiskStatus() {
  const [risk, setRisk] = useState<VocRiskStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const load = () => {
      if (!loadedRef.current) {
        setLoading(true);
      }
      SensorAdapter.getRiskAssessment().then((data) => {
        if (!mounted) {
          return;
        }
        setRisk(data);
        loadedRef.current = true;
        setLoading(false);
      });
    };

    load();
    const unsubscribe = subscribeSensorData(load);

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return { risk, loading };
}

export function useTrends(metricId: string, range: 'day' | 'week' | 'month') {
  const [data, setData] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    loadedRef.current = false;

    const load = () => {
      if (!loadedRef.current) {
        setLoading(true);
      }
      SensorAdapter.getTrendHistory(metricId, range).then((points) => {
        if (!mounted) {
          return;
        }
        setData(points);
        loadedRef.current = true;
        setLoading(false);
      });
    };

    load();
    const unsubscribe = subscribeSensorData(load);

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [metricId, range]);

  return { data, loading };
}

export function useWearableRuntime() {
  const [runtime, setRuntime] = useState<SensorRuntimeState>(getSensorRuntimeState());

  useEffect(() => {
    const unsubscribe = subscribeSensorRuntime(setRuntime);
    return () => {
      unsubscribe();
    };
  }, []);

  return {
    runtime,
    setMode: (mode: SensorMode) => setSensorMode(mode),
    connect: () => connectToWearable(),
    disconnect: () => disconnectWearable(),
    injectSamplePayload: (payload?: unknown) => injectSimulatedWearablePayload(payload),
  };
}
