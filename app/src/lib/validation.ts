const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required';
  if (!EMAIL_RE.test(email)) return 'Please enter a valid email (e.g., name@domain.com)';
  return null;
}

export interface PasswordRule {
  key: string;
  label: string;
  test: (pw: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { key: 'length', label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { key: 'uppercase', label: 'One uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { key: 'lowercase', label: 'One lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { key: 'number', label: 'One number', test: (pw) => /\d/.test(pw) },
  { key: 'special', label: 'One special character (!@#$…)', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required';
  const failing = PASSWORD_RULES.filter((r) => !r.test(password));
  if (failing.length > 0) return `Password must have: ${failing.map((r) => r.label.toLowerCase()).join(', ')}`;
  return null;
}

export function getPasswordRuleResults(password: string): { rule: PasswordRule; passed: boolean }[] {
  return PASSWORD_RULES.map((rule) => ({ rule, passed: rule.test(password) }));
}
