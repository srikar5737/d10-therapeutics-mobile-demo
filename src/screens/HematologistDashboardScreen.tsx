/**
 * D-10 Therapeutics — Hematologist Dashboard
 *
 * Designed for clinicians. Shows only high-priority patients who require
 * clinical attention. Stable/low-risk patients are listed briefly at the bottom.
 *
 * Alert philosophy:
 *   - Only high / extreme severity patients surface prominently
 *   - Hematologist is NOT notified for routine caregiver-level events
 *   - Escalation triggers: VOC high/extreme, Hb trend critical drop, pain ≥ 8
 *
 * All data is seeded demo data. Not connected to a real clinical backend.
 */

import React, { useEffect, useState } from 'react';
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
import { signOutDemoSession } from '../state/session';
import { D10Logo } from '../components/D10Logo';
import {
  DemoPatient,
  DemoVocRiskHistoryPoint,
  LIVE_DEMO_PATIENT_ID,
  LivePatientOverlay,
  getHematologistEscalationPatients,
  getMedAdherence,
  resolveLivePatients,
} from '../data/demoPatients';
import { useLiveWearableVitals } from '../components/useSensorData';
import {
  SEVERITY_COLORS,
  SEVERITY_BG_COLORS,
  SEVERITY_LABELS,
  RISK_LEVEL_COLORS,
  RISK_LEVEL_BG_COLORS,
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

export function HematologistDashboardScreen({ email, onOpenAlertCenter }: Props) {
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
  const criticalPatients = getHematologistEscalationPatients(patients);
  const otherPatients = patients.filter(
    (p) => p.alertSeverity !== 'high' && p.alertSeverity !== 'extreme'
  );

  useEffect(() => {
    const unsub = subscribeAlerts((all) => {
      setAlerts(all.filter((a) => a.target === 'hematologist'));
      setUnread(getUnreadCount('hematologist'));
    }, 'hematologist');
    return unsub;
  }, []);

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
        <TouchableOpacity style={styles.signOutChip} onPress={signOutDemoSession} activeOpacity={0.7}>
          <Text style={styles.signOutText}>SIGN OUT</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerBlock}>
          <Text style={styles.headerTitle}>Hematology View</Text>
          <Text style={styles.headerSub}>Hematologist · {email}</Text>
          <Text style={styles.headerNote}>
            Only patients requiring clinical attention are surfaced here. Routine monitoring is handled by the caregiver view.
          </Text>
        </View>

        {/* Escalation queue */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>ESCALATION QUEUE</Text>
            <View style={[styles.countBadge, { backgroundColor: criticalPatients.length > 0 ? Colors.errorContainer : Colors.successContainer }]}>
              <Text style={[styles.countBadgeText, { color: criticalPatients.length > 0 ? Colors.error : Colors.success }]}>
                {criticalPatients.length} patient{criticalPatients.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {criticalPatients.length === 0 ? (
            <View style={[styles.emptyEscalation, Shadows.sm]}>
              <MaterialCommunityIcons name="shield-check" size={32} color={Colors.success} />
              <Text style={styles.emptyEscalationTitle}>No Critical Patients</Text>
              <Text style={styles.emptyEscalationBody}>
                All patients are within caregiver-managed thresholds. No clinical escalations at this time.
              </Text>
            </View>
          ) : (
            <View style={{ gap: Spacing.xl }}>
              {criticalPatients.map((patient) => {
                const isLivePatient = liveOverlay?.patientId === patient.id;
                return (
                  <CriticalPatientCard
                    key={patient.id}
                    patient={patient}
                    alerts={alerts.filter((a) => a.patientId === patient.id)}
                    isLivePatient={isLivePatient}
                    painIsLive={
                      isLivePatient && liveVitals.painLevel !== null
                    }
                    batteryPct={isLivePatient ? liveVitals.battery : null}
                    fingerDetected={
                      isLivePatient ? liveVitals.fingerDetected : true
                    }
                  />
                );
              })}
            </View>
          )}
        </View>

        {/* Escalation alerts feed */}
        {alerts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>CLINICAL ALERTS</Text>
              <TouchableOpacity onPress={onOpenAlertCenter} activeOpacity={0.7}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: Spacing.sm }}>
              {alerts.slice(0, 4).map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </View>
          </View>
        )}

        {/* All patients summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ALL PATIENTS SUMMARY</Text>
          <View style={[styles.summaryTable, Shadows.sm]}>
            <View style={styles.summaryHeaderRow}>
              <Text style={[styles.summaryCol, styles.summaryHeader, { flex: 2 }]}>Patient</Text>
              <Text style={[styles.summaryCol, styles.summaryHeader]}>Pain</Text>
              <Text style={[styles.summaryCol, styles.summaryHeader]}>VOC</Text>
              <Text style={[styles.summaryCol, styles.summaryHeader]}>Meds</Text>
              <Text style={[styles.summaryCol, styles.summaryHeader]}>Status</Text>
            </View>
            {patients.map((patient, idx) => {
              const adh = getMedAdherence(patient);
              const isLast = idx === patients.length - 1;
              return (
                <View
                  key={patient.id}
                  style={[styles.summaryRow, !isLast && styles.summaryRowBorder]}
                >
                  <View style={[styles.summaryCol, { flex: 2 }]}>
                    <Text style={styles.summaryName}>{patient.name}</Text>
                    <Text style={styles.summaryId}>{patient.id}</Text>
                  </View>
                  <Text style={[styles.summaryCol, styles.summaryValue]}>
                    {patient.currentPainLevel}/10
                  </Text>
                  <View style={styles.summaryCol}>
                    <View
                      style={[
                        styles.riskMini,
                        { backgroundColor: RISK_LEVEL_BG_COLORS[patient.vocRisk.level] },
                      ]}
                    >
                      <Text
                        style={[
                          styles.riskMiniText,
                          { color: RISK_LEVEL_COLORS[patient.vocRisk.level] },
                        ]}
                      >
                        {patient.vocRisk.level.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.summaryCol, styles.summaryValue]}>{adh.pct}%</Text>
                  <View style={styles.summaryCol}>
                    <View
                      style={[
                        styles.severityMini,
                        { backgroundColor: SEVERITY_BG_COLORS[patient.alertSeverity] },
                      ]}
                    >
                      <Text
                        style={[
                          styles.severityMiniText,
                          { color: SEVERITY_COLORS[patient.alertSeverity] },
                        ]}
                      >
                        {SEVERITY_LABELS[patient.alertSeverity].toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Other (stable) patients note */}
        {otherPatients.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>STABLE / MONITORED</Text>
            <View style={{ gap: Spacing.sm }}>
              {otherPatients.map((patient) => (
                <StablePatientRow key={patient.id} patient={patient} />
              ))}
            </View>
          </View>
        )}

        <View style={styles.demoNote}>
          <MaterialCommunityIcons name="information-outline" size={14} color={Colors.outline} />
          <Text style={styles.demoNoteText}>
            Demo thresholds: VOC high/extreme or pain ≥ 8 escalates to hematologist.
            Hb trend index is a relative hardware scale (0–100), not absolute g/dL.
            For the live patient, SpO₂ · heart rate · Hb Trend · pain come from
            the wearable; temperature is a demo/fallback value (not emitted by
            the device). Other patients are seeded demonstration data.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CriticalPatientCard({
  patient,
  alerts,
  isLivePatient,
  painIsLive,
  batteryPct,
  fingerDetected,
}: {
  patient: DemoPatient;
  alerts: AppAlert[];
  isLivePatient: boolean;
  painIsLive: boolean;
  batteryPct: number | null;
  fingerDetected: boolean;
}) {
  const sevColor = SEVERITY_COLORS[patient.alertSeverity];
  const sevBg = SEVERITY_BG_COLORS[patient.alertSeverity];
  const adh = getMedAdherence(patient);
  const latestAlert = alerts[0];

  return (
    <View style={[styles.criticalCard, { borderTopColor: sevColor }, Shadows.md]}>
      {/* Patient header */}
      <View style={styles.criticalHeader}>
        <View style={[styles.criticalAvatar, { backgroundColor: sevColor }]}>
          <Text style={styles.criticalInitials}>{patient.initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.criticalNameRow}>
            <Text style={styles.criticalName}>{patient.name}</Text>
            {isLivePatient && (
              <View style={styles.headerLivePill}>
                <View style={styles.headerLiveDot} />
                <Text style={styles.headerLivePillText}>LIVE WEARABLE</Text>
              </View>
            )}
          </View>
          <Text style={styles.criticalMeta}>
            {patient.patientIdLabel} · Age {patient.age}
          </Text>
          <Text style={styles.criticalMeta}>{patient.condition}</Text>
          {isLivePatient && (
            <Text style={styles.criticalLiveMeta}>
              {fingerDetected ? 'Feed active' : 'No finger detected'}
              {batteryPct !== null ? ` · battery ${batteryPct}%` : ''}
            </Text>
          )}
        </View>
        <View style={[styles.severityBadge, { backgroundColor: sevBg }]}>
          <MaterialCommunityIcons
            name="alert-decagram"
            size={13}
            color={sevColor}
          />
          <Text style={[styles.severityBadgeText, { color: sevColor }]}>
            {SEVERITY_LABELS[patient.alertSeverity].toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Key indicators row */}
      <View style={styles.indicatorsRow}>
        <IndicatorChip
          label="Pain"
          value={`${patient.currentPainLevel}/10`}
          alert={patient.currentPainLevel >= 8}
          variant={painIsLive ? 'live' : 'default'}
        />
        <IndicatorChip
          label="SpO₂"
          value={`${patient.vitals.spo2}%`}
          alert={patient.vitals.spo2 < 95}
          variant={isLivePatient ? 'live' : 'default'}
        />
        <IndicatorChip
          label="HR"
          value={`${patient.vitals.heartRate}`}
          alert={patient.vitals.heartRate > 100}
          variant={isLivePatient ? 'live' : 'default'}
        />
        <IndicatorChip
          label="Hb Trend"
          value={patient.vitals.hbTrendIndex.toFixed(1)}
          alert={patient.vitals.hbTrendIndex < 68}
          variant={isLivePatient ? 'live' : 'default'}
        />
        <IndicatorChip
          label="Temp"
          value={`${patient.vitals.temperatureF}°F`}
          alert={!isLivePatient && patient.vitals.temperatureF > 99.5}
          variant={isLivePatient ? 'demo' : 'default'}
        />
      </View>

      {/* VOC risk */}
      <View style={[styles.vocBlock, { backgroundColor: RISK_LEVEL_BG_COLORS[patient.vocRisk.level] }]}>
        <View style={styles.vocRow}>
          <Text style={[styles.vocLabel, { color: RISK_LEVEL_COLORS[patient.vocRisk.level] }]}>
            VOC RISK: {patient.vocRisk.label}
          </Text>
        </View>
        <Text style={styles.vocDescription}>{patient.vocRisk.description}</Text>
        <VocRiskTimeline history={patient.vocRiskHistory} />
      </View>

      {/* Hb trend sparkline */}
      <View style={styles.trendBlock}>
        <Text style={styles.trendBlockLabel}>
          Hb Trend Index — 7 days (0–100 index scale, not g/dL)
        </Text>
        <HbTrendSparkline points={patient.trends.hbTrend} />
      </View>

      {/* Medication summary */}
      <View style={styles.medBlock}>
        <View style={styles.medBlockHeader}>
          <MaterialCommunityIcons name="pill" size={15} color={Colors.primary} />
          <Text style={styles.medBlockTitle}>Medications Today</Text>
          <Text style={[styles.adherencePct, { color: adh.pct >= 80 ? Colors.success : Colors.error }]}>
            {adh.pct}% adherence
          </Text>
        </View>
        <View style={styles.medSummaryRow}>
          <View style={styles.adherenceBg}>
            <View style={[styles.adherenceFill, { width: `${adh.pct}%` }]} />
          </View>
        </View>
        <View style={{ gap: 5 }}>
          {patient.medications.slice(0, 4).map((med) => (
            <View key={med.id} style={styles.medLine}>
              <View
                style={[
                  styles.medDot,
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
              <Text style={styles.medLineName}>
                {med.name} {med.dosage}
              </Text>
              <Text
                style={[
                  styles.medLineStatus,
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

      {/* Latest alert */}
      {latestAlert && (
        <View style={[styles.latestAlert, { borderLeftColor: sevColor, backgroundColor: sevBg }]}>
          <MaterialCommunityIcons name="bell-ring-outline" size={16} color={sevColor} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.latestAlertTitle, { color: sevColor }]}>{latestAlert.title}</Text>
            <Text style={styles.latestAlertBody} numberOfLines={2}>{latestAlert.body}</Text>
            <Text style={styles.latestAlertTime}>{formatTimeAgo(latestAlert.timestamp)}</Text>
          </View>
        </View>
      )}

      {/* Crisis history */}
      <View style={{ gap: Spacing.sm }}>
        <Text style={styles.crisisHistoryLabel}>Recent Crisis History</Text>
        {patient.crisisEvents.slice(0, 2).map((event) => (
          <View key={event.id} style={styles.crisisRow}>
            <View style={[styles.crisisDot, { backgroundColor: eventSeverityColor(event.severity) }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.crisisRange}>{event.dateRange}</Text>
              <Text style={styles.crisisMeta}>{event.duration} · {event.location}</Text>
            </View>
            <Text style={[styles.crisisSeverity, { color: eventSeverityColor(event.severity) }]}>
              {event.severity.toUpperCase()}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function IndicatorChip({
  label,
  value,
  alert,
  variant = 'default',
}: {
  label: string;
  value: string;
  alert: boolean;
  variant?: 'default' | 'live' | 'demo';
}) {
  return (
    <View
      style={[
        styles.indicatorChip,
        alert && styles.indicatorChipAlert,
      ]}
    >
      <Text style={[styles.indicatorValue, alert && { color: Colors.error }]}>{value}</Text>
      <Text style={styles.indicatorLabel}>{label}</Text>
      {variant === 'live' && (
        <View style={styles.chipTagLive}>
          <Text style={styles.chipTagLiveText}>LIVE</Text>
        </View>
      )}
      {variant === 'demo' && (
        <View style={styles.chipTagDemo}>
          <Text style={styles.chipTagDemoText}>DEMO</Text>
        </View>
      )}
    </View>
  );
}

function VocRiskTimeline({
  history,
}: {
  history: DemoVocRiskHistoryPoint[];
}) {
  if (history.length === 0) return null;
  return (
    <View style={styles.vocTimeline}>
      <Text style={styles.vocTimelineLabel}>7-day VOC risk progression</Text>
      <View style={styles.vocTimelineRow}>
        {history.map((point, i) => {
          const fg = RISK_LEVEL_COLORS[point.level];
          const bg = RISK_LEVEL_BG_COLORS[point.level];
          const prev = i > 0 ? history[i - 1].level : null;
          const escalated = prev !== null && prev !== point.level;
          return (
            <View key={point.date} style={styles.vocTimelineCol}>
              <View
                style={[
                  styles.vocTimelineDot,
                  { backgroundColor: bg, borderColor: fg },
                  escalated && styles.vocTimelineDotEscalated,
                ]}
              >
                <Text
                  style={[
                    styles.vocTimelineDotText,
                    { color: fg },
                  ]}
                >
                  {point.level.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.vocTimelineDate}>
                {point.date.replace('Apr ', '')}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function HbTrendSparkline({
  points,
}: {
  points: { date: string; value: number }[];
}) {
  const chartW = SCREEN_WIDTH - Spacing.xl * 2 - Spacing.lg * 2 - Spacing.xxl * 2;
  const chartH = 56;

  if (points.length < 2) return null;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const last = values[values.length - 1] ?? 0;
  const trend = values.length > 1 ? last - (values[0] ?? 0) : 0;
  const color = trend < -3 ? Colors.error : trend < 0 ? '#a04401' : Colors.success;

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
    <View>
      <View style={styles.hbTrendHeader}>
        <Text style={[styles.hbTrendValue, { color }]}>{last.toFixed(1)}</Text>
        <Text style={[styles.hbTrendDelta, { color }]}>
          {trend >= 0 ? '+' : ''}
          {trend.toFixed(1)} vs Mon
        </Text>
      </View>
      <Svg width={chartW} height={chartH}>
        <Defs>
          <LinearGradient id="hb-grad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity={0.18} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={area} fill="url(#hb-grad)" />
        <Path d={line} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

function AlertCard({ alert }: { alert: AppAlert }) {
  const bg = SEVERITY_BG_COLORS[alert.severity];
  const fg = SEVERITY_COLORS[alert.severity];
  return (
    <View style={[styles.alertCard, { borderLeftColor: fg, backgroundColor: bg }]}>
      <MaterialCommunityIcons name="alert-decagram" size={18} color={fg} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.alertCardTitle, { color: fg }]}>{alert.title}</Text>
        <Text style={styles.alertCardBody} numberOfLines={2}>{alert.body}</Text>
        <Text style={styles.alertCardTime}>{formatTimeAgo(alert.timestamp)}</Text>
      </View>
    </View>
  );
}

function StablePatientRow({ patient }: { patient: DemoPatient }) {
  const adh = getMedAdherence(patient);
  return (
    <View style={[styles.stableRow, Shadows.sm]}>
      <View style={styles.stableAvatar}>
        <Text style={styles.stableInitials}>{patient.initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.stableName}>{patient.name}</Text>
        <Text style={styles.stableMeta}>Pain {patient.currentPainLevel}/10 · Meds {adh.pct}% · {patient.lastSynced}</Text>
      </View>
      <View
        style={[
          styles.stableSeverity,
          { backgroundColor: SEVERITY_BG_COLORS[patient.alertSeverity] },
        ]}
      >
        <Text
          style={[
            styles.stableSeverityText,
            { color: SEVERITY_COLORS[patient.alertSeverity] },
          ]}
        >
          {SEVERITY_LABELS[patient.alertSeverity]}
        </Text>
      </View>
    </View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  if (!Number.isFinite(diff) || diff < 0) return 'just now';
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function eventSeverityColor(s: string) {
  if (s === 'severe') return Colors.error;
  if (s === 'moderate') return '#a04401';
  return Colors.success;
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
  unreadBadgeText: { fontSize: 9, fontWeight: FontWeight.bold, color: '#fff' },
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
  headerBlock: { gap: Spacing.xs },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    color: Colors.onSurface,
    letterSpacing: -0.5,
  },
  headerSub: { fontSize: FontSize.sm, color: Colors.onSurfaceVariant },
  headerNote: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
    marginTop: 4,
    fontStyle: 'italic',
  },
  section: { gap: Spacing.md },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  seeAllText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  countBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
  },
  countBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  emptyEscalation: {
    backgroundColor: Colors.successContainer,
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyEscalationTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.onSurface,
  },
  emptyEscalationBody: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  criticalCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    borderTopWidth: 3,
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  criticalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  criticalAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  criticalInitials: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.extrabold,
    color: '#fff',
  },
  criticalName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.onSurface,
  },
  criticalMeta: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    marginTop: 1,
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  severityBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.4,
  },
  indicatorsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  indicatorChip: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 56,
  },
  indicatorChipAlert: { backgroundColor: '#fff0f0' },
  indicatorValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.extrabold,
    color: Colors.onSurface,
  },
  indicatorLabel: {
    fontSize: 9,
    color: Colors.onSurfaceVariant,
    fontWeight: FontWeight.medium,
    marginTop: 1,
  },
  chipTagLive: {
    marginTop: 3,
    backgroundColor: '#ffdad6',
    borderRadius: Radius.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  chipTagLiveText: {
    fontSize: 8,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.5,
    color: Colors.error,
  },
  chipTagDemo: {
    marginTop: 3,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radius.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  chipTagDemoText: {
    fontSize: 8,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
    color: Colors.onSurfaceVariant,
  },
  criticalNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  headerLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffdad6',
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  headerLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.error,
  },
  headerLivePillText: {
    fontSize: 9,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.5,
    color: Colors.error,
  },
  criticalLiveMeta: {
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginTop: 3,
  },
  vocBlock: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 4,
  },
  vocRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  vocLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.3,
  },
  vocDescription: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
  },
  vocTimeline: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
    gap: 6,
  },
  vocTimelineLabel: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  vocTimelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 4,
  },
  vocTimelineCol: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  vocTimelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vocTimelineDotEscalated: {
    borderWidth: 2,
  },
  vocTimelineDotText: {
    fontSize: 10,
    fontWeight: FontWeight.extrabold,
  },
  vocTimelineDate: {
    fontSize: 9,
    color: Colors.onSurfaceVariant,
    fontWeight: FontWeight.medium,
  },
  trendBlock: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  trendBlockLabel: {
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  hbTrendHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  hbTrendValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.5,
  },
  hbTrendDelta: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  medBlock: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  medBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  medBlockTitle: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurface,
  },
  adherencePct: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  medSummaryRow: { gap: 4 },
  adherenceBg: {
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.surfaceContainer,
    overflow: 'hidden',
  },
  adherenceFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  medLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  medDot: { width: 7, height: 7, borderRadius: 4 },
  medLineName: {
    flex: 1,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.onSurface,
  },
  medLineStatus: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
    minWidth: 68,
    textAlign: 'right',
  },
  latestAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    borderRadius: Radius.lg,
    borderLeftWidth: 3,
    padding: Spacing.md,
  },
  latestAlertTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  latestAlertBody: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 17,
  },
  latestAlertTime: {
    fontSize: 10,
    color: Colors.outline,
    marginTop: 4,
  },
  crisisHistoryLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  crisisRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  crisisDot: { width: 8, height: 8, borderRadius: 4, marginTop: 3 },
  crisisRange: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurface,
  },
  crisisMeta: { fontSize: 10, color: Colors.onSurfaceVariant, marginTop: 1 },
  crisisSeverity: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.4,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    borderRadius: Radius.lg,
    borderLeftWidth: 3,
    padding: Spacing.md,
  },
  alertCardTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  alertCardBody: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 17,
  },
  alertCardTime: { fontSize: 10, color: Colors.outline, marginTop: 4 },
  summaryTable: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  summaryRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.outlineVariant,
  },
  summaryCol: {
    flex: 1,
    alignItems: 'flex-start',
  },
  summaryHeader: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurface,
  },
  summaryId: {
    fontSize: 9,
    color: Colors.onSurfaceVariant,
    marginTop: 1,
  },
  summaryValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.onSurface,
  },
  riskMini: {
    borderRadius: Radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  riskMiniText: { fontSize: 9, fontWeight: FontWeight.extrabold, letterSpacing: 0.3 },
  severityMini: {
    borderRadius: Radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  severityMiniText: { fontSize: 9, fontWeight: FontWeight.extrabold, letterSpacing: 0.3 },
  stableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  stableAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stableInitials: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.onSurfaceVariant,
  },
  stableName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurface,
  },
  stableMeta: { fontSize: 10, color: Colors.onSurfaceVariant, marginTop: 1 },
  stableSeverity: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  stableSeverityText: { fontSize: 10, fontWeight: FontWeight.semibold },
  demoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  demoNoteText: {
    flex: 1,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
