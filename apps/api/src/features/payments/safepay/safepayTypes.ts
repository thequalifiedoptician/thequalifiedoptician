import type { PaymentStatus } from '../paymentTypes.js';

export type SafepayEnvironment = 'sandbox' | 'production';

export type SafepayCreatePaymentTokenRequest = {
  amount: number;
  client: string;
  currency: string;
  environment: SafepayEnvironment;
};

export type SafepaySessionResult = {
  paymentId: string;
  status: PaymentStatus;
  checkoutUrl: string;
  amount: number;
  currency: string;
  createdAt: string;
};

export type SafepayPaymentStatusResult = {
  paymentId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  createdAt: string;
};

export type SafepayApiErrorCode =
  | 'AUTH_REQUIRED'
  | 'INVALID_REQUEST'
  | 'INVALID_ORDER'
  | 'ALREADY_PAID'
  | 'MISSING_CONFIGURATION'
  | 'INVALID_PROVIDER_RESPONSE'
  | 'PAYMENT_CREATION_FAILED'
  | 'SESSION_IN_PROGRESS'
  | 'NOT_FOUND'
  | 'INVALID_SIGNATURE'
  | 'INVALID_WEBHOOK_PAYLOAD'
  | 'WEBHOOK_PROCESSING_FAILED';

export class SafepayIntegrationError extends Error {
  constructor(
    readonly code: SafepayApiErrorCode,
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = 'SafepayIntegrationError';
  }
}
