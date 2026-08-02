/**
 * Password & security — change password form.
 * POST /api/v1/auth/change-password
 */

import React, { useMemo, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { FudsButton } from '@/components/ui/fuds-button';
import { FudsInput } from '@/components/ui/fuds-input';
import { KeyboardScreen } from '@/components/ui/keyboard-screen';
import { PasswordChecklist } from '@/components/ui/password-checklist';
import { FudsRadius, FudsShadow, Spacing } from '@/constants/theme';
import { useFudsTheme } from '@/context/theme';
import { authApi } from '@/lib/api';
import { safeGoBack } from '@/lib/navigation';
import { isPasswordStrong, passwordError, passwordsMatch } from '@/lib/password';

export default function PasswordSecurityScreen() {
  const { colors } = useFudsTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!currentPassword) errs.current = 'Enter your current password';
    const strength = passwordError(newPassword);
    if (strength) errs.new = strength;
    if (!passwordsMatch(newPassword, confirmPassword)) {
      errs.confirm = 'Passwords do not match';
    }
    if (currentPassword && newPassword && currentPassword === newPassword) {
      errs.new = 'New password must be different from current password';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleChangePassword() {
    if (!validate()) return;
    setLoading(true);
    try {
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        password_confirm: confirmPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});
      Alert.alert('Password updated', 'Your password was changed successfully.', [
        { text: 'OK', onPress: () => safeGoBack('/(app)/settings') },
      ]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not change password';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  const canSubmit =
    currentPassword.length > 0 &&
    isPasswordStrong(newPassword) &&
    passwordsMatch(newPassword, confirmPassword) &&
    currentPassword !== newPassword;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => safeGoBack('/(app)/settings')}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Password & security</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardScreen contentContainerStyle={styles.scroll} offset={8}>
          <View style={styles.intro}>
            <View style={styles.introIcon}>
              <Ionicons name="lock-closed" size={22} color={colors.primary} />
            </View>
            <Text style={styles.introTitle}>Change password</Text>
            <Text style={styles.introSub}>
              Use a strong password you don&apos;t reuse on other apps.
            </Text>
          </View>

          <View style={styles.card}>
            <FudsInput
              label="Current password"
              placeholder="Your current password"
              secureTextEntry={!showCurrent}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              error={errors.current}
              leftContent={<Text style={styles.emoji}>🔑</Text>}
              rightContent={
                <Text style={styles.toggle} onPress={() => setShowCurrent((v) => !v)}>
                  {showCurrent ? 'Hide' : 'Show'}
                </Text>
              }
            />

            <FudsInput
              label="New password"
              placeholder="Create a strong password"
              secureTextEntry={!showNew}
              value={newPassword}
              onChangeText={setNewPassword}
              error={errors.new}
              leftContent={<Text style={styles.emoji}>🔒</Text>}
              rightContent={
                <Text style={styles.toggle} onPress={() => setShowNew((v) => !v)}>
                  {showNew ? 'Hide' : 'Show'}
                </Text>
              }
            />

            <FudsInput
              label="Confirm new password"
              placeholder="Re-enter new password"
              secureTextEntry={!showConfirm}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              error={errors.confirm}
              leftContent={<Text style={styles.emoji}>🔒</Text>}
              rightContent={
                <Text style={styles.toggle} onPress={() => setShowConfirm((v) => !v)}>
                  {showConfirm ? 'Hide' : 'Show'}
                </Text>
              }
            />

            <PasswordChecklist password={newPassword} confirm={confirmPassword} />

            <FudsButton
              label="Update password"
              loading={loading}
              disabled={!canSubmit}
              onPress={handleChangePassword}
              style={{ marginTop: Spacing.two }}
            />
          </View>
      </KeyboardScreen>
    </SafeAreaView>
  );
}

function makeStyles(c: {
  background: string;
  foreground: string;
  card: string;
  border: string;
  muted: string;
  mutedForeground: string;
  primary: string;
}) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.two,
      paddingVertical: Spacing.two,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    topTitle: { fontSize: 16, fontWeight: '800', color: c.foreground },
    scroll: { padding: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.three },
    intro: { gap: 6, marginBottom: Spacing.one },
    introIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: c.muted,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    introTitle: { fontSize: 20, fontWeight: '900', color: c.foreground },
    introSub: { fontSize: 13, color: c.mutedForeground, lineHeight: 19 },
    card: {
      backgroundColor: c.card,
      borderRadius: FudsRadius.xl,
      borderWidth: 1,
      borderColor: c.border,
      padding: Spacing.three,
      gap: Spacing.three,
      ...FudsShadow.sm,
    },
    emoji: { fontSize: 16 },
    toggle: { fontSize: 13, color: c.primary, fontWeight: '700' },
  });
}
