import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  CircleAlert,
  Headphones,
  LoaderCircle,
  PackageCheck,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { AUTH_ROUTES } from '@/features/auth/constants/auth';
import { getAuthRedirectState } from '@/features/auth/utils/authNavigation';
import { useSafepayCheckout } from '../payment/useSafepayCheckout';
import { CheckoutFrame, CheckoutNotice } from '../CheckoutDesignSystem';
import {
  ConfirmationMotion,
  CustomerInformationCard,
  InvoiceUnavailableButton,
  OrderConfirmationError,
  OrderConfirmationLoading,
  OrderDetailsDisclosure,
  OrderStatusBadge,
  OrderSummaryCard,
  OrderTimeline,
  PaymentSummaryCard,
  ShippingAddressCard,
  type OrderProgressStatus,
} from './OrderConfirmationComponents';
import { useOrderConfirmation } from './useOrderConfirmation';
import '../checkout.css';

export default function OrderConfirmationPage() {
  const { orderId } = useParams();
  const { isAuthenticated, isLoading: isAuthLoading, session, user } = useAuth();
  const confirmation = useOrderConfirmation(orderId, user?.id, session?.access_token);
  const safepayCheckout = useSafepayCheckout(session?.access_token);
  const location = useLocation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [showSupportNote, setShowSupportNote] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      navigate(AUTH_ROUTES.login, {
        replace: true,
        state: getAuthRedirectState(location),
      });
    }
  }, [isAuthLoading, isAuthenticated, location, navigate]);

  const order = confirmation.data?.order;
  const items = confirmation.data?.items ?? [];
  const payment = confirmation.data?.payment ?? null;
  const isInactiveOrder = order?.status === 'cancelled' || order?.status === 'expired';
  const progressStatus: OrderProgressStatus =
    order?.status === 'cancelled' || order?.status === 'expired'
      ? 'cancelled'
      : order?.status === 'confirmed'
        ? 'confirmed'
        : 'processing';
  const paymentStatus =
    payment?.status ??
    (order?.status === 'confirmed' || order?.status === 'processing'
      ? 'paid'
      : order?.status === 'pending_payment'
        ? 'pending'
        : 'unverified');
  const isManualPayment =
    payment?.method_id === 'easypaisa' || payment?.method_id === 'jazzcash';
  const isCashOnDelivery = payment?.method_id === 'cash_on_delivery';
  const canContinueToPayment =
    order?.status === 'pending_payment' &&
    (!payment || payment.method_id === 'safepay') &&
    (!payment || ['pending', 'failed', 'cancelled'].includes(payment.status));

  useEffect(() => {
    if (order) {
      headingRef.current?.focus();
    }
  }, [order]);

  if (isAuthLoading || !isAuthenticated || confirmation.isLoading) {
    return (
      <CheckoutFrame>
        <OrderConfirmationLoading />
      </CheckoutFrame>
    );
  }

  if (confirmation.error || !order || !confirmation.data) {
    return (
      <CheckoutFrame>
        <OrderConfirmationError
          notFound={confirmation.error?.code === 'not-found'}
          onRetry={confirmation.retry}
        />
      </CheckoutFrame>
    );
  }

  return (
    <CheckoutFrame>
      <main className="confirmation-content" id="checkout-content">
        <ConfirmationMotion className="confirmation-hero">
          <motion.span
            className={`confirmation-success-mark${isInactiveOrder ? ' confirmation-success-mark--error' : ''}`}
            initial={reduceMotion ? false : { scale: 0.72, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={
              reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 190, damping: 17 }
            }
          >
            {isInactiveOrder ? (
              <CircleAlert size={27} aria-hidden="true" />
            ) : (
              <Check size={27} aria-hidden="true" />
            )}
          </motion.span>
          <p className="checkout-eyebrow">
            {isInactiveOrder ? 'ORDER UPDATE' : 'THOUGHTFULLY CHOSEN'}
          </p>
          <h1 ref={headingRef} tabIndex={-1}>
            {isInactiveOrder ? 'This order is no longer active.' : 'Thank you. It’s in good hands.'}
          </h1>
          <p className="confirmation-hero-description">
            {isInactiveOrder
              ? 'The order was cancelled or its temporary stock reservation expired.'
              : 'Your order has been received. Here are the details, gathered in one place.'}
          </p>
          <div className="confirmation-order-reference">
            <span>ORDER</span>
            <strong>{order.order_number}</strong>
            <span aria-hidden="true">·</span>
            <time dateTime={order.created_at}>
              {new Date(order.created_at).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          </div>
          <div className="confirmation-status-row" aria-label="Order and payment status">
            <OrderStatusBadge
              status={progressStatus}
              label={
                isInactiveOrder
                  ? 'Order not active'
                  : order.status === 'processing'
                    ? 'Processing'
                    : order.status === 'confirmed'
                      ? 'Confirmed'
                      : 'Order received'
              }
            />
            <span className="confirmation-status-divider" aria-hidden="true" />
            {paymentStatus === 'paid' ? (
              <OrderStatusBadge status="confirmed" label="Payment confirmed" />
            ) : isInactiveOrder ? (
              <span className="confirmation-payment-pending">Payment status unverified</span>
            ) : (
              <span className="confirmation-payment-pending">
                <span aria-hidden="true" />
                {paymentStatus === 'pending' ? 'Payment pending' : `Payment ${paymentStatus}`}
              </span>
            )}
          </div>
        </ConfirmationMotion>

        {isInactiveOrder ? (
          <CheckoutNotice
            tone="warning"
            title={
              paymentStatus === 'paid'
                ? 'Payment confirmed — support review needed'
                : 'This order is no longer active'
            }
          >
            {paymentStatus === 'paid'
              ? 'Safepay confirmed payment, but this order is no longer active. Contact support before placing another order.'
              : 'Payment status has not been verified. If you continued to Safepay, contact support before placing another order to avoid a duplicate charge.'}
          </CheckoutNotice>
        ) : paymentStatus === 'paid' ? (
          <CheckoutNotice tone="success" title="Payment confirmed">
            {isCashOnDelivery
              ? `Cash on Delivery payment has been recorded. Your order is now ${order.status}.`
              : isManualPayment
                ? `Your manual payment was approved. Your order is now ${order.status}.`
                : `Safepay confirmed this payment. Your order is now ${order.status}.`}
          </CheckoutNotice>
        ) : isManualPayment ? (
          <CheckoutNotice tone="info" title="Manual payment verification">
            Your payment proof is being checked by our team. Open the payment page to review your
            transfer details or upload a requested replacement screenshot.
          </CheckoutNotice>
        ) : isCashOnDelivery ? (
          <CheckoutNotice tone="info" title="Pay when your order arrives">
            Your order is being prepared. The payment is due to the courier at delivery.
          </CheckoutNotice>
        ) : (
          <CheckoutNotice tone="info" title="Payment is pending">
            We are checking the payment status reported by Safepay. Your order will update after the
            verified webhook is processed.
          </CheckoutNotice>
        )}
        {confirmation.statusError && paymentStatus !== 'paid' && (
          <CheckoutNotice tone="warning" title="Payment update is delayed">
            We could not refresh the latest payment status. This page will keep checking while the
            order is pending.
          </CheckoutNotice>
        )}

        <div className="confirmation-layout">
          <div className="confirmation-main-column">
            <ConfirmationMotion delay={0.04}>
              <OrderSummaryCard order={order} items={items} />
            </ConfirmationMotion>
            <div className="confirmation-information-grid">
              <ConfirmationMotion delay={0.08}>
                <CustomerInformationCard snapshot={order.shipping_address_snapshot} />
              </ConfirmationMotion>
              <ConfirmationMotion delay={0.12}>
                <ShippingAddressCard snapshot={order.shipping_address_snapshot} />
              </ConfirmationMotion>
            </div>
            <ConfirmationMotion delay={0.16}>
              <PaymentSummaryCard
                currency={order.currency}
                method={payment?.method_id ?? null}
                status={paymentStatus}
              />
            </ConfirmationMotion>
            <ConfirmationMotion delay={0.2}>
              <OrderTimeline status={progressStatus} />
            </ConfirmationMotion>
          </div>

          <aside className="confirmation-actions-panel" aria-label="Order actions">
            <p className="checkout-eyebrow">YOUR NEXT STEP</p>
            <h2>Make yourself at home.</h2>
            <Link className="checkout-button checkout-button--primary" to="/shop">
              Continue shopping <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link
              className="checkout-button checkout-button--secondary"
              to={`/account/orders/${encodeURIComponent(order.id)}/tracking`}
            >
              Track your order <ArrowRight size={15} aria-hidden="true" />
            </Link>
            {canContinueToPayment && (
              <button
                className="checkout-button checkout-button--primary"
                type="button"
                disabled={safepayCheckout.isLoading}
                aria-busy={safepayCheckout.isLoading}
                onClick={() => void safepayCheckout.startCheckout(order.id)}
              >
                {safepayCheckout.isLoading ? (
                  <>
                    <LoaderCircle
                      className="checkout-processing-icon"
                      size={16}
                      aria-hidden="true"
                    />
                    Preparing Safepay…
                  </>
                ) : (
                  <>
                    Continue to Safepay <ArrowRight size={15} aria-hidden="true" />
                  </>
                )}
                {isManualPayment && (
                  <Link
                    className="checkout-button checkout-button--secondary"
                    to={`/checkout/manual-payment/${encodeURIComponent(order.id)}`}
                  >
                    View payment instructions <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                )}
              </button>
            )}
            {safepayCheckout.error && (
              <CheckoutNotice tone="error" title="Payment session unavailable">
                {safepayCheckout.error}
              </CheckoutNotice>
            )}
            <OrderDetailsDisclosure
              order={order}
              expanded={detailsExpanded}
              onToggle={() => setDetailsExpanded((expanded) => !expanded)}
            />
            <InvoiceUnavailableButton />
            <button
              className="confirmation-action confirmation-action--quiet"
              type="button"
              aria-expanded={showSupportNote}
              aria-controls="confirmation-support-note"
              onClick={() => setShowSupportNote((visible) => !visible)}
            >
              <Headphones size={15} aria-hidden="true" />
              Contact support
              <ArrowRight size={15} aria-hidden="true" />
            </button>
            {showSupportNote && (
              <p className="confirmation-support-note" id="confirmation-support-note" role="status">
                Support contact details will be available when the store launches. Keep order{' '}
                <strong>{order.order_number}</strong> for reference.
              </p>
            )}
            <div className="confirmation-actions-trust">
              <PackageCheck size={15} aria-hidden="true" />
              <span>Your order details are private to your account.</span>
            </div>
          </aside>
        </div>
      </main>
    </CheckoutFrame>
  );
}
