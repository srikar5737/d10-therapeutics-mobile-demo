import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadows } from '../theme/tokens';
import type { VitalReading } from '../data/mockData';

interface Props {
  vital: VitalReading;
}

export function VitalCard({ vital }: Props) {
  return (
    <View style={[styles.card, Shadows.sm]}>
      <View style={styles.header}>
        <MaterialCommunityIcons
          name={vital.icon as any}
          size={22}
          color={Colors.primaryContainer}
        />
        {vital.status === 'optimal' && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Optimal</Text>
          </View>
        )}
      </View>
      <View style={styles.valueRow}>
        <Text style={styles.value}>
          {vital.value}
          {vital.unit ? (
            <Text style={styles.unit}> {vital.unit}</Text>
          ) : null}
        </Text>
      </View>
      <Text style={styles.label}>{vital.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    justifyContent: 'space-between',
    minHeight: 140,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  badge: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.onSurfaceVariant,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontSize: FontSize.xxl + 4,
    fontWeight: FontWeight.bold,
    color: Colors.onSurface,
    letterSpacing: -1,
  },
  unit: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    color: Colors.onSurfaceVariant,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.xs,
  },
});
