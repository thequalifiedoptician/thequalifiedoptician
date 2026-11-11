import { useCallback, useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import {
  loadPaymentStatus,
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
  statusError: boolean;
};

const INITIAL_STATE: ConfirmationState = {
  orderId: null,
  userId: null,
  requestVersion: 0,
  data: null,
  isLoading: true,
  error: null,
  statusError: false,
};

const PAYMENT_STATUS_POLL_INTERVAL_MS = 3_000;
const PAYMENT_STATUS_POLL_DURATION_MS = 90_000;

export function useOrderConfirmation(
  orderId: string | undefined,
  userId: string | undefined,
  accessToken: string | undefined,
) {
  const [state, setState] = useState<ConfirmationState>(INITIAL_STATE);
  const [retryVersion, setRetryVersion] = useState(0);

  useEffect(() => {
    if (!orderId || !userId) return;

    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const pollingStartedAt = Date.now();

    const refresh = async (initial: boolean) => {
      try {
        const client = await getSupabaseClient();
        let data = await loadOrderConfirmation(client, orderId, userId);
        let statusError = false;
        if (data.payment && accessToken) {
          try {
            const status = await loadPaymentStatus(data.payment.id, accessToken);
            data = { ...data, payment: { ...data.payment, status } };
          } catch {
            statusError = true;
          }
        }
        if (active) {
          setState({
            orderId,
            userId,
            requestVersion: retryVersion,
            data,
            isLoading: false,
            error: null,
            statusError,
          });

          const canPoll =
            accessToken &&
            data.order.status === 'pending_payment' &&
            data.payment &&
            ['pending', 'processing', 'authorized'].includes(data.payment.status) &&
            Date.now() - pollingStartedAt < PAYMENT_STATUS_POLL_DURATION_MS;
          if (canPoll) {
            timer = setTimeout(() => void refresh(false), PAYMENT_STATUS_POLL_INTERVAL_MS);
          }
        }
      } catch (error) {
        if (active) {
          setState((current) => ({
            orderId,
            userId,
            requestVersion: retryVersion,
            data: initial ? null : current.data,
            isLoading: false,
            error: initial
              ? error instanceof OrderConfirmationError
                ? error
                : new OrderConfirmationError('load-failed')
              : null,
            statusError: true,
          }));
          if (!initial && Date.now() - pollingStartedAt < PAYMENT_STATUS_POLL_DURATION_MS) {
            timer = setTimeout(() => void refresh(false), PAYMENT_STATUS_POLL_INTERVAL_MS);
          }
        }
      }
    };

    void refresh(true);

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [accessToken, orderId, retryVersion, userId]);

  const retry = useCallback(() => setRetryVersion((version) => version + 1), []);
  const isCurrentRequest =
    state.orderId === orderId && state.userId === userId && state.requestVersion === retryVersion;

  return {
    data: isCurrentRequest ? state.data : null,
    isLoading: Boolean(orderId) && (!userId || !isCurrentRequest || state.isLoading),
    statusError: isCurrentRequest && state.statusError,
    error: !orderId
      ? new OrderConfirmationError('not-found')
      : isCurrentRequest
        ? state.error
        : null,
    retry,
  };
}
