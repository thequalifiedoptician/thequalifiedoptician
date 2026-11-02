import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient, SupabaseConfigurationError } from '@/lib/supabase';
import { signOutUser } from '../services/authService';
import { recoverSession, refreshSession, subscribeToAuthState } from '../services/sessionManager';
import type { AuthState } from '../types/auth';
import type { Database } from '../types/database';
import { toAuthServiceError } from '../utils/authErrors';
import { AuthContext } from './AuthContext';

const INITIAL_AUTH_STATE: AuthState = {
  status: 'initializing',
  session: null,
  user: null,
  error: null,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(INITIAL_AUTH_STATE);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const clientRef = useRef<SupabaseClient<Database> | null>(null);

  useEffect(() => {
    let isMounted = true;
    let authEventVersion = 0;
    let unsubscribe = () => {};

    void Promise.resolve().then(async () => {
      if (!isMounted) {
        return;
      }

      try {
        const client = await getSupabaseClient();
        if (!isMounted) {
          return;
        }

        clientRef.current = client;
        unsubscribe = subscribeToAuthState(client, (event, session) => {
          authEventVersion += 1;
          if (isMounted) {
            if (event === 'PASSWORD_RECOVERY') {
              setIsPasswordRecovery(true);
            } else if (event === 'SIGNED_OUT') {
              setIsPasswordRecovery(false);
            }
            setAuthState(createAuthState(session));
          }
        });

        const initialVersion = authEventVersion;
        void recoverSession(client)
          .then((session) => {
            if (isMounted && authEventVersion === initialVersion) {
              setAuthState(createAuthState(session));
            }
          })
          .catch((error: unknown) => {
            if (isMounted && authEventVersion === initialVersion) {
              const authError = toAuthServiceError(error);
              setAuthState({
                status: 'error',
                session: null,
                user: null,
                error: authError.message,
              });
            }
          });
      } catch (error) {
        if (isMounted) {
          setAuthState(createInitializationErrorState(error));
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
      clientRef.current = null;
    };
  }, []);

  const signOut = useCallback(async () => {
    const client = clientRef.current;
    if (!client) {
      throw new Error('Cannot sign out because the authentication client is unavailable.');
    }

    await signOutUser(client);
  }, []);

  const refreshCurrentSession = useCallback(async () => {
    const client = clientRef.current;
    if (!client) {
      throw new Error(
        'Cannot refresh the session because the authentication client is unavailable.',
      );
    }

    return refreshSession(client);
  }, []);

  const clearPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
  }, []);

  const contextValue = useMemo(
    () => ({
      ...authState,
      isLoading: authState.status === 'initializing',
      isAuthenticated: authState.status === 'authenticated',
      isPasswordRecovery,
      signOut,
      clearPasswordRecovery,
      refreshSession: refreshCurrentSession,
    }),
    [authState, clearPasswordRecovery, isPasswordRecovery, refreshCurrentSession, signOut],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

function createAuthState(session: Session | null): AuthState {
  return {
    status: session ? 'authenticated' : 'unauthenticated',
    session,
    user: session?.user ?? null,
    error: null,
  };
}

function createInitializationErrorState(error: unknown): AuthState {
  if (error instanceof SupabaseConfigurationError) {
    return {
      status: 'unavailable',
      session: null,
      user: null,
      error: error.message,
    };
  }

  const authError = toAuthServiceError(error);
  return {
    status: 'error',
    session: null,
    user: null,
    error: authError.message,
  };
}
