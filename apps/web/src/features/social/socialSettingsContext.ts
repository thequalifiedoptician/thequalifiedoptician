import { createContext, useContext } from 'react';
import type { SocialSettings } from './socialSettingsService';

export type SocialSettingsContextValue = {
  settings: SocialSettings | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  replaceSettings: (settings: SocialSettings) => void;
};

export const SocialSettingsContext = createContext<SocialSettingsContextValue | null>(null);

export function useSocialSettings(): SocialSettingsContextValue {
  const context = useContext(SocialSettingsContext);
  if (!context) {
    throw new Error('useSocialSettings must be used within a SocialSettingsProvider.');
  }
  return context;
}
