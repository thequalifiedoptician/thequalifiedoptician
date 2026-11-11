import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Banknote,
  Building2,
  Check,
  CreditCard,
  Smartphone,
  Wallet,
  WandSparkles,
} from 'lucide-react';
import type { PaymentMethodDefinition, PaymentMethodId } from './paymentTypes';
import { isManualPaymentMethod } from './paymentTypes';
import PaymentBrandMark from './PaymentBrandMark';

const methodIcons = {
  card: CreditCard,
  wallet: Wallet,
  device: Smartphone,
  bank: Building2,
  cash: Banknote,
  custom: WandSparkles,
};

export default function PaymentMethodSelector({
  methods,
  selectedMethodId,
  onSelect,
  disabled = false,
}: {
  methods: PaymentMethodDefinition[];
  selectedMethodId: PaymentMethodId;
  onSelect: (methodId: PaymentMethodId) => void;
  disabled?: boolean;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <fieldset className="payment-method-selector" disabled={disabled}>
      <legend className="payment-method-legend">Choose a payment preference</legend>
      <div className="payment-method-grid">
        {methods.map((method) => {
          const Icon = methodIcons[method.icon];
          const isSelected = selectedMethodId === method.id;
          return (
            <label
              className={[
                'payment-method-option',
                isSelected ? 'is-selected' : '',
                method.disabled ? 'is-disabled' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              key={method.id}
            >
              <input
                type="radio"
                name="checkout-payment-method"
                value={method.id}
                checked={isSelected}
                disabled={method.disabled}
                onChange={() => onSelect(method.id)}
              />
              <span className="payment-method-option-content">
                <span className="payment-method-icon" aria-hidden="true">
                  {isManualPaymentMethod(method.id) ? (
                    <PaymentBrandMark brand={method.id} />
                  ) : (
                    <Icon size={20} strokeWidth={1.7} />
                  )}
                </span>
                <span className="payment-method-copy">
                  <span className="payment-method-title-line">
                    <strong>{method.title}</strong>
                    {method.recommended && (
                      <span className="payment-method-recommended">Recommended</span>
                    )}
                  </span>
                  <span className="payment-method-description">{method.description}</span>
                  {!method.providerConfigured && (
                    <span className="payment-method-provider-state">Provider not connected</span>
                  )}
                  {method.disabled && method.disabledReason && (
                    <span className="payment-method-disabled-reason">{method.disabledReason}</span>
                  )}
                  <span className="payment-method-brand">{method.brand}</span>
                </span>
                <span className="payment-method-check" aria-hidden="true">
                  <AnimatePresence initial={false}>
                    {isSelected && (
                      <motion.span
                        key="selected"
                        initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={reduceMotion ? undefined : { scale: 0.6, opacity: 0 }}
                        transition={reduceMotion ? { duration: 0 } : { duration: 0.16 }}
                      >
                        <Check size={14} strokeWidth={2.5} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
