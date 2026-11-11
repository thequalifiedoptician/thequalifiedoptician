import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  clearSocialSettingsCache,
  getSocialSettings,
  SOCIAL_SETTINGS_SYNC_KEY,
  type SocialSettings,
} from './socialSettingsService';
import { SocialSettingsContext } from './socialSettingsContext';

function getLoadErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Social media settings could not be loaded.';
}

export function SocialSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SocialSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getSocialSettings().then(
      (loadedSettings) => {
        if (active) {
          setSettings(loadedSettings);
          setError(null);
          setIsLoading(false);
        }
      },
      (loadError: unknown) => {
        if (active) {
          const message = getLoadErrorMessage(loadError);
          setError(message);
          setIsLoading(false);
          console.error(message, loadError);
        }
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const reload = useCallback(async () => {
    clearSocialSettingsCache();
    setIsLoading(true);
    setError(null);
    try {
      setSettings(await getSocialSettings());
    } catch (loadError) {
      const message = getLoadErrorMessage(loadError);
      setError(message);
      console.error(message, loadError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === SOCIAL_SETTINGS_SYNC_KEY) {
        void reload();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [reload]);

  const replaceSettings = useCallback((nextSettings: SocialSettings) => {
    setSettings(nextSettings);
    setError(null);
    setIsLoading(false);
  }, []);

  return (
    <SocialSettingsContext.Provider value={{ settings, isLoading, error, reload, replaceSettings }}>
      {children}
    </SocialSettingsContext.Provider>
  );
}
