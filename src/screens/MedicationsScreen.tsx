import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadows } from '../theme/tokens';
import { mockMedications, Medication, MedStatus, TimeOfDay } from '../data/mockData';

const timeConfig: Record<TimeOfDay, { icon: string; label: string; color: string }> = {
  morning: { icon: 'weather-sunset-up', label: 'Morning', color: Colors.primary },
  afternoon: { icon: 'white-balance-sunny', label: 'Afternoon', color: Colors.secondary },
  evening: { icon: 'weather-night', label: 'Evening', color: Colors.onSurfaceVariant },
};

export function MedicationsScreen() {
  const [meds, setMeds] = useState(mockMedications);

  const takenCount = meds.filter((m) => m.status === 'taken').length;

  const handleLogDose = (id: string) => {
    setMeds((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, status: 'taken' as MedStatus, takenAt: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) }
          : m
      )
    );
    Alert.alert('Logged', 'Medication marked as taken.');
  };

  const groups: Record<TimeOfDay, Medication[]> = {
    morning: meds.filter((m) => m.timeOfDay === 'morning'),
    afternoon: meds.filter((m) => m.timeOfDay === 'afternoon'),
    evening: meds.filter((m) => m.timeOfDay === 'evening'),
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Today's Schedule</Text>
          <Text style={styles.subtitle}>
            {takenCount} of {meds.length} medications taken
          </Text>
        </View>

        {/* Time-of-day sections */}
        {(Object.keys(groups) as TimeOfDay[]).map((tod) => {
          const items = groups[tod];
          if (items.length === 0) return null;
          const cfg = timeConfig[tod];

          return (
            <View key={tod} style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                  name={cfg.icon as any}
                  size={22}
                  color={cfg.color}
                />
                <Text style={styles.sectionTitle}>{cfg.label}</Text>
              </View>

              {items.map((med) => (
                <MedCard
                  key={med.id}
                  med={med}
                  onLog={() => handleLogDose(med.id)}
                />
              ))}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Medication Card ────────────────────────────────────

function MedCard({ med, onLog }: { med: Medication; onLog: () => void }) {
  const isTaken = med.status === 'taken';

  return (
    <View
      style={[
        styles.medCard,
        Shadows.sm,
        isTaken && styles.medCardTaken,
      ]}
    >
      <View style={styles.medTop}>
        <View style={styles.medRow}>
          <View
            style={[
              styles.medIcon,
              {
                backgroundColor: isTaken
                  ? Colors.surfaceVariant
                  : med.timeOfDay === 'afternoon'
                  ? Colors.tertiaryFixed
                  : Colors.secondaryFixed,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={med.icon as any}
              size={24}
              color={
                isTaken
                  ? Colors.onSurfaceVariant
                  : med.timeOfDay === 'afternoon'
                  ? '#341100'
                  : '#0f1c30'
              }
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.medName,
                isTaken && styles.medNameTaken,
              ]}
            >
              {med.name}
            </Text>
            <Text style={styles.medDosage}>
              {med.dosage}
              {med.instructions ? ` • ${med.instructions}` : ''}
            </Text>
          </View>

          {isTaken && (
            <View style={styles.takenBadge}>
              <MaterialCommunityIcons
                name="check-circle"
                size={18}
                color={Colors.primary}
              />
              <Text style={styles.takenTime}>{med.takenAt}</Text>
            </View>
          )}
        </View>
      </View>

      {!isTaken && (
        <TouchableOpacity
          style={[
            styles.logBtn,
            med.timeOfDay === 'morning' || med.timeOfDay === 'evening'
              ? styles.logBtnPrimary
              : styles.logBtnSecondary,
          ]}
          onPress={onLog}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons
            name={
              med.timeOfDay === 'morning' || med.timeOfDay === 'evening'
                ? 'check-circle'
                : 'plus'
            }
            size={20}
            color={
              med.timeOfDay === 'morning' || med.timeOfDay === 'evening'
                ? Colors.onPrimary
                : Colors.onSurface
            }
          />
          <Text
            style={[
              styles.logBtnText,
              med.timeOfDay === 'afternoon' && {
                color: Colors.onSurface,
              },
            ]}
          >
            {med.timeOfDay === 'afternoon' ? 'Log Dose' : 'Log as Taken'}
          </Text>
        </TouchableOpacity>
      )}
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
  header: { gap: Spacing.xs },
  title: {
    fontSize: FontSize.hero,
    fontWeight: FontWeight.extrabold,
    color: Colors.onSurface,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: FontSize.base,
    color: Colors.onSurfaceVariant,
  },
  // Section
  section: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.xxl + 8,
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.onSurface,
  },
  // Med card
  medCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.xl,
  },
  medCardTaken: {
    backgroundColor: Colors.surfaceContainer,
    opacity: 0.8,
  },
  medTop: {},
  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  medIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  medName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.onSurface,
  },
  medNameTaken: {
    textDecorationLine: 'line-through',
    color: Colors.onSurfaceVariant,
  },
  medDosage: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    fontWeight: FontWeight.medium,
    marginTop: 2,
  },
  takenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  takenTime: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  logBtn: {
    borderRadius: Radius.lg,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  logBtnPrimary: {
    backgroundColor: Colors.primary,
  },
  logBtnSecondary: {
    backgroundColor: Colors.surfaceContainerHigh,
  },
  logBtnText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.onPrimary,
  },
});
