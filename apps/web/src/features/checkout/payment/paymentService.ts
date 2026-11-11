import type { PaymentMethodDefinition, PaymentMethodId } from './paymentTypes';
import type { PaymentAccount } from './paymentAccountService';

export function listPaymentMethods(accounts: PaymentAccount | null): PaymentMethodDefinition[] {
  const methods: PaymentMethodDefinition[] = [
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
    {
      id: 'cash_on_delivery',
      providerId: 'cash_on_delivery',
      title: 'Cash on Delivery',
      description: 'Pay your courier when your order arrives.',
      brand: 'Pay at delivery',
      icon: 'cash',
      providerConfigured: true,
    },
  ];

  if (accounts?.enable_easypaisa) {
    methods.push({
      id: 'easypaisa',
      providerId: 'easypaisa',
      title: 'EasyPaisa',
      description: 'Transfer the total and upload your payment proof.',
      brand: 'Manual transfer · proof required',
      icon: 'wallet',
      providerConfigured: true,
    });
  }
  if (accounts?.enable_jazzcash) {
    methods.push({
      id: 'jazzcash',
      providerId: 'jazzcash',
      title: 'JazzCash',
      description: 'Transfer the total and upload your payment proof.',
      brand: 'Manual transfer · proof required',
      icon: 'wallet',
      providerConfigured: true,
    });
  }

  return methods;
}

export function getPaymentMethod(
  methodId: PaymentMethodId,
  methods: PaymentMethodDefinition[],
): PaymentMethodDefinition {
  const method = methods.find((candidate) => candidate.id === methodId);
  if (!method) {
    throw new Error(`Payment method "${methodId}" is not supported.`);
  }
  return method;
}
