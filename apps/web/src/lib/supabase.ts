import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/features/auth/types/database';

type SupabaseEnvironment = {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
};

const AUTH_PERSISTENCE_KEY = 'alsera-auth-persistence';

type AuthStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const authStorage: AuthStorage = {
  async getItem(key) {
    if (typeof window === 'undefined') {
      return null;
    }

    return getPreferredAuthStorage().getItem(key);
  },
  async setItem(key, value) {
    if (typeof window === 'undefined') {
      return;
    }

    const preferredStorage = getPreferredAuthStorage();
    const otherStorage =
      preferredStorage === window.localStorage ? window.sessionStorage : window.localStorage;
    otherStorage.removeItem(key);
    preferredStorage.setItem(key, value);
  },
  async removeItem(key) {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
    window.localStorage.removeItem(AUTH_PERSISTENCE_KEY);
  },
};

function getPreferredAuthStorage(): Storage {
  return window.localStorage.getItem(AUTH_PERSISTENCE_KEY) === 'session'
    ? window.sessionStorage
    : window.localStorage;
}

export function setSupabaseAuthPersistence(rememberMe: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(AUTH_PERSISTENCE_KEY, rememberMe ? 'persistent' : 'session');
}

export class SupabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupabaseConfigurationError';
  }
}

export function validateSupabaseEnvironment(
  environment: Partial<SupabaseEnvironment>,
): SupabaseEnvironment {
  const url = environment.VITE_SUPABASE_URL?.trim();
  const anonKey = environment.VITE_SUPABASE_ANON_KEY?.trim();
  const missing = [!url && 'VITE_SUPABASE_URL', !anonKey && 'VITE_SUPABASE_ANON_KEY'].filter(
    (value): value is string => Boolean(value),
  );

  if (!url || !anonKey) {
    throw new SupabaseConfigurationError(
      `Configure ${missing.join(' and ')} in the web application's environment.`,
    );
  }

  let supabaseUrl: URL;
  try {
    supabaseUrl = new URL(url);
  } catch {
    throw new SupabaseConfigurationError('VITE_SUPABASE_URL must be a valid absolute URL.');
  }

  const isLocalDevelopment =
    import.meta.env.DEV &&
    (supabaseUrl.hostname === 'localhost' || supabaseUrl.hostname === '127.0.0.1');

  if (
    supabaseUrl.protocol !== 'https:' &&
    !(isLocalDevelopment && supabaseUrl.protocol === 'http:')
  ) {
    throw new SupabaseConfigurationError(
      'VITE_SUPABASE_URL must use HTTPS outside local development.',
    );
  }

  if (supabaseUrl.username || supabaseUrl.password) {
    throw new SupabaseConfigurationError(
      'VITE_SUPABASE_URL must not contain embedded credentials.',
    );
  }

  if (isServiceRoleKey(anonKey)) {
    throw new SupabaseConfigurationError(
      'VITE_SUPABASE_ANON_KEY must be a publishable/anon key, never a service-role or secret key.',
    );
  }

  return {
    VITE_SUPABASE_URL: url,
    VITE_SUPABASE_ANON_KEY: anonKey,
  };
}

function isServiceRoleKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) {
    return true;
  }

  const [, payload] = key.split('.');
  if (!payload) {
    return false;
  }

  try {
    const base64 = payload.replace(/-/gu, '+').replace(/_/gu, '/');
    const decodedPayload = JSON.parse(atob(base64)) as { role?: unknown };
    return decodedPayload.role === 'service_role';
  } catch {
    return false;
  }
}

let clientPromise: Promise<SupabaseClient<Database>> | undefined;

export function getSupabaseClient(): Promise<SupabaseClient<Database>> {
  if (clientPromise) {
    return clientPromise;
  }

  const environment = validateSupabaseEnvironment({
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  });

  clientPromise = import('@supabase/supabase-js')
    .then(({ createClient }) =>
      createClient<Database>(environment.VITE_SUPABASE_URL, environment.VITE_SUPABASE_ANON_KEY, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
          persistSession: true,
          storage: authStorage,
        },
      }),
    )
    .catch((error: unknown) => {
      clientPromise = undefined;
      throw error;
    });

  return clientPromise;
}
