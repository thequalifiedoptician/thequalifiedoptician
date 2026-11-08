export type PaymentStatus =
  'pending' | 'processing' | 'authorized' | 'paid' | 'failed' | 'cancelled' | 'refunded';

export type PaymentProviderId =
  | 'stripe'
  | 'paypal'
  | 'apple_pay'
  | 'google_pay'
  | 'safepay'
  | 'bank_transfer'
  | 'cash_on_delivery'
  | 'custom'
  | (string & {});

export type CreatePaymentSessionInput = {
  orderId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
  returnUrl: string;
};

export type PaymentSession = {
  providerId: PaymentProviderId;
  status: 'pending';
  redirectUrl: string | null;
  expiresAt: string | null;
  providerTokenReference: string | null;
};

export type PaymentWebhookRequest = {
  rawBody: Uint8Array;
  signature: string;
  headers: Readonly<Record<string, string>>;
};

export type VerifiedPaymentEvent = {
  eventId: string;
  eventType: string;
  providerReference: string | null;
  status: PaymentStatus;
  amount: number;
  currency: string;
  metadata: Readonly<Record<string, unknown>>;
};

export interface PaymentProviderStrategy {
  readonly id: PaymentProviderId;
  createSession(input: CreatePaymentSessionInput): Promise<PaymentSession>;
  verifyWebhookSignature(request: PaymentWebhookRequest): Promise<boolean>;
  parseVerifiedWebhook(request: PaymentWebhookRequest): Promise<VerifiedPaymentEvent>;
}
