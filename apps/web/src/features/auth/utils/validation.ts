import { AUTH_VALIDATION } from '../constants/auth';
import type { ValidationResult } from '../types/auth';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const NAME_PATTERN = /^[\p{L}\p{M}\p{N} .'\u2018\u2019-]+$/u;

export type PasswordStrength = 'empty' | 'weak' | 'medium' | 'strong';

type PasswordRequirement = {
  label: string;
  met: boolean;
};

export function getPasswordRequirements(value: string): PasswordRequirement[] {
  return [
    { label: 'At least 8 characters', met: value.length >= AUTH_VALIDATION.passwordMinLength },
    { label: 'One uppercase letter', met: /\p{Lu}/u.test(value) },
    { label: 'One lowercase letter', met: /\p{Ll}/u.test(value) },
    { label: 'One number', met: /\d/u.test(value) },
    { label: 'One special character', met: /[^\p{L}\p{M}\d\s]/u.test(value) },
  ];
}

export function getPasswordStrength(value: string): PasswordStrength {
  if (!value) {
    return 'empty';
  }

  const completedRequirements = getPasswordRequirements(value).filter(
    (requirement) => requirement.met,
  ).length;

  if (completedRequirements === 5) {
    return 'strong';
  }
  if (completedRequirements >= 3) {
    return 'medium';
  }
  return 'weak';
}

export function validateEmail(value: string): ValidationResult {
  const email = value.trim();

  if (!email) {
    return { valid: false, error: 'Enter your email address.' };
  }

  if (email.length > AUTH_VALIDATION.emailMaxLength || !EMAIL_PATTERN.test(email)) {
    return { valid: false, error: 'Enter a valid email address.' };
  }

  return { valid: true };
}

export function validatePassword(value: string): ValidationResult {
  if (!value) {
    return { valid: false, error: 'Enter a password.' };
  }

  if (
    value.length < AUTH_VALIDATION.passwordMinLength ||
    value.length > AUTH_VALIDATION.passwordMaxLength
  ) {
    return {
      valid: false,
      error: `Use between ${AUTH_VALIDATION.passwordMinLength} and ${AUTH_VALIDATION.passwordMaxLength} characters.`,
    };
  }

  return { valid: true };
}

export function validateSignupPassword(value: string): ValidationResult {
  const lengthResult = validatePassword(value);
  if (!lengthResult.valid) {
    return lengthResult;
  }

  const unmetRequirements = getPasswordRequirements(value)
    .filter((requirement) => !requirement.met)
    .map((requirement) => requirement.label.toLowerCase());

  if (unmetRequirements.length > 0) {
    return {
      valid: false,
      error: `Add ${unmetRequirements.join(', ')} to strengthen your password.`,
    };
  }

  return { valid: true };
}

export function validateName(value: string): ValidationResult {
  const name = value.trim();

  if (!name) {
    return { valid: false, error: 'Enter your name.' };
  }

  if (
    name.length < AUTH_VALIDATION.nameMinLength ||
    name.length > AUTH_VALIDATION.nameMaxLength ||
    !NAME_PATTERN.test(name)
  ) {
    return {
      valid: false,
      error: `Use ${AUTH_VALIDATION.nameMinLength}–${AUTH_VALIDATION.nameMaxLength} characters with letters, numbers, spaces, apostrophes, periods, or hyphens.`,
    };
  }

  return { valid: true };
}

export function validateConfirmPassword(password: string, confirmation: string): ValidationResult {
  if (!confirmation) {
    return { valid: false, error: 'Confirm your password.' };
  }

  if (password !== confirmation) {
    return { valid: false, error: 'Passwords do not match.' };
  }

  return { valid: true };
}
