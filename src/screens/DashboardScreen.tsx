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
import { useVitals, useRiskStatus } from '../components/useSensorData';
import { VitalCard } from '../components/VitalCard';
import { RiskGauge } from '../components/RiskGauge';
import { EmergencyModal } from '../components/EmergencyModal';

interface Props {
  navigation: any;
}

export function DashboardScreen({ navigation }: Props) {
  const [emergencyVisible, setEmergencyVisible] = useState(false);
  const { vitals, loading: vitalsLoading } = useVitals();
  const { risk, loading: riskLoading } = useRiskStatus();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.avatar}>
          <MaterialCommunityIcons name="account" size={22} color={Colors.primary} />
        </View>
        <Text style={styles.topBarTitle}>Metasebya Health</Text>
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

        {/* VOC Risk Gauge */}
        {risk && <RiskGauge risk={risk} />}

        {/* Vitals Bento Grid */}
        <View style={styles.vitalsGrid}>
          {vitalsLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Syncing with wearable...</Text>
            </View>
          ) : (
            <>
              <View style={styles.vitalsRow}>
                {vitals[0] && <VitalCard vital={vitals[0]} />}
                <View style={{ width: Spacing.lg }} />
                {vitals[1] && <VitalCard vital={vitals[1]} />}
              </View>
              <View style={styles.vitalsRow}>
                {vitals[2] && <VitalCard vital={vitals[2]} />}
                <View style={{ width: Spacing.lg }} />
                {vitals[3] && <VitalCard vital={vitals[3]} />}
              </View>
            </>
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
    </SafeAreaView>
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
});
