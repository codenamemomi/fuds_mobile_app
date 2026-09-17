/**
 * Login Screen
 * Phone (+234 prefix) + Password
 * POST /api/v1/auth/login → store JWT → navigate to (app)
 */

import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FudsButton } from '@/components/ui/fuds-button';
import { FudsInput } from '@/components/ui/fuds-input';
import { KeyboardScreen } from '@/components/ui/keyboard-screen';
import { FudsColors, FudsRadius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';

export default function LoginScreen() {
  const { signIn } = useAuth();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const passwordRef = useRef<TextInput>(null);

  function validate() {
    const errs: Record<string, string> = {};
    if (phone.replace(/\D/g, '').length < 7) errs.phone = 'Enter a valid phone number';
    if (password.length < 8) errs.password = 'Password must be at least 8 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    try {
      await signIn({
        phone: `+234${phone.replace(/\D/g, '')}`,
        password,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Login failed. Check your credentials.';
      Alert.alert('Login Error', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardScreen
        contentContainerStyle={styles.scroll}
        scrollToEndOnKeyboardShow
      >
        {/* Brand mark */}
        <View style={styles.brandMark}>
          <View style={styles.logoBox}>
            <Text style={styles.logoEmoji}>🥘</Text>
          </View>
          <Text style={styles.brandName}>FUDS</Text>
        </View>

        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your FUDS account.</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Phone with prefix */}
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
                style={styles.phoneInput}
                placeholder="803 123 4567"
                placeholderTextColor={FudsColors.mutedForeground}
                keyboardType="phone-pad"
                returnKeyType="next"
                value={phone}
                onChangeText={setPhone}
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>
            {errors.phone && <Text style={styles.fieldError}>{errors.phone}</Text>}
          </View>

          <FudsInput
            ref={passwordRef}
            label="Password"
            placeholder="Your password"
            secureTextEntry={!showPassword}
            returnKeyType="done"
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={handleLogin}
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
        </View>

        {/* CTA */}
        <View style={styles.cta}>
          <FudsButton
            label="Sign In →"
            loading={loading}
            onPress={handleLogin}
          />

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Don&apos;t have an account? </Text>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <TouchableOpacity onPress={() => router.replace('/(auth)/register' as any)}>
              <Text style={styles.registerLink}>Register</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FudsColors.background,
  },
  scroll: {
    // Avoid justifyContent: 'center' — it traps inputs under the Android keyboard
    paddingHorizontal: 24,
    paddingTop: Spacing.four,
    paddingBottom: 260,
    gap: Spacing.five,
  },
  brandMark: {
    alignItems: 'center',
    gap: 12,
    paddingTop: Spacing.two,
  },
  logoBox: {
    width: 72,
    height: 72,
    backgroundColor: FudsColors.primary,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: FudsColors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  logoEmoji: { fontSize: 34 },
  brandName: {
    fontSize: 22,
    fontWeight: '900',
    color: FudsColors.foreground,
    letterSpacing: 4,
  },
  titleBlock: { gap: 6 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: FudsColors.foreground,
  },
  subtitle: {
    fontSize: 14,
    color: FudsColors.mutedForeground,
  },
  form: { gap: Spacing.three },
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
  phoneRowError: { borderColor: FudsColors.destructive },
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
  cta: { gap: Spacing.three },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
    color: FudsColors.mutedForeground,
  },
  registerLink: {
    fontSize: 14,
    color: FudsColors.primary,
    fontWeight: '700',
  },
});
