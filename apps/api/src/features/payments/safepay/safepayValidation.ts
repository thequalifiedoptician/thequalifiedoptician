import type { SafepayEnvironment } from './safepayTypes.js';
import { SafepayIntegrationError } from './safepayTypes.js';

export type CreateSafepaySessionBody = {
  orderId: string;
};

export type SafepayWebhookEvent = {
  eventId: string;
  eventType: string;
  providerReference: string | null;
  status: 'pending' | 'processing' | 'authorized' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  amount: number;
  currency: string;
  metadata: Readonly<Record<string, unknown>>;
};

export const SUPPORTED_SAFEPAY_CURRENCIES = new Set([
  'PKR',
  'USD',
  'AED',
  'SAR',
  'CAD',
  'EUR',
  'GBP',
]);

export function parseCreateSessionBody(value: unknown): CreateSafepaySessionBody {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new SafepayIntegrationError('INVALID_REQUEST', 'A valid order ID is required.', 400);
  }
  const body = value as Record<string, unknown>;
  if (
    Object.keys(body).length !== 1 ||
    typeof body.orderId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      body.orderId,
    )
  ) {
    throw new SafepayIntegrationError('INVALID_REQUEST', 'A valid order ID is required.', 400);
  }
  return { orderId: body.orderId };
}

export function parseSafepayTokenResponse(value: unknown): string {
  if (
    !value ||
    typeof value !== 'object' ||
    !('data' in value) ||
    !value.data ||
    typeof value.data !== 'object' ||
    !('token' in value.data) ||
    typeof value.data.token !== 'string' ||
    value.data.token.length < 8 ||
    value.data.token.length > 2048 ||
    /[\u0000-\u0020]/u.test(value.data.token)
  ) {
    throw new SafepayIntegrationError(
      'INVALID_PROVIDER_RESPONSE',
      'Safepay returned an invalid payment session response.',
      502,
    );
  }
  return value.data.token;
}

export function parseSafepayWebhookPayload(rawBody: Uint8Array): SafepayWebhookEvent {
  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(rawBody));
  } catch {
    throw new SafepayIntegrationError(
      'INVALID_WEBHOOK_PAYLOAD',
      'Safepay webhook payload is not valid JSON.',
      400,
    );
  }

  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload) ||
    !('token' in payload) ||
    typeof payload.token !== 'string' ||
    !/^[A-Za-z0-9._:-]{1,200}$/u.test(payload.token) ||
    !('type' in payload) ||
    typeof payload.type !== 'string' ||
    !/^[A-Za-z0-9._-]{1,120}$/u.test(payload.type) ||
    !('data' in payload) ||
    !payload.data ||
    typeof payload.data !== 'object' ||
    Array.isArray(payload.data)
  ) {
    throw new SafepayIntegrationError(
      'INVALID_WEBHOOK_PAYLOAD',
      'Safepay webhook payload is missing required event fields.',
      400,
    );
  }

  const data = payload.data as Record<string, unknown>;
  const eventType = payload.type;
  const needsPaymentDetails =
    eventType === 'payment.succeeded' || eventType === 'authorization.succeeded';
  let amount = 0;
  let currency = 'USD';

  if (
    [
      'payment.succeeded',
      'payment.failed',
      'authorization.succeeded',
      'authorization.reversed',
    ].includes(eventType) &&
    (typeof data.tracker !== 'string' || !/^[A-Za-z0-9._:-]{1,200}$/u.test(data.tracker))
  ) {
    throw new SafepayIntegrationError(
      'INVALID_WEBHOOK_PAYLOAD',
      'Safepay webhook payload is missing a valid payment tracker.',
      400,
    );
  }

  if (needsPaymentDetails) {
    if (
      typeof data.amount !== 'number' ||
      !Number.isFinite(data.amount) ||
      data.amount <= 0 ||
      typeof data.currency !== 'string' ||
      !/^[A-Z]{3}$/u.test(data.currency)
    ) {
      throw new SafepayIntegrationError(
        'INVALID_WEBHOOK_PAYLOAD',
        'Safepay webhook payment amount or currency is invalid.',
        400,
      );
    }
    amount = data.amount;
    currency = data.currency;
  }

  const status =
    eventType === 'payment.succeeded'
      ? 'paid'
      : eventType === 'payment.failed'
        ? 'failed'
        : eventType === 'authorization.succeeded'
          ? 'authorized'
          : eventType === 'authorization.reversed'
            ? 'cancelled'
            : eventType === 'payment.refunded'
              ? 'refunded'
              : 'processing';

  const sanitizedPayload = JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
  delete sanitizedPayload.merchant_api_key;
  delete sanitizedPayload.endpoint;
  const sanitizedData = sanitizedPayload.data as Record<string, unknown>;
  delete sanitizedData.customer_email;

  return {
    eventId: payload.token,
    eventType,
    providerReference: typeof data.tracker === 'string' ? data.tracker : null,
    status,
    amount,
    currency,
    metadata: { webhookPayload: sanitizedPayload },
  };
}

export function buildSafepayCheckoutUrl(
  token: string,
  orderId: string,
  returnUrl: string,
  webAppOrigin: string,
  environment: SafepayEnvironment,
  checkoutBaseUrl: string,
): string {
  const returnTarget = new URL(returnUrl);
  const expectedPath = `/checkout/confirmation/${encodeURIComponent(orderId)}`;
  if (
    returnTarget.origin !== webAppOrigin ||
    returnTarget.pathname !== expectedPath ||
    returnTarget.search ||
    returnTarget.hash
  ) {
    throw new SafepayIntegrationError(
      'INVALID_REQUEST',
      'The configured payment return URL is invalid.',
      500,
    );
  }
  const checkoutUrl = new URL(checkoutBaseUrl);
  checkoutUrl.search = new URLSearchParams({
    beacon: token,
    cancel_url: returnTarget.toString(),
    env: environment,
    order_id: orderId,
    redirect_url: returnTarget.toString(),
    source: 'custom',
    webhooks: 'true',
  }).toString();
  return checkoutUrl.toString();
}
