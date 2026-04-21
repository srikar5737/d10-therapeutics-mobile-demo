import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../theme/tokens';
import { SensorMode, SensorRuntimeState, DYLAN_SAMPLE_PAYLOADS } from '../data/SensorAdapter';

interface Props {
  visible: boolean;
  runtime: SensorRuntimeState;
  onClose: () => void;
  onModeChange: (mode: SensorMode) => void;
  onConnectBle: () => void;
  onDisconnectBle: () => void;
  onInjectSample: (payload?: unknown) => void;
  onSignOut?: () => void;
}

const modes: SensorMode[] = ['mock', 'hardwareSnapshot', 'ble'];

const SAMPLE_BUTTONS: Array<{
  label: string;
  key: keyof typeof DYLAN_SAMPLE_PAYLOADS;
}> = [
  { label: 'Finger On (normal)', key: 'fingerOn' },
  { label: 'Finger Off', key: 'fingerOff' },
  { label: 'Finger On (low SpO₂)', key: 'fingerOnLow' },
];

export function WearableDevPanel({
  visible,
  runtime,
  onClose,
  onModeChange,
  onConnectBle,
  onDisconnectBle,
  onInjectSample,
  onSignOut,
}: Props) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.title}>Wearable Dev Panel</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>

            {/* Data Mode */}
            <Text style={styles.sectionLabel}>Data Mode</Text>
            <View style={styles.modeRow}>
              {modes.map((mode) => {
                const active = mode === runtime.mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.modeChip, active && styles.modeChipActive]}
                    onPress={() => onModeChange(mode)}
                  >
                    <Text style={[styles.modeText, active && styles.modeTextActive]}>
                      {mode === 'hardwareSnapshot' ? 'Hardware' : mode.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* BLE Controls */}
            <Text style={styles.sectionLabel}>BLE Controls</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.primaryButton} onPress={onConnectBle}>
                <Text style={styles.primaryButtonText}>Scan + Connect</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={onDisconnectBle}>
                <Text style={styles.secondaryButtonText}>Disconnect</Text>
              </TouchableOpacity>
            </View>

            {/* Dylan's Sample Payloads */}
            <Text style={styles.sectionLabel}>Inject Dylan's Sample Payloads</Text>
            <View style={styles.sampleGrid}>
              {SAMPLE_BUTTONS.map(({ label, key }) => (
                <TouchableOpacity
                  key={key}
                  style={styles.sampleButton}
                  onPress={() => onInjectSample(DYLAN_SAMPLE_PAYLOADS[key])}
                >
                  <Text style={styles.sampleButtonText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Runtime State */}
            <Text style={styles.sectionLabel}>Runtime</Text>
            <View style={styles.runtimeBox}>
              <Text style={styles.runtimeLine}>
                Mode: <Text style={styles.runtimeValue}>{runtime.mode}</Text>
              </Text>
              <Text style={styles.runtimeLine}>
                State: <Text style={styles.runtimeValue}>{runtime.connectionState}</Text>
              </Text>
              {runtime.lastError ? (
                <Text style={styles.errorLine}>Error: {runtime.lastError}</Text>
              ) : null}
              {runtime.lastParseError ? (
                <Text style={styles.warnLine}>Parse error: {runtime.lastParseError}</Text>
              ) : null}
            </View>

            {/* Last Raw Payload */}
            <Text style={styles.sectionLabel}>Last Raw Payload</Text>
            <View style={styles.payloadBox}>
              <Text style={styles.payloadText}>
                {runtime.lastRawPayload || 'No payload received yet.'}
              </Text>
            </View>

            {/* Last Normalized Payload */}
            <Text style={styles.sectionLabel}>Last Normalized Payload</Text>
            <View style={styles.payloadBox}>
              <Text style={styles.payloadText}>
                {runtime.lastNormalizedPayload || 'No payload received yet.'}
              </Text>
            </View>

            {onSignOut ? (
              <TouchableOpacity
                style={styles.signOutLink}
                onPress={() => {
                  onClose();
                  onSignOut();
                }}
              >
                <Text style={styles.signOutLinkText}>Sign out of demo</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.onSurface,
  },
  closeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainer,
  },
  closeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurfaceVariant,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  modeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  modeChip: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  modeChipActive: {
    backgroundColor: Colors.primary,
  },
  modeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurfaceVariant,
  },
  modeTextActive: {
    color: Colors.onPrimary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: Colors.onPrimary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: Colors.onSurface,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  sampleGrid: {
    gap: Spacing.sm,
  },
  sampleButton: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  sampleButtonText: {
    color: Colors.onSurface,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  runtimeBox: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  runtimeLine: {
    color: Colors.onSurfaceVariant,
    fontSize: FontSize.sm,
  },
  runtimeValue: {
    color: Colors.onSurface,
    fontWeight: FontWeight.semibold,
  },
  errorLine: {
    color: Colors.error,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  warnLine: {
    color: Colors.tertiary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  payloadBox: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  payloadText: {
    color: Colors.onSurfaceVariant,
    fontSize: FontSize.xs,
    lineHeight: 18,
  },
  signOutLink: {
    alignSelf: 'center',
    paddingVertical: Spacing.sm,
  },
  signOutLinkText: {
    color: Colors.onSurfaceVariant,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    textDecorationLine: 'underline',
  },
});
