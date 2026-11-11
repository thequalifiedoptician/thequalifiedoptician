import { useCallback, useState } from 'react';
import type { CartDisplayItem } from '@/features/cart/cartTypes';
import { getSupabaseClient } from '@/lib/supabase';
import { createOrder } from './orderService';
import type { OrderCreationResult } from './orderTypes';
import { OrderCreationError } from './orderTypes';
import { validateOrderRequest } from './orderValidation';

type OrderCreationState = {
  order: OrderCreationResult | null;
  isProcessing: boolean;
  error: string | null;
};

const INITIAL_STATE: OrderCreationState = {
  order: null,
  isProcessing: false,
  error: null,
};

export function useOrderCreation(userId: string | undefined, refreshCart: () => void) {
  const [state, setState] = useState<OrderCreationState>(INITIAL_STATE);

  const submit = useCallback(
    async (
      shippingAddressId: string | null,
      cartItems: CartDisplayItem[],
      idempotencyKey: string,
    ): Promise<OrderCreationResult | null> => {
      if (!userId) {
        setState({
          order: null,
          isProcessing: false,
          error: new OrderCreationError('AUTH_REQUIRED').message,
        });
        return null;
      }

      setState((current) => ({ ...current, isProcessing: true, error: null }));
      try {
        if (!shippingAddressId) {
          throw new OrderCreationError('INVALID_ADDRESS');
        }
        const expectedCart = validateOrderRequest(cartItems, shippingAddressId);
        const client = await getSupabaseClient();
        const order = await createOrder(client, shippingAddressId, idempotencyKey, expectedCart);
        setState({ order, isProcessing: false, error: null });
        refreshCart();
        return order;
      } catch (error) {
        const message =
          error instanceof OrderCreationError
            ? error.message
            : 'We could not create your order. Please try again.';
        setState({ order: null, isProcessing: false, error: message });
        return null;
      }
    },
    [refreshCart, userId],
  );

  return { ...state, submit };
}
