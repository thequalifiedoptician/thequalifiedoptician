import type { Session, User } from '@supabase/supabase-js';

export type AuthStatus =
  'initializing' | 'authenticated' | 'unauthenticated' | 'unavailable' | 'error';

export type AuthState = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  error: string | null;
};

export type ValidationResult = {
  valid: boolean;
  error?: string;
};

export type AuthErrorCode =
  | 'configuration'
  | 'invalid-credentials'
  | 'email-not-confirmed'
  | 'user-already-registered'
  | 'weak-password'
  | 'rate-limited'
  | 'recovery-link-expired'
  | 'recovery-session-missing'
  | 'password-reused'
  | 'verification-link-expired'
  | 'verification-link-invalid'
  | 'email-already-verified'
  | 'network'
  | 'session-missing'
  | 'unknown';
