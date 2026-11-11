import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/features/auth/types/database';

export type ManualPaymentProof = Database['public']['Tables']['manual_payment_proofs']['Row'];
export type ManualPaymentOrder = Database['public']['Tables']['orders']['Row'];

const PROOF_BUCKET = 'manual-payment-proofs';
const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const ALLOWED_PROOF_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export type ManualPaymentData = {
  proof: ManualPaymentProof;
  order: ManualPaymentOrder;
};

export function validateManualPaymentProofFile(file: File): void {
  if (!ALLOWED_PROOF_TYPES.has(file.type) || file.size === 0 || file.size > MAX_PROOF_BYTES) {
    throw new Error('Choose a PNG, JPG, JPEG, or WEBP screenshot smaller than 5 MB.');
  }
}

function getProofFileExtension(file: File): string {
  validateManualPaymentProofFile(file);
  return file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
}

export async function prepareManualPayment(
  client: SupabaseClient<Database>,
  orderId: string,
  paymentMethod: 'easypaisa' | 'jazzcash',
): Promise<string> {
  const { data, error } = await client.rpc('prepare_manual_payment', {
    p_order_id: orderId,
    p_payment_method: paymentMethod,
  });
  if (error || !data) {
    throw new Error('Payment account details could not be prepared. Please try again.');
  }
  return data;
}

export async function recordCashOnDelivery(
  client: SupabaseClient<Database>,
  orderId: string,
): Promise<void> {
  const { data, error } = await client.rpc('record_cash_on_delivery', { p_order_id: orderId });
  if (error || !data) {
    throw new Error('Cash on Delivery could not be recorded. Please retry your order.');
  }
}

export async function loadManualPaymentData(
  client: SupabaseClient<Database>,
  orderId: string,
  customerId: string,
): Promise<ManualPaymentData> {
  const [proofResult, orderResult] = await Promise.all([
    client
      .from('manual_payment_proofs')
      .select('*')
      .eq('order_id', orderId)
      .eq('customer_id', customerId)
      .maybeSingle(),
    client
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', customerId)
      .maybeSingle(),
  ]);
  if (proofResult.error || orderResult.error || !proofResult.data || !orderResult.data) {
    throw new Error('This payment request could not be found in your account.');
  }
  return { proof: proofResult.data, order: orderResult.data };
}

export async function uploadManualPaymentProof(
  client: SupabaseClient<Database>,
  customerId: string,
  orderId: string,
  proofId: string,
  file: File,
  transactionReference: string,
  previousPath: string | null,
): Promise<{ cleanupWarning: boolean }> {
  const extension = getProofFileExtension(file);
  const path = `${customerId}/${orderId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await client.storage.from(PROOF_BUCKET).upload(path, file, {
    cacheControl: '0',
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) {
    throw new Error('Your payment screenshot could not be uploaded. Please try again.');
  }

  const { error: submitError } = await client.rpc('submit_manual_payment_proof', {
    p_proof_id: proofId,
    p_storage_path: path,
    p_transaction_reference: transactionReference.trim() || null,
  });
  if (submitError) {
    const { error: cleanupError } = await client.storage.from(PROOF_BUCKET).remove([path]);
    if (cleanupError) {
      throw new Error(
        'The screenshot was uploaded, but its submission failed and the uploaded file could not be removed. Contact support.',
      );
    }
    throw new Error('Your payment proof could not be submitted. Please try again.');
  }

  if (previousPath && previousPath !== path) {
    const { error: previousFileError } = await client.storage
      .from(PROOF_BUCKET)
      .remove([previousPath]);
    return { cleanupWarning: Boolean(previousFileError) };
  }
  return { cleanupWarning: false };
}

export function getAccountSnapshot(value: Json): {
  holderName: string;
  mobileNumber: string;
  qrPath: string | null;
} {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('The saved payment account details are incomplete.');
  }
  const holderName = value.holder_name;
  const mobileNumber = value.mobile_number;
  const qrPath = value.qr_path;
  if (
    typeof holderName !== 'string' ||
    typeof mobileNumber !== 'string' ||
    (qrPath !== null && typeof qrPath !== 'string')
  ) {
    throw new Error('The saved payment account details are incomplete.');
  }
  return { holderName, mobileNumber, qrPath };
}
