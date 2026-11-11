import { useCallback, useMemo, useState } from 'react';
import { getPaymentMethod, listPaymentMethods } from './paymentService';
import type { PaymentMethodId, PaymentStatus } from './paymentTypes';
import type { PaymentAccount } from './paymentAccountService';

export function usePayment(accounts: PaymentAccount | null) {
  const methods = useMemo(() => listPaymentMethods(accounts), [accounts]);
  const [selectedMethodId, setSelectedMethodId] = useState<PaymentMethodId>('safepay');
  const selectedMethod =
    methods.find((method) => method.id === selectedMethodId) ??
    methods.find((method) => method.id === 'safepay')!;

  const selectMethod = useCallback((methodId: PaymentMethodId) => {
    const method = getPaymentMethod(methodId, methods);
    if (method.disabled) {
      throw new Error(method.disabledReason ?? `${method.title} is currently unavailable.`);
    }
    setSelectedMethodId(methodId);
  }, [methods]);

  return {
    methods,
    selectedMethod,
    selectedMethodId: selectedMethod.id,
    selectMethod,
    status: 'pending' as PaymentStatus,
  };
}
