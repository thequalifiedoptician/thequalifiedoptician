import type { PaymentMethodDefinition, PaymentMethodId } from './paymentTypes';

const PAYMENT_METHODS: readonly PaymentMethodDefinition[] = [
  {
    id: 'safepay',
    providerId: 'safepay',
    title: 'Safepay',
    description: 'Continue to Safepay’s secure hosted checkout.',
    brand: 'Secure hosted checkout',
    icon: 'wallet',
    recommended: true,
    providerConfigured: true,
  },
];

export function listPaymentMethods(): PaymentMethodDefinition[] {
  return PAYMENT_METHODS.map((method) => ({ ...method }));
}

export function getPaymentMethod(methodId: PaymentMethodId): PaymentMethodDefinition {
  const method = PAYMENT_METHODS.find((candidate) => candidate.id === methodId);
  if (!method) {
    throw new Error(`Payment method "${methodId}" is not supported.`);
  }
  return method;
}
