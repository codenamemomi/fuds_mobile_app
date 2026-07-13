/**
 * Register Screen — Step 1 of 3
 * Collects: Full Name, Phone (+234 prefix), Email, Password
 * POST /api/v1/auth/register → navigates to verify-otp
 */

import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FudsButton } from '@/components/ui/fuds-button';
import { FudsInput } from '@/components/ui/fuds-input';
import { PasswordChecklist } from '@/components/ui/password-checklist';
import { StepDots } from '@/components/ui/step-dots';
import { FudsColors, FudsRadius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { safeGoBack } from '@/lib/navigation';
import { isPasswordStrong, passwordError, passwordsMatch } from '@/lib/password';

export default function RegisterScreen() {
  const { register } = useAuth();

  const [fullname, setFullname] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  function validate() {
    const errs: Record<string, string> = {};
    if (fullname.trim().length < 2) errs.fullname = 'Enter your full name';
    if (phone.replace(/\D/g, '').length < 7) errs.phone = 'Enter a valid phone number';
    if (!email.includes('@')) errs.email = 'Enter a valid email address';
    const strength = passwordError(password);
    if (strength) errs.password = strength;
    if (!passwordsMatch(password, passwordConfirm)) {
      errs.password_confirm = 'Passwords do not match';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;
    setLoading(true);
    try {
      await register({
        fullname: fullname.trim(),
        phone: `+234${phone.replace(/\D/g, '')}`,
        email: email.trim().toLowerCase(),
        password,
        password_confirm: passwordConfirm,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Registration failed. Please try again.';
      Alert.alert('Registration Error', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => safeGoBack('/(auth)/login')}
            >
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <StepDots current={1} />
          </View>

          {/* Title */}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>
              Join FUDS — Lagos&apos; premium food &amp; grocery scheduler.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <FudsInput
              label="Full Name"
              placeholder="e.g. Tunde Alao"
              autoCapitalize="words"
              returnKeyType="next"
              value={fullname}
              onChangeText={setFullname}
              onSubmitEditing={() => phoneRef.current?.focus()}
              error={errors.fullname}
              leftContent={<Text style={styles.fieldIcon}>👤</Text>}
            />

            {/* Phone field with +234 prefix */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>MOBILE NUMBER</Text>
              <View
                style={[
                  styles.phoneRow,
                  !!errors.phone && styles.phoneRowError,
                ]}
              >
                <View style={styles.dialCode}>
                  <Text style={styles.flag}>🇳🇬</Text>
                  <Text style={styles.dialCodeText}>+234</Text>
                  <View style={styles.dialDivider} />
                </View>
                <TextInput
                  ref={phoneRef}
                  style={styles.phoneInput}
                  placeholder="803 123 4567"
                  placeholderTextColor={FudsColors.mutedForeground}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                  value={phone}
                  onChangeText={setPhone}
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              </View>
              {errors.phone && <Text style={styles.fieldError}>{errors.phone}</Text>}
            </View>

            <FudsInput
              ref={emailRef}
              label="Email Address"
              placeholder="tunde@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={() => passwordRef.current?.focus()}
              error={errors.email}
              leftContent={<Text style={styles.fieldIcon}>✉️</Text>}
            />

            <FudsInput
              ref={passwordRef}
              label="Password"
              placeholder="Create a strong password"
              secureTextEntry={!showPassword}
              returnKeyType="next"
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={() => confirmRef.current?.focus()}
              error={errors.password}
              leftContent={<Text style={styles.fieldIcon}>🔒</Text>}
              rightContent={
                <Text
                  style={styles.togglePassword}
                  onPress={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              }
            />

            <FudsInput
              ref={confirmRef}
              label="Confirm password"
              placeholder="Re-enter your password"
              secureTextEntry={!showConfirm}
              returnKeyType="done"
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              onSubmitEditing={handleRegister}
              error={errors.password_confirm}
              leftContent={<Text style={styles.fieldIcon}>🔒</Text>}
              rightContent={
                <Text
                  style={styles.togglePassword}
                  onPress={() => setShowConfirm((v) => !v)}
                >
                  {showConfirm ? 'Hide' : 'Show'}
                </Text>
              }
            />

            <PasswordChecklist password={password} confirm={passwordConfirm} />
          </View>

          {/* CTA */}
          <View style={styles.cta}>
            <FudsButton
              label="Create Account →"
              loading={loading}
              disabled={!isPasswordStrong(password) || !passwordsMatch(password, passwordConfirm)}
              onPress={handleRegister}
            />
            <Text style={styles.terms}>
              By continuing, you agree to FUDS&apos;s{' '}
              <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>.
            </Text>

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already have an account? </Text>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <TouchableOpacity onPress={() => router.push('/(auth)/login' as any)}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: FudsColors.background,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.three,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: FudsColors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  backArrow: {
    fontSize: 20,
    color: FudsColors.foreground,
  },
  titleBlock: {
    gap: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: FudsColors.foreground,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 14,
    color: FudsColors.mutedForeground,
    lineHeight: 21,
  },
  form: {
    gap: Spacing.three,
  },
  fieldWrap: { gap: 6 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: FudsColors.foreground,
    letterSpacing: 1.2,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FudsColors.background,
    borderWidth: 1.5,
    borderColor: FudsColors.border,
    borderRadius: FudsRadius.md,
    paddingVertical: Spacing.two + 4,
    paddingHorizontal: Spacing.three,
  },
  phoneRowError: {
    borderColor: FudsColors.destructive,
  },
  dialCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 12,
    marginRight: 12,
  },
  flag: { fontSize: 20 },
  dialCodeText: {
    fontSize: 15,
    fontWeight: '700',
    color: FudsColors.foreground,
  },
  dialDivider: {
    width: 1,
    height: 20,
    backgroundColor: FudsColors.border,
    marginLeft: 4,
  },
  phoneInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: FudsColors.foreground,
    padding: 0,
  },
  fieldError: {
    fontSize: 12,
    color: FudsColors.destructive,
    fontWeight: '500',
  },
  fieldIcon: { fontSize: 16 },
  togglePassword: {
    fontSize: 13,
    color: FudsColors.primary,
    fontWeight: '600',
  },
  cta: {
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  terms: {
    fontSize: 12,
    color: FudsColors.mutedForeground,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  termsLink: {
    color: FudsColors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: FudsColors.mutedForeground,
  },
  loginLink: {
    fontSize: 14,
    color: FudsColors.primary,
    fontWeight: '700',
  },
});
