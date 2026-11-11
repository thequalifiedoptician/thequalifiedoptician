import type { Database } from '@/features/auth/types/database';
import { getSupabaseClient } from '@/lib/supabase';

export type SocialSettings = Database['public']['Tables']['social_settings']['Row'];
export type SocialSettingsForm = Omit<SocialSettings, 'id' | 'updated_at'>;

export const DEFAULT_SOCIAL_SETTINGS: SocialSettingsForm = {
  whatsapp_number: '',
  whatsapp_message: '',
  facebook_url: '',
  instagram_url: '',
  tiktok_url: '',
  linkedin_url: '',
  youtube_url: '',
  twitter_url: '',
  pinterest_url: '',
  email: '',
  support_phone: '',
  enable_whatsapp: false,
  enable_facebook: false,
  enable_instagram: false,
  enable_tiktok: false,
  enable_linkedin: false,
  enable_youtube: false,
  enable_twitter: false,
  enable_pinterest: false,
  enable_email: false,
};

const SOCIAL_SETTINGS_COLUMNS =
  'id, whatsapp_number, whatsapp_message, facebook_url, instagram_url, tiktok_url, linkedin_url, youtube_url, twitter_url, pinterest_url, email, support_phone, enable_whatsapp, enable_facebook, enable_instagram, enable_tiktok, enable_linkedin, enable_youtube, enable_twitter, enable_pinterest, enable_email, updated_at';
export const SOCIAL_SETTINGS_SYNC_KEY = 'alsera-social-settings-updated';

let settingsCache: SocialSettings | null = null;
let settingsRequest: Promise<SocialSettings> | null = null;

export function getSocialSettings(): Promise<SocialSettings> {
  if (settingsCache) {
    return Promise.resolve(settingsCache);
  }
  if (settingsRequest) {
    return settingsRequest;
  }

  settingsRequest = (async () => {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from('social_settings')
      .select(SOCIAL_SETTINGS_COLUMNS)
      .eq('id', 1)
      .single();

    if (error) {
      throw new Error(`Social media settings could not be loaded: ${error.message}`);
    }

    settingsCache = data;
    return data;
  })().catch((error: unknown) => {
    settingsRequest = null;
    throw error;
  });

  return settingsRequest;
}

export async function updateSocialSettings(settings: SocialSettingsForm): Promise<SocialSettings> {
  const client = await getSupabaseClient();
  const { data, error } = await client
    .from('social_settings')
    .update(settings)
    .eq('id', 1)
    .select(SOCIAL_SETTINGS_COLUMNS)
    .single();

  if (error) {
    throw new Error(`Social media settings could not be saved: ${error.message}`);
  }

  settingsCache = data;
  settingsRequest = Promise.resolve(data);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(SOCIAL_SETTINGS_SYNC_KEY, `${data.updated_at}:${Date.now()}`);
    } catch (syncError) {
      console.warn('Settings were saved, but other tabs may need to be refreshed.', syncError);
    }
  }
  return data;
}

export function clearSocialSettingsCache(): void {
  settingsCache = null;
  settingsRequest = null;
}
