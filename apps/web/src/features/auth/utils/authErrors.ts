import type { AuthErrorCode } from '../types/auth';
import { SupabaseConfigurationError } from '@/lib/supabase';

const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  configuration: 'Authentication is not configured. Please try again later.',
  'invalid-credentials': 'The email or password was not recognized.',
  'email-not-confirmed': 'Confirm your email address before continuing.',
  'user-already-registered': 'An account already exists for this email address.',
  'weak-password': 'Choose a stronger password and try again.',
  'rate-limited': 'Too many attempts. Wait a moment and try again.',
  'recovery-link-expired': 'This reset link is invalid or has expired. Request a new one.',
  'recovery-session-missing': 'This reset link is no longer active. Request a new one.',
  'password-reused': 'Choose a password you have not used before.',
  'verification-link-expired': 'This verification link has expired. Request a new one.',
  'verification-link-invalid': 'This verification link is invalid. Request a new one.',
  'email-already-verified': 'This email address is already verified. You can sign in.',
  network: 'We could not reach the authentication service. Check your connection and try again.',
  'session-missing': 'Your session has ended. Please continue again.',
  unknown: 'Something went wrong. Please try again.',
};

const AUTH_ERROR_CODE_MAP: Record<string, AuthErrorCode> = {
  invalid_credentials: 'invalid-credentials',
  email_not_confirmed: 'email-not-confirmed',
  user_already_exists: 'user-already-registered',
  user_already_registered: 'user-already-registered',
  weak_password: 'weak-password',
  same_password: 'password-reused',
  otp_expired: 'recovery-link-expired',
  flow_state_expired: 'recovery-link-expired',
  email_exists: 'email-already-verified',
  email_already_confirmed: 'email-already-verified',
  over_email_send_rate_limit: 'rate-limited',
  over_request_rate_limit: 'rate-limited',
  too_many_requests: 'rate-limited',
  session_not_found: 'session-missing',
};

export class AuthServiceError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message = AUTH_ERROR_MESSAGES[code]) {
    super(message);
    this.name = 'AuthServiceError';
    this.code = code;
  }
}

export function getAuthErrorMessage(error: unknown): string {
  return toAuthServiceError(error).message;
}

export function toAuthServiceError(error: unknown): AuthServiceError {
  if (error instanceof AuthServiceError) {
    return error;
  }

  if (error instanceof SupabaseConfigurationError) {
    return new AuthServiceError('configuration', error.message);
  }

  if (isErrorLike(error) && error.name === 'AuthRetryableFetchError') {
    return new AuthServiceError('network');
  }

  if (isErrorLike(error) && (error.name?.includes('Auth') || error.status !== undefined)) {
    const mappedCode = error.code ? AUTH_ERROR_CODE_MAP[error.code] : undefined;
    if (mappedCode) {
      return new AuthServiceError(mappedCode);
    }

    if (error.status === 429) {
      return new AuthServiceError('rate-limited');
    }

    if (typeof error.status === 'number' && error.status >= 500) {
      return new AuthServiceError('network');
    }
  }

  return new AuthServiceError('unknown');
}

function isErrorLike(error: unknown): error is Error & {
  code?: string;
  status?: number;
} {
  return error instanceof Error;
}
