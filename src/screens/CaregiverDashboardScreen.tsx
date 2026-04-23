/**
 * D-10 Therapeutics — Caregiver Dashboard
 *
 * Allows a caregiver to monitor all their patients at a glance.
 * Focuses on: pain levels, VOC risk, medication adherence, and alerts.
 *
 * Data is seeded demo data — not connected to a real backend.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
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
import { signOutDemoSession } from '../state/session';
import { D10Logo } from '../components/D10Logo';
import {
  DEMO_PATIENTS,
  DemoAdherenceHistoryPoint,
  DemoPatient,
  LIVE_DEMO_PATIENT_ID,
  LivePatientOverlay,
  getMedAdherence,
  getWeeklyAdherencePct,
  resolveLivePatients,
} from '../data/demoPatients';
import { useLiveWearableVitals } from '../components/useSensorData';
import {
  SEVERITY_COLORS,
  SEVERITY_BG_COLORS,
  SEVERITY_LABELS,
  RISK_LEVEL_COLORS,
  RISK_LEVEL_BG_COLORS,
  AlertSeverity,
} from '../data/escalationConfig';
import {
  AppAlert,
  subscribeAlerts,
  getUnreadCount,
} from '../services/notificationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  email: string;
  onOpenAlertCenter: () => void;
}

export function CaregiverDashboardScreen({ email, onOpenAlertCenter }: Props) {
  const [selectedId, setSelectedId] = useState(DEMO_PATIENTS[0].id);
  const [alerts, setAlerts] = useState<AppAlert[]>([]);
  const [unread, setUnread] = useState(0);
  const liveVitals = useLiveWearableVitals();

  const liveOverlay: LivePatientOverlay | null = liveVitals.isLive
    ? {
        patientId: LIVE_DEMO_PATIENT_ID,
        spo2: liveVitals.spo2,
        heartRate: liveVitals.heartRate,
        hbTrendIndex: liveVitals.hbTrendIndex,
        painLevel:
          liveVitals.painLevel !== null ? liveVitals.painLevel : undefined,
        battery: liveVitals.battery,
        fingerDetected: liveVitals.fingerDetected,
      }
    : null;
  const patients = resolveLivePatients(liveOverlay);
  const patient = patients.find((p) => p.id === selectedId) ?? patients[0];
  const isLivePatient = liveOverlay?.patientId === patient.id;
  const painIsLive = isLivePatient && liveVitals.painLevel !== null;

  useEffect(() => {
    const unsub = subscribeAlerts((all) => {
      setAlerts(all.filter((a) => a.target === 'caregiver'));
      setUnread(getUnreadCount('caregiver'));
    }, 'caregiver');
    return unsub;
  }, []);

  const patientAlerts = alerts
    .filter((a) => a.patientId === patient.id)
    .slice(0, 4);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <D10Logo size="sm" />
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={styles.alertButton}
          onPress={onOpenAlertCenter}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="bell-outline" size={20} color={Colors.onSurface} />
          {unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.signOutChip}
          onPress={signOutDemoSession}
          activeOpacity={0.7}
        >
          <Text style={styles.signOutText}>SIGN OUT</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerBlock}>
          <Text style={styles.headerTitle}>Remote Monitoring</Text>
          <Text style={styles.headerSub}>Caregiver · {email}</Text>
        </View>

        {/* Patient selector */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>PATIENTS</Text>
          <Text style={styles.sectionCount}>{DEMO_PATIENTS.length} enrolled</Text>
        </View>

        <FlatList
          data={patients}
          keyExtractor={(p) => p.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.patientRail}
          renderItem={({ item }) => (
            <PatientChip
              patient={item}
              selected={item.id === selectedId}
              onPress={() => setSelectedId(item.id)}
            />
          )}
        />

        {/* Selected patient detail */}
        <View style={styles.patientDetailHeader}>
          <View style={styles.patientAvatar}>
            <Text style={styles.patientInitials}>{patient.initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.patientName}>{patient.name}</Text>
            <Text style={styles.patientMeta}>
              {patient.patientIdLabel} · Age {patient.age}
            </Text>
            <Text style={styles.patientMeta}>{patient.condition}</Text>
          </View>
          <View style={styles.wearablePill}>
            <View
              style={[
                styles.wearableDot,
                { backgroundColor: patient.wearableConnected ? Colors.success : Colors.outline },
              ]}
            />
            <Text style={styles.wearablePillText}>
              {patient.wearableConnected ? 'Connected' : 'Offline'}
            </Text>
          </View>
        </View>
        <Text style={styles.syncText}>
          {isLivePatient
            ? `Live wearable feed${
                liveVitals.battery !== null ? ` · battery ${liveVitals.battery}%` : ''
              }${liveVitals.fingerDetected ? '' : ' · no finger detected'}`
            : `Last synced: ${patient.lastSynced}`}
        </Text>

        {/* Pain + VOC row */}
        <View style={styles.twoColRow}>
          <PainCard painLevel={patient.currentPainLevel} isLive={painIsLive} />
          <VocRiskCard vocRisk={patient.vocRisk} />
        </View>

        {/* Medication Adherence */}
        <MedAdherenceCard patient={patient} />

        {/* Vitals snapshot */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>VITALS SNAPSHOT</Text>
            {isLivePatient && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveBadgeText}>LIVE WEARABLE</Text>
              </View>
            )}
          </View>
          <View style={styles.vitalsGrid}>
            <VitalMiniCard
              icon="water-outline"
              label="SpO₂"
              value={`${patient.vitals.spo2}%`}
              alert={patient.vitals.spo2 < 95}
              isLive={isLivePatient}
            />
            <VitalMiniCard
              icon="heart-pulse"
              label="Heart Rate"
              value={`${patient.vitals.heartRate} bpm`}
              alert={patient.vitals.heartRate > 100}
              isLive={isLivePatient}
            />
            <VitalMiniCard
              icon="trending-up"
              label="Hb Trend"
              value={patient.vitals.hbTrendIndex.toFixed(1)}
              alert={patient.vitals.hbTrendIndex < 72}
              note="index"
              isLive={isLivePatient}
            />
            <VitalMiniCard
              icon="thermometer"
              label="Temperature"
              value={`${patient.vitals.temperatureF}°F`}
              alert={!isLivePatient && patient.vitals.temperatureF > 99.5}
              isDemo={isLivePatient}
            />
          </View>
        </View>

        {/* Recent alerts for this patient */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>RECENT ALERTS</Text>
            <TouchableOpacity onPress={onOpenAlertCenter} activeOpacity={0.7}>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>
          {patientAlerts.length === 0 ? (
            <View style={[styles.emptyAlerts, Shadows.sm]}>
              <MaterialCommunityIcons name="shield-check" size={24} color={Colors.success} />
              <Text style={styles.emptyAlertsText}>No recent alerts for this patient.</Text>
            </View>
          ) : (
            <View style={{ gap: Spacing.sm }}>
              {patientAlerts.map((alert) => (
                <AlertRow key={alert.id} alert={alert} />
              ))}
            </View>
          )}
        </View>

        {/* Trend sparkline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7-DAY TRENDS</Text>
          <View style={{ gap: Spacing.md }}>
            <SparkCard
              label="Pain Level (self-reported)"
              color="#ba1a1a"
              points={patient.trends.pain}
            />
            <SparkCard
              label="Hb Trend Index (0–100 hardware scale)"
              color="#7b3200"
              points={patient.trends.hbTrend}
            />
            <SparkCard
              label="SpO₂ (%)"
              color="#00488d"
              points={patient.trends.spo2}
            />
          </View>
        </View>

        {/* Crisis history */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CRISIS HISTORY</Text>
          <View style={{ gap: Spacing.sm }}>
            {patient.crisisEvents.map((event) => (
              <View key={event.id} style={[styles.eventCard, Shadows.sm]}>
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
                  {event.notes.length > 0 && (
                    <Text style={styles.eventNote}>{event.notes}</Text>
                  )}
                </View>
                <Text style={[styles.eventSeverityLabel, { color: severityColor(event.severity) }]}>
                  {event.severity.toUpperCase()}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PatientChip({
  patient,
  selected,
  onPress,
}: {
  patient: DemoPatient;
  selected: boolean;
  onPress: () => void;
}) {
  const severityColor = SEVERITY_COLORS[patient.alertSeverity];
  const severityBg = SEVERITY_BG_COLORS[patient.alertSeverity];

  return (
    <TouchableOpacity
      style={[
        styles.patientChip,
        selected && styles.patientChipSelected,
        Shadows.sm,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.chipAvatar, selected && styles.chipAvatarSelected]}>
        <Text style={[styles.chipInitials, selected && styles.chipInitialsSelected]}>
          {patient.initials}
        </Text>
      </View>
      <Text style={[styles.chipName, selected && styles.chipNameSelected]} numberOfLines={1}>
        {patient.name}
      </Text>
      <View style={[styles.chipSeverityBadge, { backgroundColor: severityBg }]}>
        <View style={[styles.chipDot, { backgroundColor: severityColor }]} />
        <Text style={[styles.chipSeverityText, { color: severityColor }]}>
          {SEVERITY_LABELS[patient.alertSeverity]}
        </Text>
      </View>
      {!patient.wearableConnected && (
        <Text style={styles.chipOffline}>No wearable</Text>
      )}
    </TouchableOpacity>
  );
}

function PainCard({ painLevel, isLive }: { painLevel: number; isLive: boolean }) {
  const pct = (painLevel / 10) * 100;
  const color =
    painLevel >= 8 ? Colors.error : painLevel >= 6 ? '#a04401' : painLevel >= 4 ? '#b08000' : Colors.success;
  const label =
    painLevel >= 8 ? 'Severe' : painLevel >= 6 ? 'High' : painLevel >= 4 ? 'Moderate' : 'Mild';

  return (
    <View style={[styles.halfCard, Shadows.sm]}>
      <View style={styles.painHeaderRow}>
        <Text style={styles.cardLabel}>PAIN LEVEL</Text>
        {isLive && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        )}
      </View>
      <Text style={[styles.bigNumber, { color }]}>{painLevel}</Text>
      <Text style={styles.bigNumberSub}>/ 10 · {label}</Text>
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.selfReport}>
        {isLive ? 'Wearable-reported' : 'Patient self-report'}
      </Text>
    </View>
  );
}

function VocRiskCard({ vocRisk }: { vocRisk: DemoPatient['vocRisk'] }) {
  const bg = RISK_LEVEL_BG_COLORS[vocRisk.level];
  const fg = RISK_LEVEL_COLORS[vocRisk.level];

  return (
    <View style={[styles.halfCard, Shadows.sm]}>
      <Text style={styles.cardLabel}>VOC RISK</Text>
      <View style={[styles.riskBadge, { backgroundColor: bg }]}>
        <Text style={[styles.riskBadgeText, { color: fg }]}>{vocRisk.label}</Text>
      </View>
      <Text style={styles.vocDescription} numberOfLines={4}>
        {vocRisk.description}
      </Text>
    </View>
  );
}

function MedAdherenceCard({ patient }: { patient: DemoPatient }) {
  const adh = getMedAdherence(patient);
  const weeklyPct = getWeeklyAdherencePct(patient);

  return (
    <View style={[styles.fullCard, Shadows.sm]}>
      <View style={styles.medHeader}>
        <MaterialCommunityIcons name="pill" size={18} color={Colors.primary} />
        <Text style={styles.cardLabel}>MEDICATION ADHERENCE TODAY</Text>
      </View>
      <View style={styles.medStats}>
        <View style={styles.medStat}>
          <Text style={[styles.medStatNum, { color: Colors.success }]}>{adh.taken}</Text>
          <Text style={styles.medStatLabel}>Taken</Text>
        </View>
        <View style={styles.medStat}>
          <Text style={[styles.medStatNum, { color: Colors.outline }]}>{adh.pending}</Text>
          <Text style={styles.medStatLabel}>Pending</Text>
        </View>
        <View style={styles.medStat}>
          <Text style={[styles.medStatNum, { color: Colors.error }]}>{adh.skipped}</Text>
          <Text style={styles.medStatLabel}>Skipped</Text>
        </View>
        <View style={styles.medStat}>
          <Text style={[styles.medStatNum, { color: Colors.primary }]}>{adh.pct}%</Text>
          <Text style={styles.medStatLabel}>Adherence</Text>
        </View>
      </View>
      <View style={styles.adherenceBg}>
        <View style={[styles.adherenceFill, { width: `${adh.pct}%` }]} />
      </View>
      <AdherenceHistoryStrip
        history={patient.adherenceHistory}
        weeklyPct={weeklyPct}
      />
      <View style={{ gap: 6 }}>
        {patient.medications.map((med) => (
          <View key={med.id} style={styles.medRow}>
            <View
              style={[
                styles.medStatusDot,
                {
                  backgroundColor:
                    med.status === 'taken'
                      ? Colors.success
                      : med.status === 'skipped'
                      ? Colors.error
                      : Colors.outline,
                },
              ]}
            />
            <Text style={styles.medName}>
              {med.name} {med.dosage}
            </Text>
            <Text style={styles.medTime}>{med.timeOfDay}</Text>
            <Text
              style={[
                styles.medStatusText,
                {
                  color:
                    med.status === 'taken'
                      ? Colors.success
                      : med.status === 'skipped'
                      ? Colors.error
                      : Colors.onSurfaceVariant,
                },
              ]}
            >
              {med.status === 'taken' && med.takenAt ? `✓ ${med.takenAt}` : med.status.toUpperCase()}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function AdherenceHistoryStrip({
  history,
  weeklyPct,
}: {
  history: DemoAdherenceHistoryPoint[];
  weeklyPct: number;
}) {
  if (history.length === 0) return null;
  return (
    <View style={styles.adhHistory}>
      <View style={styles.adhHistoryHeader}>
        <Text style={styles.adhHistoryLabel}>Past 7 Days</Text>
        <Text style={styles.adhHistoryPct}>{weeklyPct}% avg</Text>
      </View>
      <View style={styles.adhBarsRow}>
        {history.map((point) => {
          const pct = Math.max(0, Math.min(100, point.pct));
          const color =
            pct >= 80
              ? Colors.success
              : pct >= 50
              ? '#b08000'
              : Colors.error;
          return (
            <View key={point.date} style={styles.adhBarCol}>
              <View style={styles.adhBarTrack}>
                <View
                  style={[
                    styles.adhBarFill,
                    { height: `${Math.max(pct, 6)}%`, backgroundColor: color },
                  ]}
                />
              </View>
              <Text style={styles.adhBarDate}>
                {point.date.replace('Apr ', '')}
              </Text>
              <Text style={[styles.adhBarPct, { color }]}>{pct}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function VitalMiniCard({
  icon,
  label,
  value,
  alert,
  note,
  isLive,
  isDemo,
}: {
  icon: string;
  label: string;
  value: string;
  alert: boolean;
  note?: string;
  isLive?: boolean;
  isDemo?: boolean;
}) {
  return (
    <View style={[styles.vitalMini, Shadows.sm, alert && styles.vitalMiniAlert]}>
      <View style={styles.vitalMiniHeader}>
        <MaterialCommunityIcons
          name={icon as any}
          size={18}
          color={alert ? Colors.error : Colors.primary}
        />
        {isLive && !isDemo && (
          <View style={styles.vitalLiveTag}>
            <View style={styles.vitalLiveDot} />
            <Text style={styles.vitalLiveTagText}>LIVE</Text>
          </View>
        )}
        {isDemo && (
          <View style={styles.vitalDemoTag}>
            <Text style={styles.vitalDemoTagText}>DEMO</Text>
          </View>
        )}
      </View>
      <Text style={styles.vitalMiniValue}>{value}</Text>
      <Text style={styles.vitalMiniLabel}>{label}</Text>
      {note && <Text style={styles.vitalMiniNote}>{note}</Text>}
      {isDemo && <Text style={styles.vitalMiniNote}>Not from wearable</Text>}
    </View>
  );
}

function AlertRow({ alert }: { alert: AppAlert }) {
  const bg = SEVERITY_BG_COLORS[alert.severity];
  const fg = SEVERITY_COLORS[alert.severity];
  const icon =
    alert.severity === 'extreme' || alert.severity === 'high'
      ? 'alert-decagram'
      : alert.severity === 'warning'
      ? 'alert-circle-outline'
      : 'information-outline';

  return (
    <View style={[styles.alertRow, { borderLeftColor: fg, backgroundColor: bg }]}>
      <MaterialCommunityIcons name={icon as any} size={18} color={fg} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.alertRowTitle, { color: fg }]}>{alert.title}</Text>
        <Text style={styles.alertRowBody} numberOfLines={2}>{alert.body}</Text>
        <Text style={styles.alertRowTime}>{formatTimeAgo(alert.timestamp)}</Text>
      </View>
    </View>
  );
}

function SparkCard({
  label,
  color,
  points,
}: {
  label: string;
  color: string;
  points: { date: string; value: number }[];
}) {
  const chartW = SCREEN_WIDTH - Spacing.xl * 2 - Spacing.lg * 2;
  const chartH = 52;

  if (points.length < 2) return null;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const current = values[values.length - 1] ?? 0;

  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * chartW,
    y: chartH - ((v - min) / range) * (chartH * 0.8) - chartH * 0.1,
  }));

  let line = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cpx = (pts[i - 1].x + pts[i].x) / 2;
    line += ` C ${cpx} ${pts[i - 1].y}, ${cpx} ${pts[i].y}, ${pts[i].x} ${pts[i].y}`;
  }
  const area = `${line} L ${chartW} ${chartH} L 0 ${chartH} Z`;

  return (
    <View style={[styles.sparkCard, Shadows.sm]}>
      <View style={styles.sparkHeader}>
        <Text style={styles.sparkLabel}>{label}</Text>
        <Text style={[styles.sparkValue, { color }]}>{current.toFixed(1)}</Text>
      </View>
      <Svg width={chartW} height={chartH}>
        <Defs>
          <LinearGradient id={`cg-${label}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity={0.15} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={area} fill={`url(#cg-${label})`} />
        <Path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function severityColor(s: string) {
  if (s === 'severe') return Colors.error;
  if (s === 'moderate') return '#a04401';
  return Colors.success;
}

function formatTimeAgo(iso: string): string {
  const diffMs = Date.now() - Date.parse(iso);
  if (!Number.isFinite(diffMs) || diffMs < 0) return 'just now';
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  alertButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  unreadBadgeText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  signOutChip: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  signOutText: {
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
  headerBlock: { gap: 2 },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    color: Colors.onSurface,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  sectionCount: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
  },
  seeAllText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  patientRail: {
    gap: Spacing.md,
    paddingRight: Spacing.lg,
  },
  patientChip: {
    width: 140,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    gap: Spacing.xs,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  patientChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFixed,
  },
  chipAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  chipAvatarSelected: { backgroundColor: Colors.primary },
  chipInitials: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.onSurfaceVariant,
  },
  chipInitialsSelected: { color: Colors.onPrimary },
  chipName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurface,
  },
  chipNameSelected: { color: Colors.onSurface },
  chipSeverityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipSeverityText: { fontSize: 9, fontWeight: FontWeight.semibold },
  chipOffline: {
    fontSize: 9,
    color: Colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  patientDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientInitials: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.extrabold,
    color: Colors.onPrimary,
  },
  patientName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.onSurface,
  },
  patientMeta: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    marginTop: 1,
  },
  wearablePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  wearableDot: { width: 8, height: 8, borderRadius: 4 },
  wearablePillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.onSurfaceVariant,
  },
  syncText: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    marginTop: -Spacing.md,
    paddingHorizontal: 2,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  halfCard: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  fullCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  bigNumber: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -2,
    lineHeight: 52,
  },
  bigNumberSub: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    marginTop: -4,
  },
  progressBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surfaceContainer,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  selfReport: {
    fontSize: 10,
    color: Colors.outline,
    fontStyle: 'italic',
  },
  painHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffdad6',
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.error,
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.5,
    color: Colors.error,
  },
  riskBadge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.sm,
  },
  riskBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.5,
  },
  vocDescription: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
  },
  medHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  medStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  medStat: { alignItems: 'center', gap: 2 },
  medStatNum: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
  },
  medStatLabel: {
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    fontWeight: FontWeight.medium,
  },
  adherenceBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surfaceContainer,
    overflow: 'hidden',
  },
  adherenceFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  adhHistory: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  adhHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adhHistoryLabel: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  adhHistoryPct: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.onSurface,
  },
  adhBarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 6,
  },
  adhBarCol: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  adhBarTrack: {
    width: '100%',
    height: 40,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radius.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  adhBarFill: {
    width: '100%',
    borderTopLeftRadius: Radius.sm,
    borderTopRightRadius: Radius.sm,
  },
  adhBarDate: {
    fontSize: 9,
    color: Colors.onSurfaceVariant,
    fontWeight: FontWeight.medium,
  },
  adhBarPct: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
  },
  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 3,
  },
  medStatusDot: { width: 8, height: 8, borderRadius: 4 },
  medName: {
    flex: 1,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.onSurface,
  },
  medTime: {
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    textTransform: 'capitalize',
  },
  medStatusText: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
    minWidth: 60,
    textAlign: 'right',
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  vitalMini: {
    width: '47%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 4,
    alignItems: 'flex-start',
  },
  vitalMiniAlert: { backgroundColor: '#fff5f5' },
  vitalMiniHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'space-between',
  },
  vitalLiveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ffdad6',
    borderRadius: Radius.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  vitalLiveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.error,
  },
  vitalLiveTagText: {
    fontSize: 8,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.5,
    color: Colors.error,
  },
  vitalDemoTag: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radius.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  vitalDemoTagText: {
    fontSize: 8,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
    color: Colors.onSurfaceVariant,
  },
  vitalMiniValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
    color: Colors.onSurface,
  },
  vitalMiniLabel: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
  },
  vitalMiniNote: {
    fontSize: 9,
    color: Colors.outline,
    fontStyle: 'italic',
  },
  section: { gap: Spacing.md },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    borderRadius: Radius.lg,
    borderLeftWidth: 3,
    padding: Spacing.md,
  },
  alertRowTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  alertRowBody: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 17,
  },
  alertRowTime: {
    fontSize: 10,
    color: Colors.outline,
    marginTop: 4,
  },
  emptyAlerts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.successContainer,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  emptyAlertsText: {
    fontSize: FontSize.sm,
    color: Colors.onSurface,
    flex: 1,
  },
  sparkCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  sparkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sparkLabel: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    flex: 1,
    marginRight: Spacing.sm,
  },
  sparkValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.5,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  severityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  eventRange: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurface,
  },
  eventMeta: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    marginTop: 1,
  },
  eventNote: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  eventSeverityLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
});
