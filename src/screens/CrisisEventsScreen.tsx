import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadows } from '../theme/tokens';
import { mockCrisisEvents, primaryTriggers, CrisisEvent, CrisisSeverity } from '../data/mockData';

const severityConfig: Record<
  CrisisSeverity,
  { color: string; bg: string; textColor: string }
> = {
  severe: {
    color: Colors.error,
    bg: Colors.errorContainer,
    textColor: Colors.onErrorContainer,
  },
  moderate: {
    color: Colors.tertiary,
    bg: Colors.tertiaryFixedDim,
    textColor: '#341100',
  },
  mild: {
    color: Colors.primary,
    bg: Colors.primaryFixedDim,
    textColor: '#001b3d',
  },
};

export function CrisisEventsScreen() {
  const takenCount = mockCrisisEvents.length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Crisis History</Text>
          <Text style={styles.subtitle}>
            Comprehensive log of acute events and identified triggers over the
            past 12 months.
          </Text>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, Shadows.sm]}>
            <Text style={styles.summaryLabel}>Total Events</Text>
            <Text style={styles.summaryValue}>{takenCount}</Text>
            <View style={styles.summaryTrend}>
              <MaterialCommunityIcons
                name="trending-down"
                size={16}
                color={Colors.primary}
              />
              <Text style={styles.summaryTrendText}>-2 from previous year</Text>
            </View>
          </View>

          <View style={[styles.summaryCard, Shadows.sm]}>
            <Text style={styles.summaryLabel}>Primary Triggers</Text>
            <View style={styles.triggerChips}>
              {primaryTriggers.map((t) => (
                <View key={t} style={styles.triggerChip}>
                  <Text style={styles.triggerChipText}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Timeline */}
        <Text style={styles.timelineTitle}>Event Timeline</Text>

        {mockCrisisEvents.map((event) => (
          <CrisisCard key={event.id} event={event} />
        ))}

        {/* Export CTA */}
        <TouchableOpacity
          style={[styles.exportBtn, Shadows.md]}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons
            name="export-variant"
            size={22}
            color={Colors.onPrimary}
          />
          <Text style={styles.exportBtnText}>Export for Clinician</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function CrisisCard({ event }: { event: CrisisEvent }) {
  const config = severityConfig[event.severity];

  return (
    <View style={[styles.eventCard, Shadows.sm]}>
      <View style={[styles.accentBar, { backgroundColor: config.color }]} />
      <View style={styles.eventContent}>
        {/* Header */}
        <View style={styles.eventHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eventDate}>{event.dateRange}</Text>
            <View style={styles.eventMeta}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={14}
                color={Colors.onSurfaceVariant}
              />
              <Text style={styles.eventMetaText}>
                Duration: {event.duration}
              </Text>
              <Text style={styles.eventMetaDot}>•</Text>
              <Text style={styles.eventMetaText}>{event.location}</Text>
            </View>
          </View>
          <View style={[styles.severityBadge, { backgroundColor: config.bg }]}>
            <Text
              style={[
                styles.severityText,
                { color: config.textColor },
              ]}
            >
              {event.severity.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Triggers */}
        <View style={styles.triggersSection}>
          <Text style={styles.triggersLabel}>Identified Triggers</Text>
          <View style={styles.triggerRow}>
            {event.triggers.map((t) => (
              <View key={t} style={styles.eventTrigger}>
                <Text style={styles.eventTriggerText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Notes */}
        {event.notes ? (
          <View style={styles.noteBg}>
            <Text style={styles.noteText}>{event.notes}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: 100,
    gap: Spacing.xxl,
  },
  header: { gap: Spacing.sm, paddingHorizontal: Spacing.xs },
  title: {
    fontSize: FontSize.hero,
    fontWeight: FontWeight.bold,
    color: Colors.onSurface,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: FontSize.base,
    color: Colors.onSurfaceVariant,
    lineHeight: 22,
  },
  // Summary
  summaryRow: { gap: Spacing.lg },
  summaryCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
  },
  summaryLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  summaryValue: {
    fontSize: FontSize.hero + 8,
    fontWeight: FontWeight.extrabold,
    color: Colors.onSurface,
    letterSpacing: -2,
  },
  summaryTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  summaryTrendText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.primary,
  },
  triggerChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  triggerChip: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  triggerChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.onSurfaceVariant,
  },
  // Timeline
  timelineTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.onSurface,
    paddingHorizontal: Spacing.xs,
  },
  eventCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  accentBar: { width: 6 },
  eventContent: {
    flex: 1,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eventDate: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.onSurface,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  eventMetaText: {
    fontSize: FontSize.md,
    color: Colors.onSurfaceVariant,
  },
  eventMetaDot: {
    color: Colors.outlineVariant,
  },
  severityBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  severityText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  triggersSection: { gap: Spacing.sm },
  triggersLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  triggerRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  eventTrigger: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  eventTriggerText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.onSurface,
  },
  noteBg: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.sm,
    padding: Spacing.md,
  },
  noteText: {
    fontSize: FontSize.md,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
  },
  exportBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  exportBtnText: {
    color: Colors.onPrimary,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
});
