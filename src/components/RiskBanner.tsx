import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../theme/tokens';
import type { VocRiskStatus } from '../data/mockData';

interface Props {
  risk: VocRiskStatus;
}

const levelColors = {
  low: { accent: Colors.primary, text: Colors.primary, icon: 'check-circle' as const },
  moderate: { accent: Colors.tertiary, text: Colors.tertiary, icon: 'alert-circle' as const },
  high: { accent: Colors.error, text: Colors.error, icon: 'alert-octagon' as const },
};

export function RiskBanner({ risk }: Props) {
  const config = levelColors[risk.level];

  return (
    <View style={styles.outer}>
      <Text style={styles.sectionLabel}>Current Assessment</Text>
      <View style={styles.card}>
        <View style={[styles.accentBar, { backgroundColor: config.accent }]} />
        <View style={styles.content}>
          <Text style={styles.eyebrow}>VOC Risk Status</Text>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: config.text }]}>{risk.label}</Text>
            <MaterialCommunityIcons
              name={config.icon}
              size={28}
              color={config.accent}
            />
          </View>
          <Text style={styles.description}>{risk.description}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  accentBar: {
    width: 6,
  },
  content: {
    flex: 1,
    padding: Spacing.xl,
    gap: Spacing.xs,
  },
  eyebrow: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  title: {
    fontSize: FontSize.xxl + 4,
    fontWeight: FontWeight.bold,
    letterSpacing: -1.5,
  },
  description: {
    fontSize: FontSize.md,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
});
