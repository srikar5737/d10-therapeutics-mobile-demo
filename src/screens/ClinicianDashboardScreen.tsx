import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import {
  Colors,
  FontSize,
  FontWeight,
  Radius,
  Shadows,
  Spacing,
} from '../theme/tokens';
import {
  useRiskStatus,
  useTrends,
  useVitals,
  useWearableRuntime,
} from '../components/useSensorData';
import { VitalCard } from '../components/VitalCard';
import { WearableConnectionPill } from '../components/WearableConnectionPill';
import { WearableDevPanel } from '../components/WearableDevPanel';
import {
  mockCrisisEvents,
  mockMedications,
  VitalReading,
} from '../data/mockData';
import { DemoRole, ROLE_LABELS, signOutDemoSession } from '../state/session';

interface Props {
  role: Exclude<DemoRole, 'patient'>;
  email: string;
}

const PATIENT = {
  name: 'Solomon B.',
  idLabel: 'Patient ID · D10-SC-001',
  condition: 'Sickle Cell Disease (HbSS)',
  age: 28,
};

const trendMetricsByRole: Record<
  Exclude<DemoRole, 'patient'>,
  Array<{ id: string; label: string; unit: string; color: string }>
> = {
  hematologist: [
    { id: 'hemoglobin', label: 'Hb Trend', unit: '', color: '#7b3200' },
    { id: 'spo2', label: 'SpO₂', unit: '%', color: '#00488d' },
    { id: 'heartRate', label: 'Heart Rate', unit: 'bpm', color: '#ba1a1a' },
  ],
  caregiver: [
    { id: 'heartRate', label: 'Heart Rate', unit: 'bpm', color: '#ba1a1a' },
    { id: 'spo2', label: 'SpO₂', unit: '%', color: '#00488d' },
    { id: 'hemoglobin', label: 'Hb Trend', unit: '', color: '#7b3200' },
  ],
};

export function ClinicianDashboardScreen({ role, email }: Props) {
  const [devPanelVisible, setDevPanelVisible] = useState(false);
  const { vitals } = useVitals();
  const { risk } = useRiskStatus();
  const { runtime, setMode, connect, disconnect, injectSamplePayload } =
    useWearableRuntime();

  const headerLabel =
    role === 'hematologist' ? 'Hematology View' : 'Remote Monitoring';
  const headerSubLabel = `${ROLE_LABELS[role]} · ${email}`;
  const lastUpdate = useMemo(
    () => formatLastUpdate(runtime.mode, runtime.lastRawPayload),
    [runtime.mode, runtime.lastRawPayload]
  );

  const medsTakenCount = mockMedications.filter((m) => m.status === 'taken')
    .length;
  const medsPendingCount = mockMedications.filter(
    (m) => m.status !== 'taken'
  ).length;

  const hasActiveAlert = risk?.level === 'high' || risk?.level === 'moderate';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.avatar}
          activeOpacity={0.8}
          onLongPress={() => setDevPanelVisible(true)}
        >
          <MaterialCommunityIcons
            name={role === 'hematologist' ? 'stethoscope' : 'shield-account'}
            size={20}
            color={Colors.primary}
          />
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={styles.topBarTitle}>{headerLabel}</Text>
          <Text style={styles.topBarSubtitle}>{headerSubLabel}</Text>
        </View>
        <TouchableOpacity
          style={styles.signOutChip}
          onPress={signOutDemoSession}
          activeOpacity={0.7}
        >
          <Text style={styles.signOutChipText}>SIGN OUT</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Patient Identification */}
        <View style={[styles.patientCard, Shadows.sm]}>
          <View style={styles.patientRow}>
            <View style={styles.patientAvatar}>
              <MaterialCommunityIcons
                name="account"
                size={28}
                color={Colors.onPrimary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.patientName}>{PATIENT.name}</Text>
              <Text style={styles.patientMeta}>{PATIENT.idLabel}</Text>
              <Text style={styles.patientMeta}>
                Age {PATIENT.age} · {PATIENT.condition}
              </Text>
            </View>
            <WearableConnectionPill state={runtime.connectionState} />
          </View>
          <View style={styles.syncRow}>
            <MaterialCommunityIcons
              name="update"
              size={14}
              color={Colors.onSurfaceVariant}
            />
            <Text style={styles.syncText}>
              Last update · {lastUpdate}
            </Text>
          </View>
        </View>

        {/* Alert banner */}
        <View
          style={[
            styles.alertCard,
            Shadows.sm,
            hasActiveAlert ? styles.alertCardActive : styles.alertCardCalm,
          ]}
        >
          <MaterialCommunityIcons
            name={hasActiveAlert ? 'alert-decagram' : 'shield-check'}
            size={24}
            color={hasActiveAlert ? Colors.error : Colors.success}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>
              {hasActiveAlert ? 'Active Clinical Alert' : 'No Active Alerts'}
            </Text>
            <Text style={styles.alertBody}>
              {hasActiveAlert
                ? risk?.description ?? 'Review latest vitals.'
                : 'All primary indicators within safe ranges.'}
            </Text>
          </View>
        </View>

        {/* Risk + primary vitals grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Status</Text>
          <View style={styles.riskSummary}>
            <View style={styles.riskPill}>
              <View
                style={[
                  styles.riskDot,
                  { backgroundColor: riskColor(risk?.level) },
                ]}
              />
              <Text style={styles.riskLevel}>
                {risk?.label ?? 'AWAITING DATA'}
              </Text>
            </View>
            <Text style={styles.riskDescription}>
              {risk?.description ??
                'Connect a wearable or enable mock mode to view current risk.'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vitals Snapshot</Text>
          <VitalsGrid vitals={vitals} />
        </View>

        {/* Mini trends */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Trends (7d)</Text>
          <View style={styles.trendsList}>
            {trendMetricsByRole[role].map((metric) => (
              <MiniTrendCard
                key={metric.id}
                metricId={metric.id}
                label={metric.label}
                unit={metric.unit}
                color={metric.color}
              />
            ))}
          </View>
        </View>

        {/* Medication adherence */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medication Adherence</Text>
          <View style={[styles.adherenceCard, Shadows.sm]}>
            <View style={styles.adherenceRow}>
              <MaterialCommunityIcons
                name="pill"
                size={22}
                color={Colors.primary}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.adherenceValue}>
                  {medsTakenCount} of {mockMedications.length} taken today
                </Text>
                <Text style={styles.adherenceMeta}>
                  {medsPendingCount} pending · adherence tracked via patient app
                </Text>
              </View>
            </View>
            <View style={styles.adherenceBar}>
              <View
                style={[
                  styles.adherenceFill,
                  {
                    width: `${(medsTakenCount /
                      Math.max(1, mockMedications.length)) *
                      100}%`,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Recent events */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Crisis History</Text>
          <View style={{ gap: Spacing.sm }}>
            {mockCrisisEvents.slice(0, 3).map((event) => (
              <View
                key={event.id}
                style={[styles.eventCard, Shadows.sm]}
              >
                <View
                  style={[
                    styles.severityDot,
                    { backgroundColor: severityColor(event.severity) },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventRange}>{event.dateRange}</Text>
                  <Text style={styles.eventMeta}>
                    {event.duration} · {event.location}
                  </Text>
                </View>
                <Text style={styles.eventSeverity}>
                  {event.severity.toUpperCase()}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <WearableDevPanel
        visible={devPanelVisible}
        runtime={runtime}
        onClose={() => setDevPanelVisible(false)}
        onModeChange={setMode}
        onConnectBle={connect}
        onDisconnectBle={disconnect}
        onInjectSample={injectSamplePayload}
        onSignOut={signOutDemoSession}
      />
    </SafeAreaView>
  );
}

function VitalsGrid({ vitals }: { vitals: VitalReading[] }) {
  const rows = Array.from({ length: Math.ceil(vitals.length / 2) }, (_, i) =>
    vitals.slice(i * 2, i * 2 + 2)
  );

  if (vitals.length === 0) {
    return (
      <View style={styles.vitalsEmpty}>
        <Text style={styles.vitalsEmptyText}>Syncing wearable…</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: Spacing.lg }}>
      {rows.map((row, idx) => (
        <View key={idx} style={styles.vitalsRow}>
          {row[0] ? (
            <VitalCard vital={row[0]} />
          ) : (
            <View style={styles.vitalPlaceholder} />
          )}
          <View style={{ width: Spacing.lg }} />
          {row[1] ? (
            <VitalCard vital={row[1]} />
          ) : (
            <View style={styles.vitalPlaceholder} />
          )}
        </View>
      ))}
    </View>
  );
}

interface MiniTrendProps {
  metricId: string;
  label: string;
  unit: string;
  color: string;
}

function MiniTrendCard({ metricId, label, unit, color }: MiniTrendProps) {
  const { data, loading } = useTrends(metricId, 'week');
  const chartWidth = Dimensions.get('window').width - Spacing.xl * 2 - Spacing.lg * 2;
  const chartHeight = 60;

  if (loading || data.length < 2) {
    return (
      <View style={[styles.trendCard, Shadows.sm, styles.trendLoading]}>
        <Text style={styles.trendLoadingText}>Loading {label}…</Text>
      </View>
    );
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const current = values[values.length - 1];

  const points = values.map((v, i) => ({
    x: (i / (values.length - 1)) * chartWidth,
    y:
      chartHeight -
      ((v - min) / range) * (chartHeight * 0.8) -
      chartHeight * 0.1,
  }));

  let linePath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const cpx = (points[i - 1].x + points[i].x) / 2;
    linePath += ` C ${cpx} ${points[i - 1].y}, ${cpx} ${points[i].y}, ${points[i].x} ${points[i].y}`;
  }
  const areaPath = linePath + ` L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

  return (
    <View style={[styles.trendCard, Shadows.sm]}>
      <View style={styles.trendHeader}>
        <View>
          <Text style={styles.trendLabel}>{label}</Text>
          <Text style={styles.trendSubLabel}>Past 7 days</Text>
        </View>
        <Text style={styles.trendValue}>
          {current}
          <Text style={styles.trendUnit}> {unit}</Text>
        </Text>
      </View>
      <Svg width={chartWidth} height={chartHeight}>
        <Defs>
          <LinearGradient id={`mini-${metricId}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity={0.18} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill={`url(#mini-${metricId})`} />
        <Path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2.2}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

function formatLastUpdate(mode: string, raw?: string) {
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && 'timestamp' in parsed) {
        const t = Date.parse(parsed.timestamp as string);
        if (Number.isFinite(t)) {
          return new Date(t).toLocaleTimeString();
        }
      }
    } catch (_error) {
      // fall through
    }
    return 'just now';
  }
  if (mode === 'mock') {
    return 'Mock data (demo)';
  }
  return 'awaiting wearable';
}

function riskColor(level?: string) {
  if (level === 'high') return Colors.error;
  if (level === 'moderate') return Colors.tertiary;
  if (level === 'low') return Colors.success;
  return Colors.outline;
}

function severityColor(severity: 'mild' | 'moderate' | 'severe') {
  if (severity === 'severe') return Colors.error;
  if (severity === 'moderate') return Colors.tertiary;
  return Colors.success;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleWrap: {
    flex: 1,
    marginHorizontal: Spacing.md,
  },
  topBarTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.onSurface,
    letterSpacing: -0.3,
  },
  topBarSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  signOutChip: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  signOutChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.6,
  },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl + Spacing.xl,
    gap: Spacing.xl,
  },
  patientCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.onSurface,
  },
  patientMeta: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  syncText: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
  },
  alertCardActive: {
    backgroundColor: Colors.errorContainer,
  },
  alertCardCalm: {
    backgroundColor: Colors.successContainer,
  },
  alertTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurface,
  },
  alertBody: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  riskSummary: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  riskPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  riskDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  riskLevel: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
    color: Colors.onSurface,
    letterSpacing: -0.3,
  },
  riskDescription: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
  },
  vitalsEmpty: {
    height: 120,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vitalsEmptyText: {
    color: Colors.onSurfaceVariant,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  vitalsRow: { flexDirection: 'row' },
  vitalPlaceholder: { flex: 1 },
  trendsList: {
    gap: Spacing.md,
  },
  trendCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  trendLoading: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendLoadingText: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  trendLabel: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurface,
  },
  trendSubLabel: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  trendValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    color: Colors.onSurface,
    letterSpacing: -1,
  },
  trendUnit: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.onSurfaceVariant,
  },
  adherenceCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  adherenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  adherenceValue: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurface,
  },
  adherenceMeta: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  adherenceBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surfaceContainer,
    overflow: 'hidden',
  },
  adherenceFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  severityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  eventRange: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurface,
  },
  eventMeta: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  eventSeverity: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.8,
  },
});
