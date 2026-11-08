import { useCallback, useMemo, useState } from 'react';
import { getPaymentMethod, listPaymentMethods } from './paymentService';
import type { PaymentMethodId, PaymentStatus } from './paymentTypes';

export function usePayment() {
  const methods = useMemo(() => listPaymentMethods(), []);
  const [selectedMethodId, setSelectedMethodId] = useState<PaymentMethodId>('safepay');
  const selectedMethod = methods.find((method) => method.id === selectedMethodId) ?? methods[0];

  const selectMethod = useCallback((methodId: PaymentMethodId) => {
    const method = getPaymentMethod(methodId);
    if (method.disabled) {
      throw new Error(method.disabledReason ?? `${method.title} is currently unavailable.`);
    }
    setSelectedMethodId(methodId);
  }, []);

  return {
    methods,
    selectedMethod,
    selectedMethodId,
    selectMethod,
    status: 'pending' as PaymentStatus,
  };
}
