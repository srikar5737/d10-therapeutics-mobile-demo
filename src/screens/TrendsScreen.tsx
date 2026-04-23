import React, { useState } from 'react';
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
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadows } from '../theme/tokens';
import { useLivePain, useTrends } from '../components/useSensorData';

type Range = 'day' | 'week' | 'month';

// Live wearable metrics shown first. Temperature is kept as a
// demo/fallback card because the hardware does not emit it today.
type MetricConfig = {
  id: string;
  label: string;
  unit: string;
  color: string;
  /** True when the wearable is the source of record for this metric. */
  isLive: boolean;
};

const LIVE_METRICS: MetricConfig[] = [
  { id: 'spo2', label: 'SpO₂ Level', unit: '%', color: '#00488d', isLive: true },
  { id: 'heartRate', label: 'Heart Rate', unit: 'bpm', color: '#ba1a1a', isLive: true },
  { id: 'hemoglobin', label: 'Hb Trend Index', unit: 'idx', color: '#7b3200', isLive: true },
];

const DEMO_METRICS: MetricConfig[] = [
  { id: 'temperature', label: 'Temperature', unit: '°F', color: '#a04401', isLive: false },
];

export function TrendsScreen() {
  const [selectedRange, setSelectedRange] = useState<Range>('week');
  const livePain = useLivePain();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Trend Analysis</Text>
          <Text style={styles.subtitle}>D-10 Therapeutics Clinical Profile</Text>
        </View>

        {/* Segmented Control */}
        <View style={styles.segmented}>
          {(['day', 'week', 'month'] as Range[]).map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.segBtn, selectedRange === r && styles.segBtnActive]}
              onPress={() => setSelectedRange(r)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.segText,
                  selectedRange === r && styles.segTextActive,
                ]}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Live pain summary — only rendered when the wearable itself reports
            a pain level. Self-reported pain from the Log Pain screen is not
            shown here to avoid double-counting. */}
        {livePain.isLive && livePain.painLevel !== null ? (
          <LivePainSummaryCard painLevel={livePain.painLevel} />
        ) : null}

        {/* Live metric cards (wearable-driven) */}
        {LIVE_METRICS.map((m) => (
          <TrendCard
            key={m.id}
            metricId={m.id}
            label={m.label}
            unit={m.unit}
            color={m.color}
            range={selectedRange}
            isLive
          />
        ))}

        {/* Demo/fallback cards — clearly tagged so they are not confused
            with live wearable data. */}
        {DEMO_METRICS.map((m) => (
          <TrendCard
            key={m.id}
            metricId={m.id}
            label={m.label}
            unit={m.unit}
            color={m.color}
            range={selectedRange}
            isLive={false}
          />
        ))}

        {/* Clinical Note */}
        <View style={styles.noteCard}>
          <View style={styles.noteIcon}>
            <MaterialCommunityIcons
              name="lightbulb-on"
              size={22}
              color={Colors.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.noteTitle}>Clinical Note</Text>
            <Text style={styles.noteText}>
              The Hb Trend Index is a relative indicator on a 0–99.99 scale —
              not an absolute hemoglobin lab value. Continue routine
              self-care, take medications on schedule, and log pain as it
              changes. SpO₂ and heart rate trends remain the primary live
              indicators.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Live pain summary card ──────────────────────────────

function getLivePainTone(level: number) {
  if (level >= 8) return { color: Colors.error, label: 'Severe' };
  if (level >= 6) return { color: '#a04401', label: 'High' };
  if (level >= 4) return { color: '#b08000', label: 'Moderate' };
  return { color: Colors.primary, label: 'Mild' };
}

function LivePainSummaryCard({ painLevel }: { painLevel: number }) {
  const tone = getLivePainTone(painLevel);
  return (
    <View style={styles.trendOuter}>
      <View style={[styles.trendCard, Shadows.sm]}>
        <View style={[styles.trendAccent, { backgroundColor: tone.color + 'CC' }]} />
        <View style={styles.trendContent}>
          <View style={styles.trendHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.liveBadgeRow}>
                <MaterialCommunityIcons name="access-point" size={12} color={tone.color} />
                <Text style={[styles.liveBadgeText, { color: tone.color }]}>LIVE</Text>
              </View>
              <Text style={styles.trendLabel}>Current Pain</Text>
              <Text style={styles.trendEyebrow}>Reported by wearable</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.trendValue}>
                {painLevel}
                <Text style={styles.trendUnit}> / 10</Text>
              </Text>
              <View style={[styles.changeBadge, { backgroundColor: tone.color + '15' }]}>
                <Text style={[styles.changeText, { color: tone.color }]}>
                  {tone.label}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Mini Chart Component ───────────────────────────────

interface TrendCardProps {
  metricId: string;
  label: string;
  unit: string;
  color: string;
  range: 'day' | 'week' | 'month';
  /** When false, the card is rendered with a "Demo value" tag so the user
   *  knows the metric is not currently driven by the wearable. */
  isLive: boolean;
}

function TrendCard({ metricId, label, unit, color, range, isLive }: TrendCardProps) {
  const { data, loading } = useTrends(metricId, range);
  const width = Dimensions.get('window').width - 80;
  const height = 100;

  if (loading || data.length < 2) {
    return (
      <View style={styles.trendOuter}>
        <View style={[styles.trendCard, { height: 180, justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: Colors.onSurfaceVariant }}>Loading trend data...</Text>
        </View>
      </View>
    );
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const valRange = max - min || 1;
  const currentValue = values[values.length - 1];

  const points = values.map((v, i) => ({
    x: (i / (values.length - 1)) * width,
    y: height - ((v - min) / valRange) * (height * 0.8) - height * 0.1,
  }));

  // Build smooth path
  let linePath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const cpx = (points[i - 1].x + points[i].x) / 2;
    linePath += ` C ${cpx} ${points[i - 1].y}, ${cpx} ${points[i].y}, ${points[i].x} ${points[i].y}`;
  }

  const areaPath = linePath + ` L ${width} ${height} L 0 ${height} Z`;

  const first = values[0];
  const delta = currentValue - first;
  const stableThreshold = Math.max((max - min) * 0.15, 0.1);
  let changeIcon: 'minus' | 'trending-up' | 'trending-down' = 'minus';
  let changeColor: string = Colors.primary;
  let changeLabel = 'Stable';
  if (Math.abs(delta) >= stableThreshold) {
    const roundedDelta = Math.round(delta * 10) / 10;
    changeIcon = delta > 0 ? 'trending-up' : 'trending-down';
    changeColor = delta > 0 ? Colors.tertiary : Colors.primary;
    changeLabel = `${roundedDelta > 0 ? '+' : ''}${roundedDelta} ${unit}`.trim();
  }

  return (
    <View style={styles.trendOuter}>
      <View style={[styles.trendCard, Shadows.sm]}>
        <View style={[styles.trendAccent, { backgroundColor: color + 'CC' }]} />
        <View style={styles.trendContent}>
          {/* Header row */}
          <View style={styles.trendHeader}>
            <View style={{ flex: 1 }}>
              {!isLive ? (
                <View style={styles.demoBadgeRow}>
                  <MaterialCommunityIcons
                    name="flask-outline"
                    size={12}
                    color={Colors.onSurfaceVariant}
                  />
                  <Text style={styles.demoBadgeText}>DEMO VALUE</Text>
                </View>
              ) : null}
              <Text style={styles.trendLabel}>{label}</Text>
              <Text style={styles.trendEyebrow}>
                {isLive ? '7-Day Moving Average' : 'Not from wearable'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.trendValue}>
                {currentValue}
                <Text style={styles.trendUnit}> {unit}</Text>
              </Text>
              <View style={[styles.changeBadge, { backgroundColor: changeColor + '15' }]}>
                <MaterialCommunityIcons
                  name={changeIcon}
                  size={12}
                  color={changeColor}
                />
                <Text style={[styles.changeText, { color: changeColor }]}>
                  {changeLabel}
                </Text>
              </View>
            </View>
          </View>

          {/* Chart */}
          <View style={{ marginTop: Spacing.lg }}>
            <Svg width={width} height={height}>
              <Defs>
                <LinearGradient id={`grad-${metricId}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={color} stopOpacity={0.15} />
                  <Stop offset="100%" stopColor={color} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              {/* Grid lines */}
              <Line x1={0} y1={0} x2={width} y2={0} stroke={Colors.surfaceContainerHigh} strokeWidth={0.5} strokeDasharray="3,3" />
              <Line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke={Colors.surfaceContainerHigh} strokeWidth={0.5} strokeDasharray="3,3" />
              <Line x1={0} y1={height} x2={width} y2={height} stroke={Colors.surfaceContainerHigh} strokeWidth={0.5} strokeDasharray="3,3" />
              {/* Area */}
              <Path d={areaPath} fill={`url(#grad-${metricId})`} />
              {/* Line */}
              <Path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
              {/* End dot */}
              <Circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={4} fill={color} />
            </Svg>
            {/* X labels */}
            <View style={styles.xLabels}>
              {data.map((d, i) => (
                <Text
                  key={i}
                  style={[
                    styles.xLabel,
                    i === data.length - 1 && {
                      color: color,
                      fontWeight: FontWeight.bold,
                    },
                  ]}
                >
                  {i === data.length - 1 ? 'Today' : d.date}
                </Text>
              ))}
            </View>
          </View>
        </View>
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
  header: { alignItems: 'center', gap: Spacing.xs },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.onSurface,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.onSurfaceVariant,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.full,
    padding: 4,
    alignSelf: 'center',
    width: 240,
  },
  segBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  segBtnActive: {
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.sm,
  },
  segText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurfaceVariant,
  },
  segTextActive: {
    color: Colors.onSurface,
  },
  // Trend cards
  trendOuter: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.xxl,
    padding: Spacing.sm,
  },
  trendCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  trendAccent: { width: 5 },
  trendContent: { flex: 1, padding: Spacing.xl },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  trendLabel: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurface,
  },
  trendEyebrow: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  trendValue: {
    fontSize: FontSize.hero,
    fontWeight: FontWeight.extrabold,
    color: Colors.onSurface,
    letterSpacing: -1.5,
  },
  trendUnit: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    color: Colors.onSurfaceVariant,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    marginTop: 4,
  },
  changeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  demoBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHigh,
    marginBottom: 4,
  },
  demoBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.8,
  },
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainer,
    marginBottom: 4,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
  },
  xLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
  },
  xLabel: {
    fontSize: 10,
    color: Colors.outline,
    fontWeight: FontWeight.medium,
  },
  // Note
  noteCard: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  noteIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  noteTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.onSurface,
    marginBottom: 4,
  },
  noteText: {
    fontSize: FontSize.md,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
  },
});
