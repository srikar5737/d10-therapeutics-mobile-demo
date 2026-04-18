import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../theme/tokens';
import type { VocRiskStatus } from '../data/mockData';

interface Props {
  risk: VocRiskStatus;
}

export function RiskGauge({ risk }: Props) {
  const size = 180;
  const strokeWidth = 14;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Risk percentages for gauge
  const percentages = {
    low: 0.25,
    moderate: 0.55,
    high: 0.85,
  };
  
  const targetPct = percentages[risk.level];
  const dashOffset = circumference * (1 - targetPct);

  const levelColors = {
    low: Colors.primary,
    moderate: Colors.tertiary,
    high: Colors.error,
  };

  const activeColor = levelColors[risk.level];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>VOC Risk Assessment</Text>
      
      <View style={styles.gaugeWrapper}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="gaugeGradient" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor={Colors.primary} />
              <Stop offset="50%" stopColor={Colors.tertiary} />
              <Stop offset="100%" stopColor={Colors.error} />
            </LinearGradient>
          </Defs>
          
          {/* Background Track */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={Colors.surfaceContainerHigh}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />
          
          {/* Active Progress */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={activeColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90, ${center}, ${center})`}
          />
        </Svg>
        
        <View style={styles.contentOverlay}>
          <Text style={[styles.riskLabel, { color: activeColor }]}>{risk.label}</Text>
          <Text style={styles.riskStatus}>Current Status</Text>
        </View>
      </View>
      
      <View style={styles.infoBox}>
        <Text style={styles.description}>{risk.description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.lg,
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    alignSelf: 'flex-start',
  },
  gaugeWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  riskLabel: {
    fontSize: FontSize.hero,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -1,
  },
  riskStatus: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginTop: -2,
  },
  infoBox: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    width: '100%',
  },
  description: {
    fontSize: FontSize.md,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
    textAlign: 'center',
  },
});
