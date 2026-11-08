import type { Database } from '@/features/auth/types/database';

export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];
export type OrderCreationResult =
  Database['public']['Functions']['create_order']['Returns'][number];

export type OrderErrorCode =
  | 'AUTH_REQUIRED'
  | 'EMPTY_CART'
  | 'PRODUCT_UNAVAILABLE'
  | 'OUT_OF_STOCK'
  | 'INVALID_VARIANT'
  | 'PRICE_CHANGED'
  | 'INVALID_ADDRESS'
  | 'CART_CHANGED'
  | 'VALIDATION_FAILED'
  | 'CREATE_FAILED';

const ORDER_ERROR_MESSAGES: Record<OrderErrorCode, string> = {
  AUTH_REQUIRED: 'Please sign in again before placing your order.',
  EMPTY_CART: 'Your bag is empty. Add an item before placing an order.',
  PRODUCT_UNAVAILABLE: 'An item in your bag is no longer available.',
  OUT_OF_STOCK: 'An item in your bag no longer has enough stock. Review your bag and try again.',
  INVALID_VARIANT: 'A product option in your bag is no longer available. Review your selection.',
  PRICE_CHANGED: 'A product price has changed. Review the updated price before placing your order.',
  INVALID_ADDRESS: 'Your selected delivery address is no longer available. Choose it again.',
  CART_CHANGED: 'Your bag changed while checkout was open. Review it and try again.',
  VALIDATION_FAILED: 'Some checkout details are invalid. Review your address and bag.',
  CREATE_FAILED: 'We could not create your order. Please try again.',
};

export class OrderCreationError extends Error {
  readonly code: OrderErrorCode;

  constructor(code: OrderErrorCode) {
    super(ORDER_ERROR_MESSAGES[code]);
    this.name = 'OrderCreationError';
    this.code = code;
  }
}
