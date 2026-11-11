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

export type PaymentMethodId =
  | 'card'
  | 'paypal'
  | 'apple_pay'
  | 'google_pay'
  | 'safepay'
  | 'bank_transfer'
  | 'cash_on_delivery'
  | 'stripe_checkout'
  | 'custom'
  | (string & {});

export type PaymentMethodDefinition = {
  id: PaymentMethodId;
  providerId: PaymentProviderId;
  title: string;
  description: string;
  brand: string;
  recommended?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  providerConfigured: boolean;
  icon: 'card' | 'wallet' | 'device' | 'bank' | 'cash' | 'custom';
};

export type PaymentMethodSelection = {
  methodId: PaymentMethodId;
  providerId: PaymentProviderId;
};

export type ManualPaymentMethodId = 'easypaisa' | 'jazzcash';

export function isManualPaymentMethod(
  methodId: PaymentMethodId,
): methodId is ManualPaymentMethodId {
  return methodId === 'easypaisa' || methodId === 'jazzcash';
}
