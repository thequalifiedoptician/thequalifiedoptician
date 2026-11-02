import type { SupabaseClient } from '@supabase/supabase-js';
import { setSupabaseAuthPersistence } from '@/lib/supabase';
import { AUTH_OAUTH_RETURN_TO_KEY, AUTH_ROUTES } from '../constants/auth';
import type { Database } from '../types/database';
import { clearSession } from './sessionManager';
import { AuthServiceError, toAuthServiceError } from '../utils/authErrors';

export async function signOutUser(client: SupabaseClient<Database>): Promise<void> {
  await clearSession(client);
}

export async function signInWithEmail(
  client: SupabaseClient<Database>,
  email: string,
  password: string,
  rememberMe: boolean,
) {
  setSupabaseAuthPersistence(rememberMe);

  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    throw toAuthServiceError(error);
  }

  if (!data.session) {
    throw new AuthServiceError('session-missing');
  }

  return data.session;
}

export async function signUpWithEmail(
  client: SupabaseClient<Database>,
  fullName: string,
  email: string,
  password: string,
) {
  const emailRedirectTo = new URL('/auth/login', window.location.origin).toString();
  const { data, error } = await client.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { full_name: fullName.trim() },
      emailRedirectTo,
    },
  });

  if (error) {
    throw toAuthServiceError(error);
  }

  if (!data.user) {
    throw new AuthServiceError('unknown');
  }

  return { user: data.user, session: data.session };
}

export async function signInWithProvider(
  client: SupabaseClient<Database>,
  provider: 'google' | 'github',
  rememberMe: boolean,
  returnTo: string,
): Promise<void> {
  setSupabaseAuthPersistence(rememberMe);
  window.sessionStorage.setItem(AUTH_OAUTH_RETURN_TO_KEY, returnTo);

  const redirectTo = new URL('/auth/login', window.location.origin).toString();
  const { error } = await client.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  });

  if (error) {
    window.sessionStorage.removeItem(AUTH_OAUTH_RETURN_TO_KEY);
    throw toAuthServiceError(error);
  }
}

export async function requestPasswordReset(
  client: SupabaseClient<Database>,
  email: string,
): Promise<void> {
  const redirectTo = new URL(AUTH_ROUTES.resetPassword, window.location.origin);
  redirectTo.searchParams.set('flow', 'password-reset');

  const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: redirectTo.toString(),
  });

  if (error) {
    throw toAuthServiceError(error);
  }
}

export async function updatePassword(
  client: SupabaseClient<Database>,
  password: string,
): Promise<void> {
  const { data, error } = await client.auth.updateUser({ password });

  if (error) {
    throw toAuthServiceError(error);
  }

  if (!data.user) {
    throw new AuthServiceError('recovery-session-missing');
  }
}
