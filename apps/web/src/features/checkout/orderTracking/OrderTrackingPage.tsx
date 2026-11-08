import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  CircleAlert,
  Clock3,
  Headphones,
  PackageCheck,
  Truck,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { AUTH_ROUTES } from '@/features/auth/constants/auth';
import { getAuthRedirectState } from '@/features/auth/utils/authNavigation';
import '../checkout.css';
import { CheckoutFrame } from '../CheckoutDesignSystem';
import {
  ConfirmationMotion,
  InvoiceUnavailableButton,
  OrderConfirmationError,
  OrderDetailsDisclosure,
} from '../orderConfirmation/OrderConfirmationComponents';
import {
  OrderTrackingTimeline,
  ShipmentSummary,
  TrackingAddressSummary,
  TrackingLoading,
  TrackingOrderSummary,
  TrackingPaymentSummary,
} from './OrderTrackingComponents';
import { trackingPaymentLabel } from './orderTrackingService';
import { useOrderTracking } from './useOrderTracking';
import './order-tracking.css';

export default function OrderTrackingPage() {
  const { orderId } = useParams();
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const tracking = useOrderTracking(orderId, user?.id);
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

  useEffect(() => {
    if (tracking.data) headingRef.current?.focus();
  }, [tracking.data]);

  if (isAuthLoading || !isAuthenticated || tracking.isLoading) {
    return (
      <CheckoutFrame>
        <TrackingLoading />
      </CheckoutFrame>
    );
  }

  if (tracking.error || !tracking.data) {
    return (
      <CheckoutFrame>
        <OrderConfirmationError
          notFound={tracking.error?.code === 'not-found'}
          onRetry={tracking.retry}
        />
      </CheckoutFrame>
    );
  }

  const { order } = tracking.data;
  const isInactive = order.status === 'cancelled' || order.status === 'expired';
  const isPaid =
    tracking.data.payment?.status === 'paid' ||
    order.status === 'confirmed' ||
    order.status === 'processing';
  const statusLabel = isInactive
    ? order.status === 'expired'
      ? 'Reservation expired'
      : 'Order cancelled'
    : order.status === 'processing'
      ? 'Processing'
      : order.status === 'confirmed'
        ? 'Confirmed · fulfillment update pending'
        : isPaid
          ? 'Payment confirmed · fulfillment update pending'
          : `${trackingPaymentLabel(tracking.data.payment)} · fulfillment update pending`;

  return (
    <CheckoutFrame>
      <main className="tracking-content" id="checkout-content">
        <ConfirmationMotion className="tracking-hero">
          <motion.span
            className={`tracking-hero-mark${isInactive ? ' is-inactive' : ''}`}
            initial={reduceMotion ? false : { scale: 0.78, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={
              reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 190, damping: 17 }
            }
          >
            {isInactive ? (
              <CircleAlert size={25} aria-hidden="true" />
            ) : isPaid ? (
              <Check size={25} aria-hidden="true" />
            ) : (
              <PackageCheck size={25} aria-hidden="true" />
            )}
          </motion.span>
          <p className="checkout-eyebrow">ORDER TRACKING</p>
          <h1 ref={headingRef} tabIndex={-1}>
            {isInactive ? 'An update on your order.' : 'Your order, thoughtfully followed.'}
          </h1>
          <p className="tracking-hero-copy">
            {isInactive
              ? 'This order is no longer active. There is no shipment to track.'
              : 'Your order details are together here. We’ll show verified updates as they become available.'}
          </p>
          <div className="tracking-reference">
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
          <span className={`tracking-status-pill${isInactive ? ' is-inactive' : ''}`}>
            {isInactive ? (
              <CircleAlert size={14} aria-hidden="true" />
            ) : isPaid ? (
              <Check size={14} aria-hidden="true" />
            ) : (
              <Clock3 size={14} aria-hidden="true" />
            )}
            {statusLabel}
          </span>
        </ConfirmationMotion>

        <div className="tracking-unavailable-notice" role="status">
          <Truck size={18} aria-hidden="true" />
          <p>
            <strong>Shipment tracking isn’t available yet.</strong>
            Carrier, tracking number, and estimated delivery will appear here after fulfillment
            tracking is connected. No delivery date or courier update has been invented.
          </p>
        </div>

        <div className="tracking-layout">
          <div className="tracking-main-column">
            <ConfirmationMotion delay={0.04}>
              <ShipmentSummary data={tracking.data} />
            </ConfirmationMotion>
            <ConfirmationMotion delay={0.08}>
              <OrderTrackingTimeline data={tracking.data} />
            </ConfirmationMotion>
            <ConfirmationMotion delay={0.12}>
              <TrackingOrderSummary
                data={tracking.data}
                productImages={tracking.data.productImages}
              />
            </ConfirmationMotion>
            <div className="tracking-information-grid">
              <ConfirmationMotion delay={0.16}>
                <TrackingAddressSummary snapshot={order.shipping_address_snapshot} />
              </ConfirmationMotion>
              <ConfirmationMotion delay={0.2}>
                <TrackingPaymentSummary payment={tracking.data.payment} order={order} />
              </ConfirmationMotion>
            </div>
          </div>

          <aside className="tracking-actions" aria-label="Order actions">
            <p className="checkout-eyebrow">HERE FOR YOU</p>
            <h2>Need anything else?</h2>
            <Link className="checkout-button checkout-button--primary" to="/shop">
              Continue shopping <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link
              className="confirmation-action confirmation-action--secondary tracking-action-link"
              to={`/checkout/confirmation/${encodeURIComponent(order.id)}`}
            >
              View order details <ArrowRight size={14} aria-hidden="true" />
            </Link>
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
              aria-controls="tracking-support-note"
              onClick={() => setShowSupportNote((visible) => !visible)}
            >
              <Headphones size={15} aria-hidden="true" />
              Contact support <ArrowRight size={15} aria-hidden="true" />
            </button>
            {showSupportNote && (
              <p className="confirmation-support-note" id="tracking-support-note" role="status">
                Support contact details will be available when the store launches. Keep order{' '}
                <strong>{order.order_number}</strong> for reference.
              </p>
            )}
            <div className="tracking-actions-trust">
              <PackageCheck size={15} aria-hidden="true" />
              <span>Tracking information is private to your account.</span>
            </div>
          </aside>
        </div>
      </main>
    </CheckoutFrame>
  );
}
