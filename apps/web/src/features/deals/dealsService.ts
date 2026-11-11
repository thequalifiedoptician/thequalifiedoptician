import { getSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/features/auth/types/database';

const DEAL_BANNER_BUCKET = 'deal-banners';
const MAX_BANNER_SIZE = 10 * 1024 * 1024;
const ALLOWED_BANNER_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

export type Deal = Database['public']['Tables']['deals']['Row'];
export type DealInput = Omit<Deal, 'id' | 'created_at' | 'updated_at'>;

function isWithinSchedule(deal: Deal, now: number): boolean {
  const startsAt = deal.starts_at ? Date.parse(deal.starts_at) : null;
  const endsAt = deal.ends_at ? Date.parse(deal.ends_at) : null;
  return (
    (startsAt === null || startsAt <= now) &&
    (endsAt === null || endsAt > now)
  );
}

export async function loadActiveDeals(): Promise<Deal[]> {
  const client = await getSupabaseClient();
  const { data, error } = await client
    .from('deals')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Deals could not be loaded: ${error.message}`);
  }
  return data.filter((deal) => isWithinSchedule(deal, Date.now()));
}

export async function loadAdminDeals(): Promise<Deal[]> {
  const client = await getSupabaseClient();
  const { data, error } = await client
    .from('deals')
    .select('*')
    .order('sort_order')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Deal posts could not be loaded: ${error.message}`);
  }
  return data;
}

export async function saveDeal(input: DealInput, id?: string): Promise<Deal> {
  const client = await getSupabaseClient();
  const result = id
    ? await client.from('deals').update(input).eq('id', id).select('*').single()
    : await client.from('deals').insert(input).select('*').single();

  if (result.error) {
    throw new Error(`Deal could not be saved: ${result.error.message}`);
  }
  return result.data;
}

export async function deleteDeal(id: string, imagePath: string): Promise<string | null> {
  const client = await getSupabaseClient();
  const { error } = await client.from('deals').delete().eq('id', id);
  if (error) {
    throw new Error(`Deal could not be deleted: ${error.message}`);
  }

  if (!imagePath) return null;
  const { error: imageError } = await client.storage
    .from(DEAL_BANNER_BUCKET)
    .remove([imagePath]);
  return imageError?.message ?? null;
}

export async function uploadDealBanner(file: File): Promise<{ path: string; url: string }> {
  if (!ALLOWED_BANNER_TYPES.has(file.type) || file.size === 0 || file.size > MAX_BANNER_SIZE) {
    throw new Error('Choose a JPG, PNG, WebP, or AVIF banner image up to 10 MB.');
  }

  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
  const path = `deals/${crypto.randomUUID()}.${extension}`;
  const client = await getSupabaseClient();
  const { error } = await client.storage.from(DEAL_BANNER_BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw new Error(`Deal banner could not be uploaded: ${error.message}`);
  }

  const url = client.storage.from(DEAL_BANNER_BUCKET).getPublicUrl(path).data.publicUrl;
  return { path, url };
}

export async function deleteDealBanner(path: string): Promise<void> {
  const client = await getSupabaseClient();
  const { error } = await client.storage.from(DEAL_BANNER_BUCKET).remove([path]);
  if (error) {
    throw new Error(`Unused deal banner could not be removed: ${error.message}`);
  }
}
