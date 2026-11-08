import { useCallback, useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import {
  loadOrderConfirmation,
  OrderConfirmationError,
  type OrderConfirmationData,
} from './orderConfirmationService';

type ConfirmationState = {
  orderId: string | null;
  userId: string | null;
  requestVersion: number;
  data: OrderConfirmationData | null;
  isLoading: boolean;
  error: OrderConfirmationError | null;
};

const INITIAL_STATE: ConfirmationState = {
  orderId: null,
  userId: null,
  requestVersion: 0,
  data: null,
  isLoading: true,
  error: null,
};

export function useOrderConfirmation(orderId: string | undefined, userId: string | undefined) {
  const [state, setState] = useState<ConfirmationState>(INITIAL_STATE);
  const [retryVersion, setRetryVersion] = useState(0);

  useEffect(() => {
    if (!orderId || !userId) return;

    let active = true;

    void Promise.resolve().then(async () => {
      try {
        const client = await getSupabaseClient();
        const data = await loadOrderConfirmation(client, orderId, userId);
        if (active) {
          setState({
            orderId,
            userId,
            requestVersion: retryVersion,
            data,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        if (active) {
          setState({
            orderId,
            userId,
            requestVersion: retryVersion,
            data: null,
            isLoading: false,
            error:
              error instanceof OrderConfirmationError
                ? error
                : new OrderConfirmationError('load-failed'),
          });
        }
      }
    });

    return () => {
      active = false;
    };
  }, [orderId, retryVersion, userId]);

  const retry = useCallback(() => setRetryVersion((version) => version + 1), []);
  const isCurrentRequest =
    state.orderId === orderId && state.userId === userId && state.requestVersion === retryVersion;

  return {
    data: isCurrentRequest ? state.data : null,
    isLoading: Boolean(orderId) && (!userId || !isCurrentRequest || state.isLoading),
    error: !orderId
      ? new OrderConfirmationError('not-found')
      : isCurrentRequest
        ? state.error
        : null,
    retry,
  };
}
