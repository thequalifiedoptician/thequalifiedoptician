import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/features/auth/types/database';
import { getSupabaseClient } from '@/lib/supabase';

export type PaymentAccount = Database['public']['Tables']['payment_accounts']['Row'];

const QR_BUCKET = 'payment-account-qr';
const MAX_QR_BYTES = 5 * 1024 * 1024;
const ALLOWED_QR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

let cachedAccounts: PaymentAccount | null = null;
let accountsRequest: Promise<PaymentAccount> | null = null;

export async function getPaymentAccounts(
  client?: SupabaseClient<Database>,
): Promise<PaymentAccount> {
  if (cachedAccounts) return cachedAccounts;
  if (accountsRequest) return accountsRequest;

  accountsRequest = (async () => {
    const supabase = client ?? (await getSupabaseClient());
    const { data, error } = await supabase
      .from('payment_accounts')
      .select('*')
      .eq('id', 1)
      .single();
    if (error) throw new Error('Payment account settings could not be loaded.');
    cachedAccounts = data;
    return data;
  })();

  try {
    return await accountsRequest;
  } finally {
    accountsRequest = null;
  }
}

export async function savePaymentAccounts(
  updates: Database['public']['Tables']['payment_accounts']['Update'],
): Promise<PaymentAccount> {
  const client = await getSupabaseClient();
  const { data, error } = await client
    .from('payment_accounts')
    .update(updates)
    .eq('id', 1)
    .select('*')
    .single();

  if (error) throw new Error('Payment account settings could not be saved.');
  cachedAccounts = data;
  return data;
}

export async function resolvePaymentQrUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const client = await getSupabaseClient();
  return client.storage.from(QR_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function uploadPaymentQr(file: File): Promise<string> {
  if (!ALLOWED_QR_TYPES.has(file.type) || file.size > MAX_QR_BYTES) {
    throw new Error('Choose a PNG, JPG, or WEBP image smaller than 5 MB.');
  }

  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
  const path = `qr/${crypto.randomUUID()}.${extension}`;
  const client = await getSupabaseClient();
  const { error } = await client.storage.from(QR_BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error('The payment QR code could not be uploaded.');
  return path;
}
