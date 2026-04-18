import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadows } from '../theme/tokens';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function EmergencyModal({ visible, onClose }: Props) {
  const handleCall911 = () => {
    Alert.alert('Demo', 'In production, this would call 911.');
    onClose();
  };

  const handleAlertCaregiver = () => {
    Alert.alert('Demo', 'Caregiver has been alerted with your current status and location.');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.sheet, Shadows.lg]}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons
                name="alert"
                size={32}
                color={Colors.error}
              />
            </View>
            <Text style={styles.title}>Emergency Alert</Text>
            <Text style={styles.subtitle}>
              Critical vital signs detected. Please select an action immediately.
            </Text>
          </View>

          {/* Location card */}
          <View style={styles.locationCard}>
            <View style={styles.locationHeader}>
              <MaterialCommunityIcons
                name="crosshairs-gps"
                size={16}
                color={Colors.onSurfaceVariant}
              />
              <Text style={styles.locationLabel}>Current Location</Text>
            </View>
            <Text style={styles.locationAddress}>450 Clinical Way, Suite 2A</Text>
            <Text style={styles.locationCity}>San Francisco, CA 94158</Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.btn911}
              onPress={handleCall911}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="hospital-building" size={22} color={Colors.onError} />
              <Text style={styles.btn911Text}>Call Emergency Services</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnCaregiver}
              onPress={handleAlertCaregiver}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="bell-ring" size={22} color={Colors.onPrimary} />
              <Text style={styles.btnCaregiverText}>Alert Caregiver</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnCancel}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.btnCancelText}>I am safe, cancel alert</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(25, 28, 32, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.xl,
    paddingBottom: 32,
    gap: Spacing.lg,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.outlineVariant,
    alignSelf: 'center',
    marginBottom: -Spacing.sm,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.errorContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: FontSize.xxl + 2,
    fontWeight: FontWeight.extrabold,
    color: Colors.onSurface,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
  },
  locationCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 2,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 2,
  },
  locationLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  locationAddress: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurface,
  },
  locationCity: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
  },
  actions: {
    gap: Spacing.sm,
  },
  btn911: {
    backgroundColor: Colors.error,
    borderRadius: Radius.lg,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  btn911Text: {
    color: Colors.onError,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  btnCaregiver: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  btnCaregiverText: {
    color: Colors.onPrimary,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  btnCancel: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  btnCancelText: {
    color: Colors.onSurfaceVariant,
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
  },
});
