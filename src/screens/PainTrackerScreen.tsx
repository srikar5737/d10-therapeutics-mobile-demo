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
import Slider from '@react-native-community/slider';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadows } from '../theme/tokens';
import { symptomOptions } from '../data/mockData';

const painDescriptions: Record<number, string> = {
  0: 'No Pain',
  1: 'Minimal',
  2: 'Mild',
  3: 'Mild',
  4: 'Moderate',
  5: 'Moderate',
  6: 'Moderate',
  7: 'Severe Pain',
  8: 'Severe',
  9: 'Very Severe',
  10: 'Worst Possible',
};

function getPainColor(level: number) {
  if (level <= 3) return Colors.primary;
  if (level <= 6) return Colors.tertiary;
  return Colors.error;
}

export function PainTrackerScreen() {
  const [painLevel, setPainLevel] = useState(7);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['Joint Stiffness']);
  const [selectedBodyAreas, setSelectedBodyAreas] = useState<string[]>(['Joints']);

  const toggleSymptom = (s: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const toggleBodyArea = (a: string) => {
    setSelectedBodyAreas((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  };

  const handleSave = () => {
    Alert.alert(
      'Entry Saved',
      `Pain level ${painLevel}/10 logged.\nAreas: ${selectedBodyAreas.join(', ')}\nSymptoms: ${selectedSymptoms.join(', ')}`,
      [{ text: 'OK' }]
    );
  };

  const color = getPainColor(painLevel);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Record Pain</Text>
          <Text style={styles.subtitle}>
            Adjust the slider to match your current intensity level.
          </Text>
        </View>

        {/* Pain Input Card */}
        <View style={styles.painCard}>
          <View style={styles.painDisplay}>
            <View style={styles.painValueContainer}>
              <Text style={[styles.painNumber, { color }]}>{painLevel}</Text>
              <Text style={styles.painLabel}>{painDescriptions[painLevel]}</Text>
              <Text style={styles.painDesc}>
                {painLevel <= 3
                  ? 'Minimal impact on daily activities.'
                  : painLevel <= 6
                  ? 'Noticeable interference with tasks.'
                  : 'Interferes significantly with daily tasks.'}
              </Text>
            </View>
          </View>

          {/* Slider */}
          <View style={styles.sliderContainer}>
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderEndLabel}>0</Text>
              <Text style={styles.sliderEndLabel}>10</Text>
            </View>
            <View style={styles.sliderTrack}>
              <View
                style={[
                  styles.sliderFill,
                  {
                    width: `${(painLevel / 10) * 100}%`,
                    backgroundColor: color,
                  },
                ]}
              />
              <TouchableOpacity
                style={[styles.sliderThumb, { left: `${(painLevel / 10) * 100}%`, borderColor: color }]}
                activeOpacity={1}
              />
            </View>
            {/* Use invisible native slider on top for actual interaction */}
            <View style={styles.nativeSliderWrap}>
              <Slider
                style={{ width: '100%', height: 50 }}
                minimumValue={0}
                maximumValue={10}
                step={1}
                value={painLevel}
                onValueChange={(v: number) => setPainLevel(Math.round(v))}
                minimumTrackTintColor="transparent"
                maximumTrackTintColor="transparent"
                thumbTintColor={color}
              />
            </View>
          </View>

          {/* Body Area Mapping */}
          <View style={styles.symptomSection}>
            <Text style={styles.symptomTitle}>Body Area Mapping</Text>
            <View style={styles.chipGrid}>
              {['Head', 'Chest', 'Back', 'Abdomen', 'Arms', 'Legs', 'Joints'].map((area) => {
                const isSelected = selectedBodyAreas.includes(area);
                return (
                  <TouchableOpacity
                    key={area}
                    style={[
                      styles.chip,
                      isSelected && styles.chipSelected,
                    ]}
                    onPress={() => toggleBodyArea(area)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected,
                      ]}
                    >
                      {area}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Symptom Chips */}
          <View style={styles.symptomSection}>
            <Text style={styles.symptomTitle}>Accompanying Symptoms</Text>
            <View style={styles.chipGrid}>
              {symptomOptions.map((s) => {
                const isSelected = selectedSymptoms.includes(s);
                return (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.chip,
                      isSelected && styles.chipSelected,
                    ]}
                    onPress={() => toggleSymptom(s)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected,
                      ]}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, Shadows.md]}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons
            name="check-circle"
            size={22}
            color={Colors.onPrimary}
          />
          <Text style={styles.saveBtnText}>Save Entry</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: {
    padding: Spacing.xl,
    paddingBottom: 100,
    gap: Spacing.xxl,
  },
  header: { gap: Spacing.sm },
  title: {
    fontSize: FontSize.hero,
    fontWeight: FontWeight.bold,
    color: Colors.onSurface,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: FontSize.base,
    color: Colors.onSurfaceVariant,
  },
  painCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.xxl + 8,
    padding: Spacing.xxl,
    gap: Spacing.xxl,
  },
  painDisplay: {
    alignItems: 'center',
  },
  painValueContainer: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  painNumber: {
    fontSize: 80,
    fontWeight: FontWeight.bold,
    lineHeight: 88,
    letterSpacing: -4,
  },
  painLabel: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurface,
  },
  painDesc: {
    fontSize: FontSize.md,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 240,
  },
  sliderContainer: {
    position: 'relative',
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sliderEndLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.outlineVariant,
  },
  sliderTrack: {
    height: 12,
    backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 6,
  },
  sliderThumb: {
    position: 'absolute',
    top: -10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 3,
    marginLeft: -16,
    ...Shadows.md,
  },
  nativeSliderWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -20,
    opacity: 0.01,
  },
  symptomSection: {
    gap: Spacing.md,
  },
  symptomTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurface,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
  },
  chipText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.onSurfaceVariant,
  },
  chipTextSelected: {
    color: Colors.onPrimary,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  saveBtnText: {
    color: Colors.onPrimary,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
});
