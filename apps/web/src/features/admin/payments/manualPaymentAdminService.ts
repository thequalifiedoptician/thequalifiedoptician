import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/features/auth/types/database';

type Client = SupabaseClient<Database>;
type Order = Database['public']['Tables']['orders']['Row'];
type Proof = Database['public']['Tables']['manual_payment_proofs']['Row'];

export type ManualPaymentAdminEntry = {
  proof: Proof;
  order: Order;
  screenshotUrl: string;
};

export type ManualPaymentMetrics = {
  pending_count: number;
  approved_today: number;
  rejected_count: number;
  total_manual_payments: number;
};

export async function loadManualPaymentMetrics(client: Client): Promise<ManualPaymentMetrics> {
  const { data, error } = await client.rpc('get_manual_payment_dashboard_metrics');
  if (error || !data?.[0]) throw new Error('Payment dashboard totals could not be loaded.');
  return data[0];
}

export async function loadPendingManualPayments(client: Client): Promise<ManualPaymentAdminEntry[]> {
  const { data: proofs, error: proofError } = await client
    .from('manual_payment_proofs')
    .select('*')
    .eq('verification_status', 'pending_verification')
    .not('payment_screenshot_url', 'is', null)
    .order('uploaded_at', { ascending: false });
  if (proofError) throw new Error('Pending payment proofs could not be loaded.');
  if (!proofs.length) return [];

  const { data: orders, error: orderError } = await client
    .from('orders')
    .select('*')
    .in(
      'id',
      proofs.map((proof) => proof.order_id),
    );
  if (orderError || !orders) throw new Error('Payment order details could not be loaded.');
  const ordersById = new Map(orders.map((order) => [order.id, order]));

  const entries = await Promise.all(
    proofs.map(async (proof) => {
      const order = ordersById.get(proof.order_id);
      if (!order || !proof.payment_screenshot_url) {
        throw new Error('A pending payment is missing its order or screenshot.');
      }
      const { data: signedFile, error: signedFileError } = await client.storage
        .from('manual-payment-proofs')
        .createSignedUrl(proof.payment_screenshot_url, 600);
      if (signedFileError || !signedFile) {
        throw new Error('A payment screenshot could not be opened securely.');
      }
      return { proof, order, screenshotUrl: signedFile.signedUrl };
    }),
  );
  return entries;
}

export async function reviewManualPayment(
  client: Client,
  proofId: string,
  action: 'approve' | 'reject' | 'request_reupload',
  adminNote: string,
): Promise<string> {
  const { data, error } = await client.rpc('verify_manual_payment_proof', {
    p_proof_id: proofId,
    p_action: action,
    p_admin_note: adminNote.trim() || null,
  });
  if (error || !data) throw new Error('The payment proof could not be updated.');
  return data;
}
