/**
 * AuthContext — global auth state for the FUDS app.
 * Wraps the entire app and exposes sign-in, register, OTP, profile, sign-out.
 */

import { router } from 'expo-router';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  type LoginPayload,
  type RegisterPayload,
  type ResendOtpPayload,
  type UpdateProfilePayload,
  type UserRead,
  type VerifyOtpPayload,
  authApi,
} from '@/lib/api';
import { deleteToken, getToken, saveToken } from '@/lib/token';

// ─── Context shape ────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: UserRead | null;
  isLoading: boolean;
  isSignedIn: boolean;

  /** Called after successful register — navigates to verify-otp */
  register: (payload: RegisterPayload) => Promise<void>;

  /** Called after entering OTP code — navigates to profile-setup */
  verifyOtp: (payload: VerifyOtpPayload) => Promise<void>;

  /** Resends OTP */
  resendOtp: (payload: ResendOtpPayload) => Promise<void>;

  /** Called on login — stores token, navigates to (app) */
  signIn: (payload: LoginPayload) => Promise<void>;

  /** Updates profile, navigates to (app) */
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>;

  /** Logs out, clears token, navigates to (auth) */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserRead | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: check for a stored token and hydrate user
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const me = await authApi.getMe();
          setUser(me);
        }
      } catch {
        // Token expired or invalid — clear it
        await deleteToken();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const { access_token } = await authApi.register(payload);
    await saveToken(access_token);
    // Navigate to OTP screen, passing email via params
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push({ pathname: '/(auth)/verify-otp' as any, params: { email: payload.email } });
  }, []);

  const verifyOtp = useCallback(async (payload: VerifyOtpPayload) => {
    await authApi.verifyOtp(payload);
    // After verification, go to profile setup
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push({ pathname: '/(auth)/profile-setup' as any, params: { email: payload.email } });
  }, []);

  const resendOtp = useCallback(async (payload: ResendOtpPayload) => {
    await authApi.resendOtp(payload);
  }, []);

  const signIn = useCallback(async (payload: LoginPayload) => {
    const { access_token, user: loggedInUser } = await authApi.login(payload);
    await saveToken(access_token);
    setUser(loggedInUser);
    router.replace('/(app)' as any);
  }, []);

  const updateProfile = useCallback(async (payload: UpdateProfilePayload) => {
    const updated = await authApi.updateProfile(payload);
    setUser(updated);
    router.replace('/(app)' as any);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Even if logout fails server-side, clear locally
    }
    await deleteToken();
    setUser(null);
    router.replace('/(auth)/login' as any);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isSignedIn: !!user,
      register,
      verifyOtp,
      resendOtp,
      signIn,
      updateProfile,
      signOut,
    }),
    [user, isLoading, register, verifyOtp, resendOtp, signIn, updateProfile, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
