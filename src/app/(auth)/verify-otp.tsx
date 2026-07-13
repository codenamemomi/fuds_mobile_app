/**
 * OTP Verification Screen — Step 2 of 3
 * 6 individual digit boxes, auto-focus, 60s resend countdown.
 * POST /api/v1/auth/verify-otp → navigates to profile-setup
 * POST /api/v1/auth/resend-otp → resets countdown
 */

import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FudsButton } from '@/components/ui/fuds-button';
import { StepDots } from '@/components/ui/step-dots';
import { FudsColors, FudsRadius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function VerifyOtpScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { verifyOtp, resendOtp } = useAuth();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);

  const inputRefs = useRef<Array<TextInput | null>>(Array(OTP_LENGTH).fill(null));

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  function handleDigitChange(text: string, index: number) {
    const char = text.replace(/[^0-9]/g, '').slice(-1);
    const updated = [...digits];
    updated[index] = char;
    setDigits(updated);
    // Auto-advance or dismiss keyboard
    if (char) {
      if (index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      } else {
        Keyboard.dismiss();
      }
    }
  }

  function handleKeyPress(key: string, index: number) {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleVerify() {
    const code = digits.join('');
    if (code.length < OTP_LENGTH) {
      Alert.alert('Incomplete Code', `Please enter all ${OTP_LENGTH} digits.`);
      return;
    }
    if (!email) {
      Alert.alert('Error', 'Email not found. Please restart registration.');
      return;
    }
    setLoading(true);
    try {
      await verifyOtp({ email, otp: code });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid or expired OTP.';
      Alert.alert('Verification Failed', msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email || countdown > 0) return;
    setResending(true);
    try {
      await resendOtp({ email });
      setDigits(Array(OTP_LENGTH).fill(''));
      setCountdown(RESEND_SECONDS);
      inputRefs.current[0]?.focus();
      Alert.alert('Code Sent', 'A new OTP has been sent to your email.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to resend OTP.';
      Alert.alert('Error', msg);
    } finally {
      setResending(false);
    }
  }

  const maskedEmail = email
    ? email.replace(/(.{2}).+(@.+)/, '$1***$2')
    : '***';

  const countdownStr = `0:${countdown.toString().padStart(2, '0')}`;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <StepDots current={2} />
        </View>

        {/* Body */}
        <View style={styles.body}>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Verify Code</Text>
            <Text style={styles.subtitle}>
              We sent a {OTP_LENGTH}-digit code to{' '}
              <Text style={styles.emailHighlight}>{maskedEmail}</Text>. Enter it below.
            </Text>
          </View>

          {/* OTP boxes */}
          <View style={styles.otpRow}>
            {digits.map((digit, i) => (
              <TextInput
                key={i}
                ref={(r) => {
                  inputRefs.current[i] = r;
                }}
                style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                value={digit}
                onChangeText={(t) => handleDigitChange(t, i)}
                onKeyPress={({ nativeEvent: { key } }) => handleKeyPress(key, i)}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                selectTextOnFocus
                autoFocus={i === 0}
              />
            ))}
          </View>

          {/* Resend */}
          <View style={styles.resendRow}>
            <Text style={styles.resendText}>Didn&apos;t receive the code? </Text>
            <TouchableOpacity
              onPress={handleResend}
              disabled={countdown > 0 || resending}
            >
              <Text
                style={[
                  styles.resendAction,
                  countdown > 0 && styles.resendDisabled,
                ]}
              >
                {countdown > 0 ? `Resend in ${countdownStr}` : 'Resend'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* CTA */}
        <View style={styles.cta}>
          <FudsButton
            label="Verify & Proceed →"
            loading={loading}
            onPress={handleVerify}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: FudsColors.background,
    paddingHorizontal: 24,
    paddingBottom: 32,
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
  backArrow: { fontSize: 20, color: FudsColors.foreground },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.five,
  },
  titleBlock: { gap: 8 },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: FudsColors.foreground,
  },
  subtitle: {
    fontSize: 14,
    color: FudsColors.mutedForeground,
    lineHeight: 21,
  },
  emailHighlight: {
    color: FudsColors.foreground,
    fontWeight: '600',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  otpBox: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 60,
    borderWidth: 1.5,
    borderColor: FudsColors.border,
    borderRadius: FudsRadius.lg,
    fontSize: 24,
    fontWeight: '700',
    color: FudsColors.foreground,
    backgroundColor: FudsColors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  otpBoxFilled: {
    borderColor: FudsColors.primary,
    backgroundColor: FudsColors.accent,
    shadowColor: FudsColors.primary,
    shadowOpacity: 0.12,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: FudsColors.mutedForeground,
  },
  resendAction: {
    fontSize: 14,
    color: FudsColors.primary,
    fontWeight: '600',
  },
  resendDisabled: {
    color: FudsColors.mutedForeground,
  },
  cta: { gap: Spacing.three },
});
