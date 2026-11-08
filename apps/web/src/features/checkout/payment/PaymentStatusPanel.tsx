import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, CircleAlert, Clock3, LoaderCircle, ShieldCheck } from 'lucide-react';
import type { PaymentStatus } from './paymentTypes';

const statusContent: Record<
  PaymentStatus,
  { title: string; description: string; tone: 'info' | 'success' | 'error'; icon: typeof Clock3 }
> = {
  pending: {
    title: 'Payment is pending',
    description: 'A Safepay session is prepared after you place the order.',
    tone: 'info',
    icon: Clock3,
  },
  processing: {
    title: 'Payment is processing',
    description: 'Keep this checkout open while the provider confirms the payment.',
    tone: 'info',
    icon: LoaderCircle,
  },
  authorized: {
    title: 'Payment authorized',
    description: 'The provider authorized this payment; capture has not been confirmed.',
    tone: 'success',
    icon: ShieldCheck,
  },
  paid: {
    title: 'Payment complete',
    description: 'The provider confirmed payment for this order.',
    tone: 'success',
    icon: Check,
  },
  failed: {
    title: 'Payment could not be completed',
    description: 'No successful payment was confirmed. Choose another method or try again.',
    tone: 'error',
    icon: CircleAlert,
  },
  cancelled: {
    title: 'Payment was cancelled',
    description: 'No payment was completed. You can choose a payment method again.',
    tone: 'error',
    icon: CircleAlert,
  },
  refunded: {
    title: 'Payment refunded',
    description: 'The provider confirmed a refund for this payment.',
    tone: 'success',
    icon: Check,
  },
};

export default function PaymentStatusPanel({ status }: { status: PaymentStatus }) {
  const reduceMotion = useReducedMotion();
  const content = statusContent[status];
  const Icon = content.icon;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        className={`payment-status-panel payment-status-panel--${content.tone}`}
        key={status}
        role={content.tone === 'error' ? 'alert' : 'status'}
        aria-live="polite"
        aria-busy={status === 'processing'}
        initial={reduceMotion ? false : { opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.18 }}
      >
        <Icon
          className={status === 'processing' ? 'payment-status-spinner' : undefined}
          size={18}
          aria-hidden="true"
        />
        <span>
          <strong>{content.title}</strong>
          <span>{content.description}</span>
        </span>
      </motion.div>
    </AnimatePresence>
  );
}
