import type { CartDisplayItem } from '@/features/cart/cartTypes';
import { getCartItemPrice } from '@/features/cart/cartUtils';
import { OrderCreationError } from './orderTypes';

export type ExpectedOrderItem = {
  cart_item_id: string;
  unit_price: number;
};

export function validateOrderRequest(
  cartItems: CartDisplayItem[],
  shippingAddressId: string | null,
): ExpectedOrderItem[] {
  if (!cartItems.length) {
    throw new OrderCreationError('EMPTY_CART');
  }
  if (!shippingAddressId) {
    throw new OrderCreationError('INVALID_ADDRESS');
  }

  return cartItems.map((item) => {
    if (!item.product || item.product.status !== 'active') {
      throw new OrderCreationError('PRODUCT_UNAVAILABLE');
    }
    if (
      (item.variant_id && (!item.variant || item.variant.id !== item.variant_id)) ||
      (!item.variant_id && item.product.hasVariants)
    ) {
      throw new OrderCreationError('INVALID_VARIANT');
    }
    if (!item.inStock) {
      throw new OrderCreationError('OUT_OF_STOCK');
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
      throw new OrderCreationError('VALIDATION_FAILED');
    }

    const unitPrice = getCartItemPrice(item);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new OrderCreationError('VALIDATION_FAILED');
    }

    return { cart_item_id: item.id, unit_price: unitPrice };
  });
}
