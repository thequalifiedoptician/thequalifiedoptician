import type { CartDisplayItem } from './cartTypes';

export const MAX_CART_QUANTITY = 99;

export function getCartItemKey(productId: string, variantId: string | null): string {
  return `${productId}:${variantId ?? 'base'}`;
}

export function getCartItemPrice(item: CartDisplayItem): number {
  return item.variant?.price ?? item.product?.price ?? 0;
}

export function getCartLineTotal(item: CartDisplayItem): number {
  return getCartItemPrice(item) * item.quantity;
}

export function getCartItemSavings(item: CartDisplayItem): number {
  const comparePrice = item.product?.compare_price;
  if (comparePrice === null || comparePrice === undefined) {
    return 0;
  }
  return Math.max(0, comparePrice - getCartItemPrice(item)) * item.quantity;
}

export function formatCartPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}
