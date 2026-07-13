/**
 * Shared password rules — keep in sync with backend
 * api/v1/schema/user.py (validate_password_strength).
 */

export const PASSWORD_MIN_LENGTH = 8;

export type PasswordRuleId = 'length' | 'upper' | 'lower' | 'digit' | 'match';

export type PasswordRule = {
  id: PasswordRuleId;
  label: string;
  ok: boolean;
};

export function getPasswordRules(password: string, confirm?: string): PasswordRule[] {
  const rules: PasswordRule[] = [
    {
      id: 'length',
      label: `At least ${PASSWORD_MIN_LENGTH} characters`,
      ok: password.length >= PASSWORD_MIN_LENGTH,
    },
    {
      id: 'upper',
      label: 'At least one uppercase letter (A–Z)',
      ok: /[A-Z]/.test(password),
    },
    {
      id: 'lower',
      label: 'At least one lowercase letter (a–z)',
      ok: /[a-z]/.test(password),
    },
    {
      id: 'digit',
      label: 'At least one number (0–9)',
      ok: /\d/.test(password),
    },
  ];

  if (confirm !== undefined) {
    rules.push({
      id: 'match',
      label: 'Passwords match',
      ok: password.length > 0 && password === confirm,
    });
  }

  return rules;
}

export function isPasswordStrong(password: string): boolean {
  return getPasswordRules(password).every((r) => r.ok);
}

export function passwordsMatch(password: string, confirm: string): boolean {
  return password.length > 0 && password === confirm;
}

/** First failing rule message, or null if strong. */
export function passwordError(password: string): string | null {
  const fail = getPasswordRules(password).find((r) => !r.ok);
  return fail ? fail.label : null;
}
