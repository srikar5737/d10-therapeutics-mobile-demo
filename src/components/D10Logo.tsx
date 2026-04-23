/**
 * D-10 Therapeutics — Brand Logo Component
 *
 * Text-based logo lockup used as a placeholder until the real asset is available.
 *
 * To swap in the real logo:
 *   1. Add logo to assets/d10-logo.png (or .svg via expo-svg)
 *   2. Replace the <View> badge below with:
 *        <Image source={require('../../assets/d10-logo.png')} style={{ width: cfg.badgeSize, height: cfg.badgeSize }} resizeMode="contain" />
 *   3. Remove the text-based badge code
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontWeight } from '../theme/tokens';

type LogoSize = 'sm' | 'md' | 'lg';
type LogoVariant = 'dark' | 'light';

interface D10LogoProps {
  size?: LogoSize;
  variant?: LogoVariant;
}

const SIZE_CONFIG: Record<
  LogoSize,
  { badge: number; badgeRadius: number; badgeFont: number; nameFont: number; tagFont: number }
> = {
  sm: { badge: 30, badgeRadius: 8, badgeFont: 11, nameFont: 13, tagFont: 8 },
  md: { badge: 44, badgeRadius: 12, badgeFont: 16, nameFont: 17, tagFont: 9 },
  lg: { badge: 60, badgeRadius: 16, badgeFont: 21, nameFont: 22, tagFont: 10 },
};

export function D10Logo({ size = 'md', variant = 'dark' }: D10LogoProps) {
  const cfg = SIZE_CONFIG[size];
  const isDark = variant === 'dark';

  const badgeBg = isDark ? Colors.primary : '#ffffff';
  const badgeText = isDark ? '#ffffff' : Colors.primary;
  const nameColor = isDark ? Colors.onSurface : '#ffffff';
  const tagColor = isDark ? Colors.onSurfaceVariant : 'rgba(255,255,255,0.72)';

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.badge,
          { width: cfg.badge, height: cfg.badge, borderRadius: cfg.badgeRadius, backgroundColor: badgeBg },
        ]}
      >
        <Text style={[styles.badgeText, { fontSize: cfg.badgeFont, color: badgeText }]}>
          D10
        </Text>
      </View>
      <View style={styles.textBlock}>
        <Text style={[styles.name, { fontSize: cfg.nameFont, color: nameColor }]}>
          D-10 Therapeutics
        </Text>
        <Text style={[styles.tag, { fontSize: cfg.tagFont, color: tagColor }]}>
          CLINICAL MONITORING · DEMO
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.5,
  },
  textBlock: {
    gap: 2,
  },
  name: {
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
  },
  tag: {
    fontWeight: FontWeight.medium,
    letterSpacing: 0.8,
  },
});
