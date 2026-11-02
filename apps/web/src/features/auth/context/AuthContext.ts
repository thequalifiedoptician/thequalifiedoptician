import { createContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { AuthStatus } from '../types/auth';

export type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  error: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isPasswordRecovery: boolean;
  signOut: () => Promise<void>;
  clearPasswordRecovery: () => void;
  refreshSession: () => Promise<Session>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
