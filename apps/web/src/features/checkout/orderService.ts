import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/features/auth/types/database';
import type { OrderCreationResult } from './orderTypes';
import { OrderCreationError, type OrderErrorCode } from './orderTypes';
import type { ExpectedOrderItem } from './orderValidation';

const ORDER_ERROR_CODES: OrderErrorCode[] = [
  'AUTH_REQUIRED',
  'EMPTY_CART',
  'PRODUCT_UNAVAILABLE',
  'OUT_OF_STOCK',
  'INVALID_VARIANT',
  'PRICE_CHANGED',
  'INVALID_ADDRESS',
  'CART_CHANGED',
  'VALIDATION_FAILED',
];

function mapOrderError(error: { message: string }): OrderCreationError {
  const code = ORDER_ERROR_CODES.find((candidate) => error.message.includes(`ORDER_${candidate}`));
  return new OrderCreationError(code ?? 'CREATE_FAILED');
}

export async function createOrder(
  client: SupabaseClient<Database>,
  shippingAddressId: string,
  idempotencyKey: string,
  expectedCart: ExpectedOrderItem[],
): Promise<OrderCreationResult> {
  const { data, error } = await client.rpc('create_order', {
    p_shipping_address_id: shippingAddressId,
    p_idempotency_key: idempotencyKey,
    p_expected_cart: expectedCart,
  });
  if (error) {
    throw mapOrderError(error);
  }
  const order = data?.[0];
  if (!order) {
    throw new OrderCreationError('CREATE_FAILED');
  }
  return order;
}
