export type PasswordStrengthResult = {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasDigitOrSpecial: boolean;
  isValid: boolean;
};

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigitOrSpecial = /[\d\W_]/.test(password);
  const isValid = hasMinLength && hasUppercase && hasLowercase && hasDigitOrSpecial;
  return { hasMinLength, hasUppercase, hasLowercase, hasDigitOrSpecial, isValid };
}

export function doPasswordsMatch(a: string, b: string): boolean {
  return a === b;
}
