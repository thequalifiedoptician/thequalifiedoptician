import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  CreatePaymentSessionInput,
  PaymentProviderStrategy,
  PaymentSession,
  PaymentWebhookRequest,
  VerifiedPaymentEvent,
} from '../paymentTypes.js';
import type { SafepayConfig } from './safepayConfig.js';
import {
  buildSafepayCheckoutUrl,
  parseSafepayTokenResponse,
  parseSafepayWebhookPayload,
} from './safepayValidation.js';
import { SafepayIntegrationError } from './safepayTypes.js';

export class SafepayProvider implements PaymentProviderStrategy {
  readonly id = 'safepay' as const;

  constructor(private readonly config: SafepayConfig) {}

  async createSession(input: CreatePaymentSessionInput): Promise<PaymentSession> {
    let response: Response;
    try {
      response = await fetch(`${this.config.apiBaseUrl}/order/v1/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          amount: input.amount,
          client: this.config.publicKey,
          currency: input.currency,
          environment: this.config.environment,
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new SafepayIntegrationError(
        'SESSION_IN_PROGRESS',
        'Safepay did not confirm whether it created a session. Please wait before retrying.',
        409,
      );
    }

    if (!response.ok) {
      throw new SafepayIntegrationError(
        'PAYMENT_CREATION_FAILED',
        'Safepay could not create a payment session.',
        502,
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new SafepayIntegrationError(
        'INVALID_PROVIDER_RESPONSE',
        'Safepay returned an invalid payment session response.',
        502,
      );
    }

    const token = parseSafepayTokenResponse(payload);
    return {
      providerId: this.id,
      status: 'pending',
      redirectUrl: buildSafepayCheckoutUrl(
        token,
        input.orderId,
        input.returnUrl,
        this.config.webAppUrl,
        this.config.environment,
        this.config.checkoutBaseUrl,
      ),
      expiresAt: null,
      providerTokenReference: token,
    };
  }

  async verifyWebhookSignature(request: PaymentWebhookRequest): Promise<boolean> {
    if (!this.config.webhookSecret || !/^[a-f0-9]{128}$/iu.test(request.signature)) {
      return false;
    }
    const expected = createHmac('sha512', this.config.webhookSecret)
      .update(request.rawBody)
      .digest();
    const received = Buffer.from(request.signature, 'hex');
    return received.length === expected.length && timingSafeEqual(received, expected);
  }

  async parseVerifiedWebhook(request: PaymentWebhookRequest): Promise<VerifiedPaymentEvent> {
    return parseSafepayWebhookPayload(request.rawBody);
  }
}
