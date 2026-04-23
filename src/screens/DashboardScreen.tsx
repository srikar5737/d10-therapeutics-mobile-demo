import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadows } from '../theme/tokens';
import {
  useLivePain,
  useRiskStatus,
  useVitals,
  useWearableRuntime,
} from '../components/useSensorData';
import { VitalCard } from '../components/VitalCard';
import { RiskGauge } from '../components/RiskGauge';
import { EmergencyModal } from '../components/EmergencyModal';
import { WearableConnectionPill } from '../components/WearableConnectionPill';
import { WearableDevPanel } from '../components/WearableDevPanel';
import { signOutDemoSession } from '../state/session';

interface Props {
  navigation: any;
}

export function DashboardScreen({ navigation }: Props) {
  const [emergencyVisible, setEmergencyVisible] = useState(false);
  const [devPanelVisible, setDevPanelVisible] = useState(false);
  const { vitals, loading: vitalsLoading } = useVitals();
  const { risk, loading: riskLoading } = useRiskStatus();
  const livePain = useLivePain();
  const { runtime, setMode, connect, disconnect, injectSamplePayload } = useWearableRuntime();
  const vitalRows = Array.from({ length: Math.ceil(vitals.length / 2) }, (_, rowIndex) =>
    vitals.slice(rowIndex * 2, rowIndex * 2 + 2)
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.avatar}
          activeOpacity={0.8}
          onLongPress={() => setDevPanelVisible(true)}
        >
          <MaterialCommunityIcons name="account" size={22} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={styles.topBarTitle}>Metasebya Health</Text>
          <WearableConnectionPill state={runtime.connectionState} />
        </View>
        <TouchableOpacity
          style={styles.emergencyChip}
          onPress={() => setEmergencyVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.emergencyChipText}>EMERGENCY</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetingTitle}>Hello, Solomon.</Text>
          <Text style={styles.greetingSubtitle}>
            Your physiological markers are stable this morning.
          </Text>
        </View>

        {/* In-app patient alert banner (supportive, not alarming) */}
        {risk && (risk.level === 'high' || risk.level === 'moderate') && (
          <View style={styles.patientAlertBanner}>
            <MaterialCommunityIcons
              name={risk.level === 'high' ? 'alert-circle' : 'information'}
              size={18}
              color={risk.level === 'high' ? Colors.error : '#a04401'}
            />
            <Text style={[styles.patientAlertText, { color: risk.level === 'high' ? Colors.error : '#a04401' }]}>
              {risk.level === 'high'
                ? "Your readings suggest you may be experiencing elevated stress on your body. Please rest, drink fluids, and contact your caregiver."
                : "Some of your readings are slightly elevated today. Rest, stay hydrated, and monitor how you feel."}
            </Text>
          </View>
        )}

        {/* VOC Risk Gauge */}
        {risk && <RiskGauge risk={risk} />}

        {/* Live pain pill — only shown when the wearable actually reports pain.
            When painLevel is null the patient still uses the "Log Pain Level"
            CTA below to self-report, so no placeholder is shown here. */}
        {livePain.isLive && livePain.painLevel !== null ? (
          <LivePainPill painLevel={livePain.painLevel} />
        ) : null}

        {/* Vitals Bento Grid */}
        <View style={styles.vitalsGrid}>
          {vitalsLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Syncing with wearable...</Text>
            </View>
          ) : (
            vitalRows.map((row, rowIndex) => (
              <View style={styles.vitalsRow} key={rowIndex}>
                {row[0] ? <VitalCard vital={row[0]} /> : <View style={styles.vitalPlaceholder} />}
                <View style={{ width: Spacing.lg }} />
                {row[1] ? <VitalCard vital={row[1]} /> : <View style={styles.vitalPlaceholder} />}
              </View>
            ))
          )}
        </View>

        {/* Primary CTA */}
        <TouchableOpacity
          style={[styles.primaryCta, Shadows.md]}
          onPress={() => navigation.navigate('Pain')}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons
            name="plus-circle"
            size={22}
            color={Colors.onPrimary}
          />
          <Text style={styles.primaryCtaText}>Log Pain Level</Text>
        </TouchableOpacity>

        {/* Secondary CTA */}
        <TouchableOpacity
          style={styles.secondaryCta}
          onPress={() => navigation.navigate('Trends')}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryCtaText}>View Trends</Text>
        </TouchableOpacity>
      </ScrollView>

      <EmergencyModal
        visible={emergencyVisible}
        onClose={() => setEmergencyVisible(false)}
      />
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

function getLivePainTone(level: number) {
  if (level >= 8) return { color: Colors.error, label: 'Severe' };
  if (level >= 6) return { color: '#a04401', label: 'High' };
  if (level >= 4) return { color: '#b08000', label: 'Moderate' };
  return { color: Colors.primary, label: 'Mild' };
}

function LivePainPill({ painLevel }: { painLevel: number }) {
  const tone = getLivePainTone(painLevel);
  return (
    <View style={[styles.livePainCard, { borderLeftColor: tone.color }]}>
      <View style={styles.livePainBadge}>
        <MaterialCommunityIcons name="access-point" size={12} color={tone.color} />
        <Text style={[styles.livePainBadgeText, { color: tone.color }]}>LIVE</Text>
      </View>
      <View style={styles.livePainBody}>
        <Text style={styles.livePainLabel}>Current Pain</Text>
        <View style={styles.livePainValueRow}>
          <Text style={[styles.livePainValue, { color: tone.color }]}>
            {painLevel}
            <Text style={styles.livePainDenominator}> / 10</Text>
          </Text>
          <Text style={[styles.livePainTone, { color: tone.color }]}>{tone.label}</Text>
        </View>
        <Text style={styles.livePainHint}>Reported by wearable</Text>
      </View>
    </View>
  );
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
    fontWeight: FontWeight.semibold,
    color: Colors.onSurface,
    letterSpacing: -0.3,
  },
  emergencyChip: {
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  emergencyChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.error,
    letterSpacing: 0.5,
  },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: 100,
    gap: Spacing.xxl,
  },
  greeting: {
    gap: Spacing.xs,
  },
  greetingTitle: {
    fontSize: FontSize.hero,
    fontWeight: FontWeight.extrabold,
    color: Colors.onSurface,
    letterSpacing: -1,
  },
  greetingSubtitle: {
    fontSize: FontSize.base,
    color: Colors.onSurfaceVariant,
  },
  vitalsGrid: {
    gap: Spacing.lg,
  },
  vitalsRow: {
    flexDirection: 'row',
  },
  vitalPlaceholder: {
    flex: 1,
  },
  loadingContainer: {
    height: 140,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.onSurfaceVariant,
  },
  primaryCta: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xxl,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  primaryCtaText: {
    color: Colors.onPrimary,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  secondaryCta: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.xxl,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryCtaText: {
    color: Colors.onSurface,
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
  patientAlertBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: '#fff8f0',
    borderRadius: Radius.lg,
    borderLeftWidth: 3,
    borderLeftColor: '#a04401',
    padding: Spacing.md,
  },
  patientAlertText: {
    flex: 1,
    fontSize: FontSize.sm,
    lineHeight: 20,
    fontWeight: FontWeight.medium,
  },
  livePainCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    borderLeftWidth: 4,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  livePainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainer,
  },
  livePainBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
  },
  livePainBody: {
    flex: 1,
    gap: 2,
  },
  livePainLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  livePainValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  livePainValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.5,
  },
  livePainDenominator: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    color: Colors.onSurfaceVariant,
  },
  livePainTone: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  livePainHint: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
  },
});
