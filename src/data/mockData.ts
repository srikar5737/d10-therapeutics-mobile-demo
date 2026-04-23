/**
 * D-10 Therapeutics — Mock Data Layer
 *
 * Realistic mocked sensor values for demo purposes.
 * Designed with a future-facing adapter interface so a real
 * wearable data source can be swapped in later.
 */

// ── Types ──────────────────────────────────────────────

export type RiskLevel = 'low' | 'moderate' | 'high';
export type CrisisSeverity = 'mild' | 'moderate' | 'severe';
export type MedStatus = 'taken' | 'pending' | 'skipped';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export interface VitalReading {
  label: string;
  value: number | string;
  unit: string;
  icon: string; // MaterialCommunityIcons name
  status: 'optimal' | 'caution' | 'alert';
  normalRange?: string;
}

export interface VocRiskStatus {
  level: RiskLevel;
  label: string;
  description: string;
}

export interface TrendDataPoint {
  date: string;
  value: number;
}

export interface TrendMetric {
  id: string;
  label: string;
  unit: string;
  color: string;
  data: TrendDataPoint[];
  currentValue: number;
  change: string;
  changeDirection: 'up' | 'down' | 'stable';
}

export interface CrisisEvent {
  id: string;
  dateRange: string;
  duration: string;
  severity: CrisisSeverity;
  location: string; // care location
  triggers: string[];
  notes: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  instructions: string;
  timeOfDay: TimeOfDay;
  status: MedStatus;
  takenAt?: string;
  icon: string;
}

export interface PainEntry {
  id: string;
  level: number;
  symptoms: string[];
  timestamp: string;
}

// ── Adapter Interface (future wearable integration) ────

export interface SensorDataAdapter {
  getVitals(): Promise<VitalReading[]>;
  getRiskStatus(): Promise<VocRiskStatus>;
  getTrendData(metricId: string, range: 'day' | 'week' | 'month'): Promise<TrendDataPoint[]>;
}

// ── Mock Data ──────────────────────────────────────────

/**
 * Mock vitals mirror the live wearable shape so mock mode and BLE mode show
 * the same cards. Blood Oxygen / Heart Rate / Hb Trend represent the LIVE
 * wearable fields; Temperature is a fallback/demo-only card because the
 * hardware does not emit temperature today.
 */
export const mockVitals: VitalReading[] = [
  {
    label: 'Blood Oxygen',
    value: 98,
    unit: '%',
    icon: 'water-outline',
    status: 'optimal',
    normalRange: '95–100',
  },
  {
    label: 'Heart Rate',
    value: 72,
    unit: 'bpm',
    icon: 'heart-pulse',
    status: 'optimal',
    normalRange: '60–100',
  },
  {
    label: 'Temperature',
    value: 98.6,
    unit: '°F',
    icon: 'thermometer',
    status: 'optimal',
    normalRange: '97.8–99.1',
  },
  {
    label: 'Hb Trend',
    value: '81.2',
    unit: 'idx',
    icon: 'water-percent',
    status: 'optimal',
    normalRange: '75–99',
  },
];

export const mockRiskStatus: VocRiskStatus = {
  level: 'low',
  label: 'LOW RISK',
  description:
    'All primary indicators are within optimal ranges. Continue hydration protocol.',
};

export const lastSyncedTime = 'Today, 10:42 AM';

export function generateTrendPoints(
  base: number,
  variance: number,
  days: number
): TrendDataPoint[] {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const points: TrendDataPoint[] = [];
  for (let i = 0; i < days; i++) {
    const noise = (Math.random() - 0.5) * variance;
    points.push({
      date: labels[i % 7],
      value: Math.round((base + noise) * 10) / 10,
    });
  }
  return points;
}

export const mockTrends: TrendMetric[] = [
  {
    id: 'hemoglobin',
    label: 'Hb Trend',
    unit: 'idx',
    color: '#7b3200',
    data: generateTrendPoints(80.5, 3.0, 7),
    currentValue: 80.5,
    change: '-1.2 from last week',
    changeDirection: 'down',
  },
  {
    id: 'spo2',
    label: 'SpO₂ Level',
    unit: '%',
    color: '#00488d',
    data: generateTrendPoints(97.5, 3, 7),
    currentValue: 98,
    change: 'Stable',
    changeDirection: 'stable',
  },
  {
    id: 'heartRate',
    label: 'Heart Rate',
    unit: 'bpm',
    color: '#ba1a1a',
    data: generateTrendPoints(74, 12, 7),
    currentValue: 72,
    change: '-3 from last week',
    changeDirection: 'down',
  },
  {
    id: 'temperature',
    label: 'Temperature',
    unit: '°F',
    color: '#a04401',
    data: generateTrendPoints(98.4, 1.2, 7),
    currentValue: 98.6,
    change: '+0.2 from last week',
    changeDirection: 'up',
  },
];

export const mockCrisisEvents: CrisisEvent[] = [
  {
    id: '1',
    dateRange: 'Oct 12 – Oct 15, 2023',
    duration: '72 hours',
    severity: 'severe',
    location: 'Hospital Admission',
    triggers: ['Infection', 'Cold Weather'],
    notes:
      'Admitted to ER due to acute pain crisis unresponsive to at-home management. Treated with IV fluids and pain protocols.',
  },
  {
    id: '2',
    dateRange: 'Aug 05 – Aug 06, 2023',
    duration: '36 hours',
    severity: 'moderate',
    location: 'At-Home Care',
    triggers: ['Dehydration', 'Overexertion'],
    notes:
      'Managed at home with increased oral fluids and prescribed rescue medication regimen. Pain localized to lower back.',
  },
  {
    id: '3',
    dateRange: 'May 22, 2023',
    duration: '12 hours',
    severity: 'mild',
    location: 'At-Home Care',
    triggers: ['Stress'],
    notes: '',
  },
  {
    id: '4',
    dateRange: 'Feb 03, 2023',
    duration: '48 hours',
    severity: 'moderate',
    location: 'Urgent Care Visit',
    triggers: ['Cold Weather', 'Dehydration'],
    notes:
      'Visited urgent care for pain management. Received fluids and discharged same day.',
  },
];

export const mockMedications: Medication[] = [
  {
    id: '1',
    name: 'Hydroxyurea',
    dosage: '500mg',
    instructions: 'Take with food',
    timeOfDay: 'morning',
    status: 'pending',
    icon: 'pill',
  },
  {
    id: '2',
    name: 'Folic Acid',
    dosage: '1mg',
    instructions: '',
    timeOfDay: 'morning',
    status: 'taken',
    takenAt: '8:00 AM',
    icon: 'pill',
  },
  {
    id: '3',
    name: 'Ibuprofen',
    dosage: '400mg',
    instructions: 'As needed for pain',
    timeOfDay: 'afternoon',
    status: 'pending',
    icon: 'medical-bag',
  },
  {
    id: '4',
    name: 'Hydroxyurea',
    dosage: '500mg',
    instructions: 'Take with food',
    timeOfDay: 'evening',
    status: 'pending',
    icon: 'pill',
  },
];

export const symptomOptions = [
  'Fatigue',
  'Joint Stiffness',
  'Swelling',
  'Nausea',
  'Headache',
  'Shortness of Breath',
  'Dizziness',
  'Chest Pain',
];

export const primaryTriggers = [
  'Cold Weather',
  'Stress',
  'Dehydration',
  'Overexertion',
];
