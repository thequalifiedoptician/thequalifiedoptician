import type {
  CreatePaymentSessionInput,
  PaymentProviderId,
  PaymentProviderStrategy,
  PaymentSession,
  PaymentWebhookRequest,
  VerifiedPaymentEvent,
} from './paymentTypes.js';

export class PaymentProviderNotConfiguredError extends Error {
  constructor(providerId: PaymentProviderId) {
    super(`Payment provider "${providerId}" is not configured on the server.`);
    this.name = 'PaymentProviderNotConfiguredError';
  }
}

export class PaymentProviderRegistry {
  private readonly strategies = new Map<PaymentProviderId, PaymentProviderStrategy>();

  register(strategy: PaymentProviderStrategy): void {
    if (this.strategies.has(strategy.id)) {
      throw new Error(`Payment provider "${strategy.id}" is already registered.`);
    }
    this.strategies.set(strategy.id, strategy);
  }

  resolve(providerId: PaymentProviderId): PaymentProviderStrategy {
    const strategy = this.strategies.get(providerId);
    if (!strategy) {
      throw new PaymentProviderNotConfiguredError(providerId);
    }
    return strategy;
  }

  has(providerId: PaymentProviderId): boolean {
    return this.strategies.has(providerId);
  }
}

export const paymentProviderRegistry = new PaymentProviderRegistry();

export class PaymentWebhookSignatureError extends Error {
  constructor(providerId: PaymentProviderId) {
    super(`Webhook signature verification failed for "${providerId}".`);
    this.name = 'PaymentWebhookSignatureError';
  }
}

export class PaymentService {
  constructor(private readonly registry = paymentProviderRegistry) {}

  async createSession(
    providerId: PaymentProviderId,
    input: CreatePaymentSessionInput,
  ): Promise<PaymentSession> {
    if (
      !input.orderId ||
      !input.idempotencyKey ||
      !Number.isFinite(input.amount) ||
      input.amount <= 0 ||
      !/^[A-Z]{3}$/.test(input.currency)
    ) {
      throw new Error('Payment session details are invalid.');
    }

    const session = await this.registry.resolve(providerId).createSession(input);
    if (session.providerId !== providerId || session.status !== 'pending') {
      throw new Error('The payment provider returned an invalid session.');
    }
    return session;
  }

  async verifyWebhook(
    providerId: PaymentProviderId,
    request: PaymentWebhookRequest,
  ): Promise<VerifiedPaymentEvent> {
    if (!request.rawBody.byteLength || !request.signature) {
      throw new PaymentWebhookSignatureError(providerId);
    }

    const provider = this.registry.resolve(providerId);
    if (!(await provider.verifyWebhookSignature(request))) {
      throw new PaymentWebhookSignatureError(providerId);
    }

    const event = await provider.parseVerifiedWebhook(request);
    if (
      !event.eventId ||
      !event.eventType ||
      !Number.isFinite(event.amount) ||
      event.amount < 0 ||
      !/^[A-Z]{3}$/.test(event.currency)
    ) {
      throw new Error('The payment provider returned an invalid webhook event.');
    }
    return event;
  }
}
