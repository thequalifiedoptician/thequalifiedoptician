import { useCallback, useRef, useState } from 'react';
import axios from 'axios';
import { apiClient } from '@/lib/api-client';

type CreateSessionResponse = {
  data?: {
    checkoutUrl?: unknown;
    paymentId?: unknown;
    status?: unknown;
  };
};

function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ error?: { message?: unknown } }>(error)) {
    const message = error.response?.data?.error?.message;
    if (typeof message === 'string') return message;
  }
  if (error instanceof Error) return error.message;
  return 'We could not prepare Safepay checkout. Please try again.';
}

function validateCheckoutUrl(value: unknown, orderId: string): string {
  if (typeof value !== 'string') {
    throw new Error('Safepay returned an invalid checkout link.');
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Safepay returned an invalid checkout link.');
  }
  const allowedOrigins = new Set(['https://sandbox.api.getsafepay.com', 'https://getsafepay.com']);
  if (
    url.protocol !== 'https:' ||
    !allowedOrigins.has(url.origin) ||
    url.pathname !== '/checkout/pay' ||
    !url.searchParams.has('beacon') ||
    url.searchParams.get('order_id') !== orderId
  ) {
    throw new Error('Safepay returned an invalid checkout link.');
  }
  return url.toString();
}

export function useSafepayCheckout(accessToken: string | undefined) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestInProgress = useRef(false);

  const startCheckout = useCallback(
    async (orderId: string): Promise<void> => {
      if (requestInProgress.current) return;
      if (!accessToken) {
        setError('Please sign in again before continuing to payment.');
        return;
      }

      requestInProgress.current = true;
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.post<CreateSessionResponse>(
          '/payments/safepay/create-session',
          { orderId },
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const paymentId = response.data.data?.paymentId;
        if (
          typeof paymentId !== 'string' ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
            paymentId,
          ) ||
          response.data.data?.status !== 'pending'
        ) {
          throw new Error('The payment service returned an invalid session.');
        }
        const checkoutUrl = validateCheckoutUrl(response.data.data?.checkoutUrl, orderId);
        window.location.assign(checkoutUrl);
      } catch (requestError) {
        setError(getApiErrorMessage(requestError));
      } finally {
        requestInProgress.current = false;
        setIsLoading(false);
      }
    },
    [accessToken],
  );

  return { startCheckout, isLoading, error };
}
