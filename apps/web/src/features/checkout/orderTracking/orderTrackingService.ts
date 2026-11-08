import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/features/auth/types/database';
import {
  loadOrderConfirmation,
  OrderConfirmationError,
  type OrderConfirmationData,
} from '../orderConfirmation/orderConfirmationService';

export type OrderTrackingPayment = NonNullable<OrderConfirmationData['payment']>;

export function trackingPaymentLabel(payment: OrderTrackingPayment | null): string {
  if (!payment) return 'Payment pending';
  switch (payment.status) {
    case 'paid':
      return 'Payment confirmed';
    case 'authorized':
      return 'Payment authorized';
    case 'processing':
      return 'Payment processing';
    case 'failed':
      return 'Payment failed';
    case 'cancelled':
      return 'Payment cancelled';
    case 'refunded':
      return 'Payment refunded';
    default:
      return 'Payment pending';
  }
}

export type TrackedProductImage = {
  url: string;
  alt: string;
};

export type OrderTrackingData = OrderConfirmationData & {
  payment: OrderTrackingPayment | null;
  productImages: Record<string, TrackedProductImage>;
};

export async function loadOrderTracking(
  client: SupabaseClient<Database>,
  orderId: string,
  userId: string,
): Promise<OrderTrackingData> {
  const confirmation = await loadOrderConfirmation(client, orderId, userId);

  const imagesResult = await (async () => {
    const productIds = [
      ...new Set(confirmation.items.map((item) => item.product_id).filter((id) => id !== null)),
    ];
    if (productIds.length === 0) return { data: [], error: null };
    return client
      .from('product_images')
      .select('product_id, image_url, alt_text, is_primary, display_order')
      .in('product_id', productIds)
      .order('is_primary', { ascending: false })
      .order('display_order', { ascending: true });
  })();

  if (imagesResult.error) {
    throw new OrderConfirmationError('load-failed');
  }

  const productImages: Record<string, TrackedProductImage> = {};
  for (const image of imagesResult.data ?? []) {
    if (!productImages[image.product_id]) {
      productImages[image.product_id] = { url: image.image_url, alt: image.alt_text };
    }
  }

  return {
    ...confirmation,
    payment: confirmation.payment,
    productImages,
  };
}
