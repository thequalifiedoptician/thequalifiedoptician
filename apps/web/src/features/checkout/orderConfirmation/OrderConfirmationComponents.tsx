import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  CircleAlert,
  Clock3,
  PackageCheck,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Json } from '@/features/auth/types/database';
import { formatCartPrice } from '@/features/cart/cartUtils';
import type { ConfirmedOrder, ConfirmedOrderItem } from './orderConfirmationService';

export type OrderProgressStatus =
  'processing' | 'confirmed' | 'packed' | 'shipped' | 'delivered' | 'cancelled';

function snapshotValue(snapshot: Json, key: string): string {
  if (typeof snapshot !== 'object' || snapshot === null || Array.isArray(snapshot)) return '';
  const value = snapshot[key];
  return typeof value === 'string' ? value : '';
}

function snapshotAddressLines(snapshot: Json): string[] {
  const street = snapshotValue(snapshot, 'street_address');
  const apartment = snapshotValue(snapshot, 'apartment');
  const city = snapshotValue(snapshot, 'city');
  const region = snapshotValue(snapshot, 'region');
  const postalCode = snapshotValue(snapshot, 'postal_code');
  const country = snapshotValue(snapshot, 'country');

  return [
    [street, apartment].filter(Boolean).join(', '),
    [city, region, postalCode].filter(Boolean).join(', '),
    country,
  ].filter(Boolean);
}

export function OrderStatusBadge({
  status,
  label,
}: {
  status: OrderProgressStatus;
  label?: string;
}) {
  const StatusIcon =
    status === 'cancelled'
      ? CircleAlert
      : status === 'delivered'
        ? Check
        : status === 'shipped'
          ? Truck
          : status === 'processing'
            ? Clock3
            : PackageCheck;

  return (
    <span className={`order-status-badge order-status-badge--${status}`}>
      <StatusIcon size={13} aria-hidden="true" />
      {label ?? status}
    </span>
  );
}

export function OrderTimeline({ status }: { status: OrderProgressStatus }) {
  const reduceMotion = useReducedMotion();
  const steps: { id: OrderProgressStatus; label: string; description: string }[] = [
    { id: 'processing', label: 'Order received', description: 'Your order is in our system.' },
    { id: 'confirmed', label: 'Confirmed', description: 'Order confirmation follows payment.' },
    { id: 'packed', label: 'Packed', description: 'Your pieces are prepared for dispatch.' },
    { id: 'shipped', label: 'Shipped', description: 'Your parcel is on its way.' },
    { id: 'delivered', label: 'Delivered', description: 'Your order has arrived.' },
  ];
  const activeIndex = steps.findIndex((step) => step.id === status);
  const cancelled = status === 'cancelled';

  return (
    <section
      className="confirmation-card confirmation-timeline"
      aria-labelledby="order-timeline-title"
    >
      <div className="confirmation-card-heading">
        <span className="confirmation-icon" aria-hidden="true">
          <Truck size={18} />
        </span>
        <div>
          <p className="checkout-eyebrow">WHAT HAPPENS NEXT</p>
          <h2 id="order-timeline-title">A thoughtful journey.</h2>
        </div>
      </div>
      <ol className="order-timeline" aria-label="Order progress">
        {steps.slice(0, cancelled ? 1 : steps.length).map((step, index) => {
          const isComplete = !cancelled && activeIndex >= 0 && index < activeIndex;
          const isCurrent = !cancelled && index === activeIndex;
          return (
            <motion.li
              className={[
                'order-timeline-step',
                isComplete ? 'is-complete' : '',
                isCurrent ? 'is-current' : '',
                cancelled ? 'is-upcoming' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-current={isCurrent ? 'step' : undefined}
              key={step.id}
              initial={reduceMotion ? false : { opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={reduceMotion ? { duration: 0 } : { delay: index * 0.045 }}
            >
              <span className="order-timeline-marker" aria-hidden="true">
                {isComplete ? <Check size={12} /> : isCurrent ? <span /> : null}
              </span>
              <span className="order-timeline-copy">
                <span className="order-timeline-title">
                  {step.label}
                  {isCurrent && <span className="order-timeline-current">Current</span>}
                </span>
                <span className="order-timeline-description">{step.description}</span>
              </span>
            </motion.li>
          );
        })}
        {cancelled && (
          <li className="order-timeline-step is-cancelled">
            <span className="order-timeline-marker" aria-hidden="true">
              <CircleAlert size={12} />
            </span>
            <span className="order-timeline-copy">
              <span className="order-timeline-title">Order not active</span>
              <span className="order-timeline-description">
                This order was cancelled or its reservation expired.
              </span>
            </span>
          </li>
        )}
      </ol>
      <p className="confirmation-preview-note">
        Delivery milestones are a preview until fulfillment tracking is connected.
      </p>
    </section>
  );
}

export function OrderSummaryCard({
  order,
  items,
}: {
  order: ConfirmedOrder;
  items: ConfirmedOrderItem[];
}) {
  return (
    <section
      className="confirmation-card confirmation-order-summary"
      id="order-summary"
      aria-labelledby="order-summary-title"
    >
      <div className="confirmation-card-heading">
        <span className="confirmation-icon" aria-hidden="true">
          <PackageCheck size={18} />
        </span>
        <div>
          <p className="checkout-eyebrow">YOUR ORDER</p>
          <h2 id="order-summary-title">The details, at a glance.</h2>
        </div>
      </div>
      <ul className="confirmation-item-list">
        {items.map((item) => (
          <li className="confirmation-item" key={item.id}>
            <span className="confirmation-item-quantity" aria-label={`Quantity ${item.quantity}`}>
              {String(item.quantity).padStart(2, '0')}
            </span>
            <span className="confirmation-item-copy">
              <strong>{item.product_name}</strong>
              {item.variant_label && <small>{item.variant_label}</small>}
              <small>SKU {item.sku}</small>
            </span>
            <span className="confirmation-item-price">{formatCartPrice(item.line_total)}</span>
          </li>
        ))}
        {items.length === 0 && (
          <li className="confirmation-empty-items">
            Item details are temporarily unavailable. Your order total remains below.
          </li>
        )}
      </ul>
      <dl className="confirmation-totals">
        <div>
          <dt>Subtotal</dt>
          <dd>{formatCartPrice(order.subtotal)}</dd>
        </div>
        <div>
          <dt>Delivery</dt>
          <dd>
            {order.shipping_amount === 0 ? 'Complimentary' : formatCartPrice(order.shipping_amount)}
          </dd>
        </div>
        <div>
          <dt>Estimated tax</dt>
          <dd>{formatCartPrice(order.tax_amount)}</dd>
        </div>
        <div>
          <dt>Discount</dt>
          <dd>{formatCartPrice(0)}</dd>
        </div>
        <div className="confirmation-grand-total">
          <dt>Total</dt>
          <dd>{formatCartPrice(order.total)}</dd>
        </div>
      </dl>
      <p className="confirmation-preview-note">
        Shipping, tax, and discounts are placeholders for this checkout phase.
      </p>
    </section>
  );
}

export function CustomerInformationCard({ snapshot }: { snapshot: Json }) {
  const name = snapshotValue(snapshot, 'full_name');
  const email = snapshotValue(snapshot, 'email');
  const phone = snapshotValue(snapshot, 'phone');

  return (
    <section className="confirmation-card" aria-labelledby="customer-information-title">
      <div className="confirmation-card-heading">
        <span className="confirmation-icon" aria-hidden="true">
          <ShieldCheck size={18} />
        </span>
        <div>
          <p className="checkout-eyebrow">ORDERED BY</p>
          <h2 id="customer-information-title">Your details.</h2>
        </div>
      </div>
      <dl className="confirmation-information-list">
        {name && (
          <div>
            <dt>Name</dt>
            <dd>{name}</dd>
          </div>
        )}
        {email && (
          <div>
            <dt>Email</dt>
            <dd>{email}</dd>
          </div>
        )}
        {phone && (
          <div>
            <dt>Phone</dt>
            <dd>{phone}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}

export function ShippingAddressCard({ snapshot }: { snapshot: Json }) {
  const lines = snapshotAddressLines(snapshot);
  const name = snapshotValue(snapshot, 'full_name');
  const notes = snapshotValue(snapshot, 'delivery_notes');

  return (
    <section className="confirmation-card" aria-labelledby="shipping-address-title">
      <div className="confirmation-card-heading">
        <span className="confirmation-icon" aria-hidden="true">
          <Truck size={18} />
        </span>
        <div>
          <p className="checkout-eyebrow">DELIVERY TO</p>
          <h2 id="shipping-address-title">A place to arrive.</h2>
        </div>
      </div>
      <address className="confirmation-address">
        {name && <strong>{name}</strong>}
        {lines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </address>
      {notes && (
        <p className="confirmation-delivery-note">
          <strong>Delivery note</strong>
          {notes}
        </p>
      )}
    </section>
  );
}

export function PaymentSummaryCard({
  currency,
  status,
  method,
}: {
  currency: string;
  status:
    | 'pending'
    | 'processing'
    | 'authorized'
    | 'paid'
    | 'failed'
    | 'cancelled'
    | 'refunded'
    | 'unverified';
  method: string | null;
}) {
  const statusLabel =
    status === 'paid'
      ? 'Payment confirmed'
      : status === 'unverified'
        ? 'Payment status unverified'
        : status === 'authorized'
          ? 'Payment authorized'
          : status === 'processing'
            ? 'Payment processing'
            : status === 'failed'
              ? 'Payment failed'
              : status === 'cancelled'
                ? 'Payment cancelled'
                : status === 'refunded'
                  ? 'Payment refunded'
                  : 'Payment pending';
  const isPendingOrUnverified = status === 'pending' || status === 'unverified';

  return (
    <section className="confirmation-card" aria-labelledby="payment-summary-title">
      <div className="confirmation-card-heading">
        <span className="confirmation-icon" aria-hidden="true">
          <ShieldCheck size={18} />
        </span>
        <div>
          <p className="checkout-eyebrow">PAYMENT</p>
          <h2 id="payment-summary-title">
            {status === 'paid' ? 'Payment confirmed.' : 'Payment details.'}
          </h2>
        </div>
      </div>
      <div className="confirmation-payment-status">
        <span>
          {status === 'paid' ? (
            <Check size={15} aria-hidden="true" />
          ) : (
            <Clock3 size={15} aria-hidden="true" />
          )}
          {statusLabel}
        </span>
        <span>{method ?? currency}</span>
      </div>
      <p className="confirmation-payment-copy">
        {isPendingOrUnverified
          ? 'Only a verified server-side Safepay webhook can confirm a payment; returning from hosted checkout alone does not.'
          : `The latest payment status recorded for this order is ${statusLabel.toLowerCase()}.`}
      </p>
    </section>
  );
}

export function OrderConfirmationLoading() {
  return (
    <main
      className="confirmation-content"
      id="checkout-content"
      aria-busy="true"
      aria-label="Loading order details"
    >
      <div className="confirmation-skeleton-hero">
        <span />
        <span />
        <span />
      </div>
      <div className="confirmation-skeleton-layout">
        <div className="confirmation-skeleton-column">
          <span />
          <span />
          <span />
        </div>
        <div className="confirmation-skeleton-column">
          <span />
          <span />
        </div>
      </div>
    </main>
  );
}

export function OrderConfirmationError({
  notFound,
  onRetry,
}: {
  notFound: boolean;
  onRetry: () => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.main
      className="confirmation-content"
      id="checkout-content"
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <section className="confirmation-error-card" role="alert">
        <span className="confirmation-success-mark confirmation-success-mark--error">
          <CircleAlert size={25} aria-hidden="true" />
        </span>
        <p className="checkout-eyebrow">{notFound ? 'ORDER NOT FOUND' : 'A MOMENT, PLEASE'}</p>
        <h1>
          {notFound ? 'We could not find this order.' : 'Your order details are unavailable.'}
        </h1>
        <p>
          {notFound
            ? 'The order may belong to another account, or the link may be incorrect.'
            : 'Your order may still have been created. Please retry loading its details.'}
        </p>
        {!notFound && (
          <button
            className="checkout-button checkout-button--secondary"
            type="button"
            onClick={onRetry}
          >
            Try again
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        )}
        <Link className="checkout-button checkout-button--primary" to="/shop">
          Continue shopping
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </section>
    </motion.main>
  );
}

export function InvoiceUnavailableButton() {
  return (
    <button
      className="confirmation-action confirmation-action--quiet"
      type="button"
      disabled
      title="Invoice downloads will be available in a later phase."
      aria-label="Download invoice, not available yet"
    >
      <ArrowDownToLine size={15} aria-hidden="true" />
      Download invoice
      <span className="confirmation-action-soon">Soon</span>
    </button>
  );
}

export function ConfirmationActionIcon() {
  return <ArrowRight size={15} aria-hidden="true" />;
}

export function ConfirmationMotion({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.3, delay }}
    >
      {children}
    </motion.div>
  );
}

export function OrderDetailsDisclosure({
  order,
  expanded,
  onToggle,
}: {
  order: ConfirmedOrder;
  expanded: boolean;
  onToggle: () => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <>
      <button
        className="confirmation-action confirmation-action--secondary"
        type="button"
        aria-expanded={expanded}
        aria-controls="confirmation-extra-details"
        onClick={onToggle}
      >
        {expanded ? 'Hide order details' : 'View order details'}
        <AnimatePresence initial={false} mode="wait">
          <motion.span
            key={expanded ? 'hide' : 'show'}
            initial={reduceMotion ? false : { opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -3 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.16 }}
          >
            <ArrowRight size={14} aria-hidden="true" />
          </motion.span>
        </AnimatePresence>
      </button>
      <div
        className="confirmation-extra-details"
        id="confirmation-extra-details"
        hidden={!expanded}
      >
        <div>
          <span>Order placed</span>
          <time dateTime={order.created_at}>{new Date(order.created_at).toLocaleString()}</time>
        </div>
        <div>
          <span>Order reference</span>
          <strong>{order.order_number}</strong>
        </div>
        <div>
          <span>Reservation expires</span>
          <time dateTime={order.reservation_expires_at}>
            {new Date(order.reservation_expires_at).toLocaleString()}
          </time>
        </div>
      </div>
    </>
  );
}
