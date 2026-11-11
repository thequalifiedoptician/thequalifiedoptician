import { useEffect, useState, type ReactNode } from 'react';
import { getBrandSettings } from './brandSettingsService';
import { BrandSettingsContext, initialSettings } from './brandSettingsContext';

export function BrandSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(initialSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getBrandSettings().then(
      (brandSettings) => {
        if (active) {
          setSettings(brandSettings);
          setIsLoading(false);
        }
      },
      (loadError: unknown) => {
        if (active) {
          const message =
            loadError instanceof Error ? loadError.message : 'Brand settings could not be loaded.';
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

  useEffect(() => {
    document.title = settings.browser_title || settings.brand_name || 'Brand';
    const existingLink = document.querySelector<HTMLLinkElement>('link[data-brand-favicon]');
    if (!settings.favicon_url) {
      existingLink?.remove();
      return;
    }

    const faviconLink = existingLink ?? document.createElement('link');
    faviconLink.rel = 'icon';
    faviconLink.href = settings.favicon_url;
    faviconLink.dataset.brandFavicon = 'true';
    if (!existingLink) {
      document.head.append(faviconLink);
    }
  }, [settings.brand_name, settings.browser_title, settings.favicon_url]);

  return (
    <BrandSettingsContext.Provider
      value={{
        settings,
        isLoading,
        error,
        replaceSettings: setSettings,
      }}
    >
      {children}
    </BrandSettingsContext.Provider>
  );
}
