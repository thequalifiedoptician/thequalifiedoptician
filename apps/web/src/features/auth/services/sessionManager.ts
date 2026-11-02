import type { AuthChangeEvent, Session, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { AuthServiceError, toAuthServiceError } from '../utils/authErrors';

export type AuthStateListener = (event: AuthChangeEvent, session: Session | null) => void;

export async function recoverSession(client: SupabaseClient<Database>): Promise<Session | null> {
  const { data, error } = await client.auth.getSession();

  if (error) {
    throw toAuthServiceError(error);
  }

  return data.session;
}

export function subscribeToAuthState(
  client: SupabaseClient<Database>,
  listener: AuthStateListener,
): () => void {
  const {
    data: { subscription },
  } = client.auth.onAuthStateChange((event, session) => {
    listener(event, session);
  });

  return () => subscription.unsubscribe();
}

export async function clearSession(client: SupabaseClient<Database>): Promise<void> {
  const { error } = await client.auth.signOut({ scope: 'local' });

  if (error) {
    throw toAuthServiceError(error);
  }
}

export async function refreshSession(client: SupabaseClient<Database>): Promise<Session> {
  const { data, error } = await client.auth.refreshSession();

  if (error) {
    throw toAuthServiceError(error);
  }

  if (!data.session) {
    throw new AuthServiceError('session-missing');
  }

  return data.session;
}
