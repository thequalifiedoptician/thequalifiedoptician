import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/features/auth/types/database';
import { apiClient } from '@/lib/api-client';
import type { PaymentStatus } from '../payment/paymentTypes';

export type ConfirmedOrder = Database['public']['Tables']['orders']['Row'];
export type ConfirmedOrderItem = Database['public']['Tables']['order_items']['Row'];
export type ConfirmedPayment = Pick<
  Database['public']['Tables']['payments']['Row'],
  'id' | 'method_id' | 'status' | 'amount' | 'currency' | 'created_at' | 'updated_at'
>;

export type OrderConfirmationData = {
  order: ConfirmedOrder;
  items: ConfirmedOrderItem[];
  payment: ConfirmedPayment | null;
};

export class OrderConfirmationError extends Error {
  readonly code: 'not-found' | 'load-failed';

  constructor(code: 'not-found' | 'load-failed') {
    super(
      code === 'not-found'
        ? 'We could not find this order in your account.'
        : 'Your order details could not be loaded. Please try again.',
    );
    this.name = 'OrderConfirmationError';
    this.code = code;
  }
}

export async function loadOrderConfirmation(
  client: SupabaseClient<Database>,
  orderId: string,
  userId: string,
): Promise<OrderConfirmationData> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)) {
    throw new OrderConfirmationError('not-found');
  }

  const { data: order, error: orderError } = await client
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('user_id', userId)
    .maybeSingle();

  if (orderError) {
    throw new OrderConfirmationError('load-failed');
  }
  if (!order) {
    throw new OrderConfirmationError('not-found');
  }

  const [itemsResult, paymentResult] = await Promise.all([
    client
      .from('order_items')
      .select('*')
      .eq('order_id', order.id)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true }),
    client
      .from('payments')
      .select('id, method_id, status, amount, currency, created_at, updated_at')
      .eq('order_id', order.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (itemsResult.error || !itemsResult.data || paymentResult.error) {
    throw new OrderConfirmationError('load-failed');
  }

  return { order, items: itemsResult.data, payment: paymentResult.data };
}

const PAYMENT_STATUSES = new Set<PaymentStatus>([
  'pending',
  'processing',
  'authorized',
  'paid',
  'failed',
  'cancelled',
  'refunded',
]);

export async function loadPaymentStatus(
  paymentId: string,
  accessToken: string,
): Promise<PaymentStatus> {
  const response = await apiClient.get<{
    data?: { paymentId?: unknown; status?: unknown };
  }>(`/payments/${encodeURIComponent(paymentId)}/status`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const result = response.data.data;
  if (
    result?.paymentId !== paymentId ||
    typeof result.status !== 'string' ||
    !PAYMENT_STATUSES.has(result.status as PaymentStatus)
  ) {
    throw new OrderConfirmationError('load-failed');
  }
  return result.status as PaymentStatus;
}
