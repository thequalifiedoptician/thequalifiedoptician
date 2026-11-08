import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/features/auth/types/database';

export type ShippingAddress = Database['public']['Tables']['shipping_addresses']['Row'];

export type ShippingAddressInput = Omit<
  Pick<
    ShippingAddress,
    | 'full_name'
    | 'phone'
    | 'email'
    | 'country'
    | 'region'
    | 'city'
    | 'postal_code'
    | 'street_address'
    | 'apartment'
    | 'delivery_notes'
  >,
  'apartment' | 'delivery_notes'
> & {
  apartment: string;
  delivery_notes: string;
};

function throwOnError(error: { message: string; code?: string } | null): void {
  if (!error) return;
  if (error.code === '23505') {
    throw new Error('Another address is being set as default. Please try again.');
  }
  if (error.code === '23514') {
    throw new Error('Some address details do not meet the required length or format.');
  }
  throw new Error(error.message);
}

export async function loadShippingAddresses(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<ShippingAddress[]> {
  const { data, error } = await client
    .from('shipping_addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false });
  throwOnError(error);
  if (!data) {
    throw new Error('Your saved shipping addresses could not be loaded.');
  }
  return data;
}

export async function saveShippingAddress(
  client: SupabaseClient<Database>,
  userId: string,
  addressId: string | null,
  input: ShippingAddressInput,
  makeDefault: boolean,
): Promise<ShippingAddress> {
  const { data: savedAddressId, error } = await client.rpc('save_shipping_address', {
    p_address_id: addressId,
    p_full_name: input.full_name.trim(),
    p_phone: input.phone.trim(),
    p_email: input.email.trim(),
    p_country: input.country.trim(),
    p_region: input.region.trim(),
    p_city: input.city.trim(),
    p_postal_code: input.postal_code.trim(),
    p_street_address: input.street_address.trim(),
    p_apartment: input.apartment.trim() || null,
    p_delivery_notes: input.delivery_notes.trim() || null,
    p_is_default: makeDefault,
  });
  throwOnError(error);
  if (!savedAddressId) {
    throw new Error('Your shipping address could not be saved.');
  }

  const { data, error: addressError } = await client
    .from('shipping_addresses')
    .select('*')
    .eq('user_id', userId)
    .eq('id', savedAddressId)
    .single();
  throwOnError(addressError);
  if (!data) {
    throw new Error('Your saved address could not be reloaded.');
  }
  return data;
}

export async function setDefaultShippingAddress(
  client: SupabaseClient<Database>,
  addressId: string,
): Promise<void> {
  const { error } = await client.rpc('set_default_shipping_address', {
    p_address_id: addressId,
  });
  throwOnError(error);
}

export async function deleteShippingAddress(
  client: SupabaseClient<Database>,
  addressId: string,
): Promise<void> {
  const { error } = await client.rpc('delete_shipping_address', {
    p_address_id: addressId,
  });
  throwOnError(error);
}
