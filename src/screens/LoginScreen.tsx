import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Colors,
  FontSize,
  FontWeight,
  Radius,
  Shadows,
  Spacing,
} from '../theme/tokens';
import {
  DemoRole,
  ROLE_LABELS,
  setDemoSession,
} from '../state/session';

interface RoleOption {
  role: DemoRole;
  icon: string;
  description: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: 'patient',
    icon: 'account-heart',
    description: 'Live wearable insights and daily care',
  },
  {
    role: 'caregiver',
    icon: 'shield-account',
    description: 'Monitor vitals and adherence remotely',
  },
  {
    role: 'hematologist',
    icon: 'stethoscope',
    description: 'Clinical profile and recent crisis history',
  },
];

const DEFAULT_EMAIL_BY_ROLE: Record<DemoRole, string> = {
  patient: 'solomon@d10.demo',
  caregiver: 'care@d10.demo',
  hematologist: 'dr.okafor@d10.demo',
};

export function LoginScreen() {
  const [email, setEmail] = useState('solomon@d10.demo');
  const [password, setPassword] = useState('demo1234');
  const [role, setRole] = useState<DemoRole>('patient');

  const handleRoleSelect = (nextRole: DemoRole) => {
    setRole(nextRole);
    setEmail(DEFAULT_EMAIL_BY_ROLE[nextRole]);
  };

  const handleEnter = () => {
    const trimmed = email.trim();
    setDemoSession({
      email: trimmed.length > 0 ? trimmed : DEFAULT_EMAIL_BY_ROLE[role],
      role,
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <View style={[styles.logo, Shadows.md]}>
              <MaterialCommunityIcons
                name="water"
                size={32}
                color={Colors.onPrimary}
              />
            </View>
            <Text style={styles.brandTitle}>D-10 Therapeutics</Text>
            <Text style={styles.brandSubtitle}>Clinical Demo Access</Text>
          </View>

          <View style={[styles.card, Shadows.sm]}>
            <Text style={styles.sectionLabel}>Sign in</Text>
            <View style={styles.field}>
              <MaterialCommunityIcons
                name="email-outline"
                size={18}
                color={Colors.onSurfaceVariant}
              />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={Colors.outline}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
            </View>
            <View style={styles.field}>
              <MaterialCommunityIcons
                name="lock-outline"
                size={18}
                color={Colors.onSurfaceVariant}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor={Colors.outline}
                secureTextEntry
                style={styles.input}
              />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Continue as</Text>
            <View style={styles.roles}>
              {ROLE_OPTIONS.map((option) => {
                const active = option.role === role;
                return (
                  <TouchableOpacity
                    key={option.role}
                    style={[styles.roleRow, active && styles.roleRowActive]}
                    onPress={() => handleRoleSelect(option.role)}
                    activeOpacity={0.85}
                  >
                    <View
                      style={[
                        styles.roleIcon,
                        active && styles.roleIconActive,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={option.icon as any}
                        size={22}
                        color={active ? Colors.onPrimary : Colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.roleLabel,
                          active && styles.roleLabelActive,
                        ]}
                      >
                        {ROLE_LABELS[option.role]}
                      </Text>
                      <Text style={styles.roleDescription}>
                        {option.description}
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name={active ? 'check-circle' : 'chevron-right'}
                      size={22}
                      color={active ? Colors.primary : Colors.outline}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, Shadows.md]}
            onPress={handleEnter}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryButtonText}>
              Enter Demo · {ROLE_LABELS[role]}
            </Text>
            <MaterialCommunityIcons
              name="arrow-right"
              size={20}
              color={Colors.onPrimary}
            />
          </TouchableOpacity>

          <Text style={styles.footerText}>
            Demo build. Not for clinical use.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  scroll: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.xl,
  },
  brand: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  brandTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    color: Colors.onSurface,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.onSurface,
    paddingVertical: Platform.OS === 'ios' ? 2 : 0,
  },
  roles: {
    gap: Spacing.sm,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  roleRowActive: {
    backgroundColor: Colors.primaryFixed,
    borderColor: Colors.primary,
  },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleIconActive: {
    backgroundColor: Colors.primary,
  },
  roleLabel: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurface,
  },
  roleLabelActive: {
    color: Colors.onSurface,
  },
  roleDescription: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.xxl,
    minHeight: 56,
    marginTop: Spacing.md,
  },
  primaryButtonText: {
    color: Colors.onPrimary,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  footerText: {
    textAlign: 'center',
    fontSize: FontSize.xs,
    color: Colors.outline,
    marginTop: Spacing.md,
    letterSpacing: 0.4,
  },
});
