import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../theme/tokens';
import { WearableConnectionState } from '../data/telemetrySink';

interface Props {
  state: WearableConnectionState;
}

const stateConfig: Record<WearableConnectionState, { label: string; color: string; bg: string }> = {
  disconnected: { label: 'Disconnected', color: Colors.outline, bg: Colors.surfaceContainer },
  scanning: { label: 'Scanning', color: Colors.tertiary, bg: Colors.tertiaryFixed },
  connecting: { label: 'Connecting', color: Colors.tertiary, bg: Colors.tertiaryFixed },
  connected: { label: 'Connected', color: Colors.success, bg: Colors.successContainer },
  receiving: { label: 'Receiving', color: Colors.primary, bg: Colors.primaryFixed },
  error: { label: 'Connection Error', color: Colors.error, bg: Colors.errorContainer },
};

export function WearableConnectionPill({ state }: Props) {
  const config = stateConfig[state];

  return (
    <View style={[styles.chip, { backgroundColor: config.bg }]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
});
