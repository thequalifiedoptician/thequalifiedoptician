import { createContext, useContext } from 'react';
import type { BrandSettings } from './brandSettingsService';

export type BrandSettingsContextValue = {
  settings: BrandSettings;
  isLoading: boolean;
  error: string | null;
  replaceSettings: (settings: BrandSettings) => void;
};

export const initialSettings: BrandSettings = {
  id: '',
  is_active: true,
  brand_name: 'Brand',
  brand_tagline: '',
  browser_title: 'Brand',
  logo_url: null,
  favicon_url: null,
  company_name: '',
  company_email: '',
  company_phone: '',
  company_address: '',
  company_city: '',
  company_country: '',
  postal_code: '',
  google_maps_url: '',
  support_email: '',
  footer_copyright: '',
  created_at: '',
  updated_at: '',
};

export const BrandSettingsContext = createContext<BrandSettingsContextValue | null>(null);

export function useBrandSettings(): BrandSettingsContextValue {
  const context = useContext(BrandSettingsContext);
  if (!context) {
    throw new Error('useBrandSettings must be used within a BrandSettingsProvider.');
  }
  return context;
}
