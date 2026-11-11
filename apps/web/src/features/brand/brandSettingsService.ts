import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/features/auth/types/database';
import { getSupabaseClient } from '@/lib/supabase';

export type BrandSettings = Database['public']['Tables']['brand_settings']['Row'];
export type BrandSettingsForm = Omit<
  BrandSettings,
  'id' | 'is_active' | 'created_at' | 'updated_at'
>;
export type BrandAssetKind = 'logo' | 'favicon';
export type UploadedBrandAsset = { path: string; url: string };

export const DEFAULT_BRAND_SETTINGS: BrandSettingsForm = {
  brand_name: 'AlSera',
  brand_tagline: 'Objects for living',
  browser_title: 'AlSera',
  logo_url: null,
  favicon_url: null,
  company_name: 'AlSera',
  company_email: '',
  company_phone: '',
  company_address: '',
  company_city: '',
  company_country: '',
  postal_code: '',
  google_maps_url: '',
  support_email: '',
  footer_copyright: '© {year} AlSera. A considered point of view.',
};

const BRAND_SETTINGS_COLUMNS =
  'id, is_active, brand_name, brand_tagline, browser_title, logo_url, favicon_url, company_name, company_email, company_phone, company_address, company_city, company_country, postal_code, google_maps_url, support_email, footer_copyright, created_at, updated_at';
const STORAGE_BUCKET = 'brand-assets';

let settingsCache: BrandSettings | null = null;
let settingsRequest: Promise<BrandSettings> | null = null;

async function getClient(): Promise<SupabaseClient<Database>> {
  return getSupabaseClient();
}

export function getBrandSettings(): Promise<BrandSettings> {
  if (settingsCache) {
    return Promise.resolve(settingsCache);
  }
  if (settingsRequest) {
    return settingsRequest;
  }

  settingsRequest = (async () => {
    const client = await getClient();
    const { data, error } = await client
      .from('brand_settings')
      .select(BRAND_SETTINGS_COLUMNS)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      throw new Error(`Brand settings could not be loaded: ${error.message}`);
    }
    if (!data) {
      throw new Error('No active brand settings exist. Ask an administrator to configure them.');
    }
    settingsCache = data;
    return data;
  })().catch((error: unknown) => {
    settingsRequest = null;
    throw error;
  });

  return settingsRequest;
}

export async function updateBrandSettings(
  id: string,
  settings: BrandSettingsForm,
): Promise<BrandSettings> {
  const client = await getClient();
  const { data, error } = await client
    .from('brand_settings')
    .update(settings)
    .eq('id', id)
    .eq('is_active', true)
    .select(BRAND_SETTINGS_COLUMNS)
    .single();

  if (error) {
    throw new Error(`Brand settings could not be saved: ${error.message}`);
  }
  settingsCache = data;
  settingsRequest = Promise.resolve(data);
  return data;
}

export function uploadLogo(file: File): Promise<UploadedBrandAsset> {
  return uploadBrandAsset(file, 'logo');
}

export function uploadFavicon(file: File): Promise<UploadedBrandAsset> {
  return uploadBrandAsset(file, 'favicon');
}

async function uploadBrandAsset(file: File, kind: BrandAssetKind): Promise<UploadedBrandAsset> {
  const limits =
    kind === 'logo'
      ? {
          maxBytes: 5 * 1024 * 1024,
          mimeTypes: new Map([
            ['png', 'image/png'],
            ['svg', 'image/svg+xml'],
            ['webp', 'image/webp'],
            ['jpg', 'image/jpeg'],
            ['jpeg', 'image/jpeg'],
          ]),
        }
      : {
          maxBytes: 1024 * 1024,
          mimeTypes: new Map([
            ['png', 'image/png'],
            ['ico', 'image/x-icon'],
            ['svg', 'image/svg+xml'],
          ]),
        };
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const expectedMime = limits.mimeTypes.get(extension);

  if (!expectedMime || (file.type && !isAcceptedMime(file.type, expectedMime))) {
    throw new Error(
      kind === 'logo'
        ? 'Logo must be a PNG, SVG, WebP, or JPG image.'
        : 'Favicon must be a PNG, ICO, or SVG image.',
    );
  }
  if (file.size === 0 || file.size > limits.maxBytes) {
    throw new Error(
      kind === 'logo' ? 'Logo must be smaller than 5 MB.' : 'Favicon must be smaller than 1 MB.',
    );
  }

  const client = await getClient();
  const path = `${kind}/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: expectedMime,
    upsert: false,
  });
  if (error) {
    throw new Error(`${kind === 'logo' ? 'Logo' : 'Favicon'} upload failed: ${error.message}`);
  }

  const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

function isAcceptedMime(actual: string, expected: string): boolean {
  return (
    actual === expected ||
    (expected === 'image/x-icon' && actual === 'image/vnd.microsoft.icon') ||
    (expected === 'image/jpeg' && actual === 'image/jpg')
  );
}

export async function deleteBrandAsset(path: string): Promise<void> {
  const client = await getClient();
  const { error } = await client.storage.from(STORAGE_BUCKET).remove([path]);
  if (error) {
    throw new Error(`Brand asset could not be deleted: ${error.message}`);
  }
}

export function getBrandAssetPath(url: string | null): string | null {
  if (!url) {
    return null;
  }
  try {
    const pathname = new URL(url).pathname;
    const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
    const markerIndex = pathname.indexOf(marker);
    if (markerIndex < 0) {
      return null;
    }
    return decodeURIComponent(pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}
