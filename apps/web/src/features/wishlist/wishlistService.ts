import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/features/auth/types/database';

function throwOnError(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

export async function loadWishlistProductIds(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<string[]> {
  const { data, error } = await client
    .from('wishlist_items')
    .select('product_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  throwOnError(error);
  if (!data) {
    throw new Error('Your wishlist could not be loaded.');
  }
  return data.map(({ product_id }) => product_id);
}

export async function addWishlistItem(
  client: SupabaseClient<Database>,
  userId: string,
  productId: string,
): Promise<void> {
  const { error } = await client
    .from('wishlist_items')
    .upsert(
      { user_id: userId, product_id: productId },
      { onConflict: 'user_id,product_id', ignoreDuplicates: true },
    );
  throwOnError(error);
}

export async function removeWishlistItem(
  client: SupabaseClient<Database>,
  userId: string,
  productId: string,
): Promise<void> {
  const { error } = await client
    .from('wishlist_items')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId);
  throwOnError(error);
}
