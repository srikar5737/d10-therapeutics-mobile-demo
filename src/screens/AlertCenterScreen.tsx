/**
 * D-10 Therapeutics — Alert Center
 *
 * Unified alert feed for all roles. Shows:
 * - In-app alerts for patient / caregiver / hematologist
 * - Mock outbound SMS records (what would be sent via Twilio/AWS SNS)
 *
 * SMS records are clearly labeled as DEMO ONLY.
 * No real messages are sent from this application.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Colors,
  FontSize,
  FontWeight,
  Radius,
  Shadows,
  Spacing,
} from '../theme/tokens';
import {
  AppAlert,
  OutboundSmsRecord,
  subscribeAlerts,
  subscribeSmsRecords,
  markAllRead,
  getUnreadCount,
} from '../services/notificationService';
import {
  SEVERITY_COLORS,
  SEVERITY_BG_COLORS,
  SEVERITY_LABELS,
  AlertTarget,
} from '../data/escalationConfig';

type TabFilter = 'all' | 'caregiver' | 'hematologist' | 'patient' | 'sms';

interface Props {
  onClose: () => void;
}

export function AlertCenterScreen({ onClose }: Props) {
  const [alerts, setAlerts] = useState<AppAlert[]>([]);
  const [smsRecords, setSmsRecords] = useState<OutboundSmsRecord[]>([]);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  useEffect(() => {
    const u1 = subscribeAlerts(setAlerts);
    const u2 = subscribeSmsRecords(setSmsRecords);
    return () => { u1(); u2(); };
  }, []);

  const caregiverUnread = getUnreadCount('caregiver');
  const hematologistUnread = getUnreadCount('hematologist');
  const patientUnread = getUnreadCount('patient');

  const filteredAlerts: AppAlert[] =
    activeTab === 'sms'
      ? []
      : activeTab === 'all'
      ? alerts
      : alerts.filter((a) => a.target === (activeTab as AlertTarget));

  const tabs: { key: TabFilter; label: string; unread?: number }[] = [
    { key: 'all', label: 'All', unread: alerts.filter((a) => !a.read).length },
    { key: 'caregiver', label: 'Caregiver', unread: caregiverUnread },
    { key: 'hematologist', label: 'Clinician', unread: hematologistUnread },
    { key: 'patient', label: 'Patient', unread: patientUnread },
    { key: 'sms', label: 'SMS Log' },
  ];

  function handleMarkAllRead() {
    const target = activeTab === 'all' || activeTab === 'sms' ? undefined : (activeTab as AlertTarget);
    markAllRead(target);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Alert Center</Text>
          <Text style={styles.headerSub}>All notifications and escalations</Text>
        </View>
        <TouchableOpacity
          style={styles.markReadBtn}
          onPress={handleMarkAllRead}
          activeOpacity={0.7}
        >
          <Text style={styles.markReadText}>Mark read</Text>
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRail}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
            {(tab.unread ?? 0) > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{tab.unread}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'sms' ? (
          <SmsSection records={smsRecords} />
        ) : (
          <>
            {filteredAlerts.length === 0 ? (
              <View style={styles.empty}>
                <MaterialCommunityIcons
                  name="bell-off-outline"
                  size={40}
                  color={Colors.outline}
                />
                <Text style={styles.emptyTitle}>No Alerts</Text>
                <Text style={styles.emptyBody}>
                  No alerts for this filter yet. They will appear here as patient state changes.
                </Text>
              </View>
            ) : (
              <View style={{ gap: Spacing.sm }}>
                {filteredAlerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AlertCard({ alert }: { alert: AppAlert }) {
  const fg = SEVERITY_COLORS[alert.severity];
  const bg = SEVERITY_BG_COLORS[alert.severity];
  const targetIcon =
    alert.target === 'hematologist'
      ? 'stethoscope'
      : alert.target === 'caregiver'
      ? 'shield-account'
      : 'account-heart';
  const alertIcon =
    alert.severity === 'extreme' || alert.severity === 'high'
      ? 'alert-decagram'
      : alert.severity === 'warning'
      ? 'alert-circle-outline'
      : 'information-outline';

  return (
    <View
      style={[
        styles.alertCard,
        { borderLeftColor: fg, backgroundColor: alert.read ? Colors.surfaceContainerLowest : bg },
        Shadows.sm,
      ]}
    >
      <View style={styles.alertCardTop}>
        <View style={[styles.severityBadge, { backgroundColor: bg }]}>
          <MaterialCommunityIcons name={alertIcon as any} size={12} color={fg} />
          <Text style={[styles.severityBadgeText, { color: fg }]}>
            {SEVERITY_LABELS[alert.severity]}
          </Text>
        </View>
        <View style={[styles.targetBadge]}>
          <MaterialCommunityIcons name={targetIcon as any} size={11} color={Colors.onSurfaceVariant} />
          <Text style={styles.targetBadgeText}>{alert.target}</Text>
        </View>
        {!alert.read && <View style={styles.unreadDot} />}
      </View>
      <Text style={styles.alertCardTitle}>{alert.title}</Text>
      <Text style={styles.alertCardBody}>{alert.body}</Text>
      <View style={styles.alertCardFooter}>
        <Text style={styles.alertCardPatient}>
          <MaterialCommunityIcons name="account" size={11} color={Colors.outline} />
          {' '}{alert.patientName} · {alert.patientId}
        </Text>
        <Text style={styles.alertCardTime}>{formatTimeAgo(alert.timestamp)}</Text>
      </View>
    </View>
  );
}

function SmsSection({ records }: { records: OutboundSmsRecord[] }) {
  return (
    <View style={{ gap: Spacing.lg }}>
      <View style={[styles.smsNotice, Shadows.sm]}>
        <MaterialCommunityIcons name="information-outline" size={18} color={Colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.smsNoticeTitle}>Mock SMS Records — Demo Only</Text>
          <Text style={styles.smsNoticeBody}>
            These records show what would be dispatched via Twilio / AWS SNS in a production deployment.
            No real messages are sent from this application.{'\n\n'}
            Production integration point: replace {`emitSmsRecord()`} in{' '}
            <Text style={styles.code}>notificationService.ts</Text> with a POST to your backend or Twilio endpoint.
          </Text>
        </View>
      </View>

      {records.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="message-off-outline" size={40} color={Colors.outline} />
          <Text style={styles.emptyTitle}>No SMS Records</Text>
          <Text style={styles.emptyBody}>Mock outbound SMS records will appear here when alerts are triggered.</Text>
        </View>
      ) : (
        records.map((rec) => <SmsCard key={rec.id} record={rec} />)
      )}
    </View>
  );
}

function SmsCard({ record }: { record: OutboundSmsRecord }) {
  const fg = SEVERITY_COLORS[record.severity];
  const bg = SEVERITY_BG_COLORS[record.severity];
  const roleIcon = record.recipientRole === 'hematologist' ? 'stethoscope' : 'shield-account';

  return (
    <View style={[styles.smsCard, Shadows.sm]}>
      <View style={styles.smsCardHeader}>
        <View style={[styles.smsRoleBadge, { backgroundColor: bg }]}>
          <MaterialCommunityIcons name={roleIcon as any} size={13} color={fg} />
          <Text style={[styles.smsRoleText, { color: fg }]}>
            {record.recipientRole === 'hematologist' ? 'HEMATOLOGIST' : 'CAREGIVER'}
          </Text>
        </View>
        <View style={styles.smsStatusBadge}>
          <Text style={styles.smsStatusText}>DEMO · NOT SENT</Text>
        </View>
      </View>

      <View style={styles.smsRecipient}>
        <MaterialCommunityIcons name="account-outline" size={13} color={Colors.onSurfaceVariant} />
        <Text style={styles.smsRecipientText}>
          {record.recipientName} · {record.to}
        </Text>
      </View>

      <View style={styles.smsBubble}>
        <Text style={styles.smsBubbleText}>{record.body}</Text>
      </View>

      <View style={styles.smsFooter}>
        <Text style={styles.smsPatient}>
          Patient: {record.patientName} · {record.patientId}
        </Text>
        <Text style={styles.smsTime}>{formatTimeAgo(record.timestamp)}</Text>
      </View>

      <Text style={styles.smsDemoNote}>{record.demoNote}</Text>
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

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
    color: Colors.onSurface,
    letterSpacing: -0.3,
  },
  headerSub: { fontSize: FontSize.xs, color: Colors.onSurfaceVariant, marginTop: 1 },
  markReadBtn: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  markReadText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurfaceVariant,
  },
  tabRail: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
  },
  tabActive: { backgroundColor: Colors.primary },
  tabText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.onSurfaceVariant,
  },
  tabTextActive: { color: Colors.onPrimary },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  tabBadgeText: { fontSize: 10, fontWeight: FontWeight.bold, color: '#fff' },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.sm,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl * 2,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.onSurfaceVariant,
  },
  emptyBody: {
    fontSize: FontSize.sm,
    color: Colors.outline,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.xxl,
  },
  alertCard: {
    borderLeftWidth: 4,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  alertCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  severityBadgeText: { fontSize: 10, fontWeight: FontWeight.extrabold, letterSpacing: 0.3 },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radius.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  targetBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
    color: Colors.onSurfaceVariant,
    textTransform: 'capitalize',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
    marginLeft: 'auto',
  },
  alertCardTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurface,
  },
  alertCardBody: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
  },
  alertCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertCardPatient: {
    fontSize: 10,
    color: Colors.outline,
  },
  alertCardTime: {
    fontSize: 10,
    color: Colors.outline,
  },
  smsNotice: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: Colors.primaryFixed,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
  },
  smsNoticeTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurface,
    marginBottom: 4,
  },
  smsNoticeBody: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
  },
  code: {
    fontFamily: 'monospace',
    backgroundColor: Colors.surfaceContainer,
  },
  smsCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  smsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  smsRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  smsRoleText: { fontSize: 10, fontWeight: FontWeight.extrabold, letterSpacing: 0.4 },
  smsStatusBadge: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  smsStatusText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.4,
  },
  smsRecipient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  smsRecipientText: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    fontWeight: FontWeight.medium,
  },
  smsBubble: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    borderTopLeftRadius: 4,
    padding: Spacing.md,
  },
  smsBubbleText: {
    fontSize: FontSize.sm,
    color: Colors.onSurface,
    lineHeight: 20,
  },
  smsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  smsPatient: { fontSize: 10, color: Colors.onSurfaceVariant },
  smsTime: { fontSize: 10, color: Colors.outline },
  smsDemoNote: {
    fontSize: 10,
    color: Colors.outline,
    fontStyle: 'italic',
    lineHeight: 15,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.outlineVariant,
    paddingTop: Spacing.sm,
  },
});
