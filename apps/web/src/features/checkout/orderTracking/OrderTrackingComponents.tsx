import { motion, useReducedMotion } from 'framer-motion';
import {
  Box,
  Check,
  CircleAlert,
  Clock3,
  CreditCard,
  MapPin,
  Package,
  PackageCheck,
  Truck,
} from 'lucide-react';
import type { OrderConfirmationData } from '../orderConfirmation/orderConfirmationService';
import {
  trackingPaymentLabel,
  type OrderTrackingPayment,
  type TrackedProductImage,
} from './orderTrackingService';
import { formatCartPrice } from '@/features/cart/cartUtils';
import type { OrderTrackingData } from './orderTrackingService';
import type { Json } from '@/features/auth/types/database';

type TrackingStage =
  | 'order_placed'
  | 'payment_confirmed'
  | 'processing'
  | 'packed'
  | 'ready_for_shipment'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

type TimelineEntry = {
  id: TrackingStage;
  title: string;
  description: string;
  timestamp: string | null;
};

function isPaid(payment: OrderTrackingPayment | null): boolean {
  return payment?.status === 'paid';
}

function snapshotValue(snapshot: Json, key: string): string {
  if (typeof snapshot !== 'object' || snapshot === null || Array.isArray(snapshot)) return '';
  const value = snapshot[key];
  return typeof value === 'string' ? value : '';
}

function addressLines(snapshot: Json): string[] {
  return [
    [snapshotValue(snapshot, 'street_address'), snapshotValue(snapshot, 'apartment')]
      .filter(Boolean)
      .join(', '),
    [
      snapshotValue(snapshot, 'city'),
      snapshotValue(snapshot, 'region'),
      snapshotValue(snapshot, 'postal_code'),
    ]
      .filter(Boolean)
      .join(', '),
    snapshotValue(snapshot, 'country'),
  ].filter(Boolean);
}

function createTimeline(data: OrderTrackingData): TimelineEntry[] {
  const { order, payment } = data;
  const paid = isPaid(payment) || order.status === 'confirmed' || order.status === 'processing';
  const base: TimelineEntry[] = [
    {
      id: 'order_placed',
      title: 'Order placed',
      description: 'We received this order.',
      timestamp: order.created_at,
    },
    {
      id: 'payment_confirmed',
      title: 'Payment confirmed',
      description: paid
        ? 'The payment record is confirmed.'
        : payment?.status
          ? `${trackingPaymentLabel(payment)}.`
          : 'No confirmed payment record is available yet.',
      timestamp: paid ? (payment?.updated_at ?? null) : null,
    },
    {
      id: 'processing',
      title: 'Processing',
      description:
        order.status === 'processing'
          ? 'Payment is confirmed and your order is being prepared.'
          : 'Fulfillment updates are not available yet.',
      timestamp: order.status === 'processing' ? order.updated_at : null,
    },
    {
      id: 'packed',
      title: 'Packed',
      description: 'A packing update will appear when fulfillment tracking is connected.',
      timestamp: null,
    },
    {
      id: 'ready_for_shipment',
      title: 'Ready for shipment',
      description: 'Shipment preparation has not been reported.',
      timestamp: null,
    },
    {
      id: 'shipped',
      title: 'Shipped',
      description: 'Carrier pickup has not been reported.',
      timestamp: null,
    },
    {
      id: 'out_for_delivery',
      title: 'Out for delivery',
      description: 'Live courier updates are not connected.',
      timestamp: null,
    },
    {
      id: 'delivered',
      title: 'Delivered',
      description: 'Delivery confirmation is not available yet.',
      timestamp: null,
    },
  ];

  if (order.status === 'cancelled' || order.status === 'expired') {
    return [
      ...base.slice(0, 1),
      ...(paid ? [base[1]] : []),
      {
        id: 'cancelled',
        title: order.status === 'expired' ? 'Reservation expired' : 'Order cancelled',
        description:
          order.status === 'expired'
            ? 'The temporary inventory reservation expired.'
            : 'This order is no longer active.',
        timestamp: order.updated_at,
      },
    ];
  }
  return base;
}

function currentStage(data: OrderTrackingData): TrackingStage {
  if (data.order.status === 'cancelled' || data.order.status === 'expired') return 'cancelled';
  if (data.order.status === 'processing') return 'processing';
  return isPaid(data.payment) || data.order.status === 'confirmed'
    ? 'payment_confirmed'
    : 'order_placed';
}

export function OrderTrackingTimeline({ data }: { data: OrderTrackingData }) {
  const reduceMotion = useReducedMotion();
  const current = currentStage(data);
  const entries = createTimeline(data);
  const currentIndex = entries.findIndex((entry) => entry.id === current);
  const completedIndex = current === 'cancelled' ? entries.length - 1 : currentIndex;
  const progress = entries.length > 1 ? completedIndex / (entries.length - 1) : 1;
  const cancelled = current === 'cancelled';
  const paymentConfirmed = isPaid(data.payment);

  return (
    <section
      className="tracking-card tracking-timeline-card"
      aria-labelledby="tracking-timeline-title"
    >
      <header className="tracking-card-heading">
        <span className="tracking-icon">
          <PackageCheck size={18} aria-hidden="true" />
        </span>
        <div>
          <p className="checkout-eyebrow">ORDER JOURNEY</p>
          <h2 id="tracking-timeline-title">Every step, thoughtfully shared.</h2>
        </div>
      </header>
      <div
        className={`tracking-progress${cancelled ? ' is-cancelled' : ''}`}
        role="progressbar"
        aria-label="Verified order progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        <motion.span
          initial={reduceMotion ? false : { scaleX: 0 }}
          animate={{ scaleX: progress }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.7, ease: 'easeOut' }}
        />
      </div>
      <ol className="tracking-timeline" aria-label="Order tracking events">
        {entries.map((entry, index) => {
          const isComplete = cancelled
            ? entry.id === 'order_placed' || (entry.id === 'payment_confirmed' && paymentConfirmed)
            : index < currentIndex;
          const isCurrent = entry.id === current;
          const Icon =
            entry.id === 'cancelled'
              ? CircleAlert
              : entry.id === 'order_placed'
                ? PackageCheck
                : entry.id === 'payment_confirmed'
                  ? CreditCard
                  : entry.id === 'packed'
                    ? Box
                    : entry.id === 'delivered'
                      ? Check
                      : Truck;
          return (
            <motion.li
              className={[
                'tracking-timeline-entry',
                isComplete ? 'is-complete' : '',
                isCurrent ? 'is-current' : '',
                entry.id === 'cancelled' ? 'is-cancelled' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              key={entry.id}
              aria-current={isCurrent ? 'step' : undefined}
              initial={reduceMotion ? false : { opacity: 0, y: 7 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduceMotion ? { duration: 0 } : { delay: index * 0.035 }}
            >
              <span className="tracking-timeline-marker" aria-hidden="true">
                <Icon size={15} />
              </span>
              <span className="tracking-timeline-copy">
                <strong>
                  {entry.title}
                  {isCurrent && <span className="tracking-current-label">Latest update</span>}
                </strong>
                <span>{entry.description}</span>
                {entry.timestamp ? (
                  <time dateTime={entry.timestamp}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </time>
                ) : (
                  <small>{isCurrent ? 'No newer updates' : 'No update yet'}</small>
                )}
              </span>
            </motion.li>
          );
        })}
      </ol>
      <p className="tracking-preview-note">
        Only order and payment records are verified. Carrier milestones and delivery estimates will
        appear when fulfillment tracking is connected.
      </p>
    </section>
  );
}

export function ShipmentSummary({ data }: { data: OrderTrackingData }) {
  const { order } = data;
  const isInactive = order.status === 'cancelled' || order.status === 'expired';
  const paid = isPaid(data.payment);
  const paymentLabel = trackingPaymentLabel(data.payment);

  return (
    <section
      className="tracking-card tracking-shipment-card"
      aria-labelledby="tracking-shipment-title"
    >
      <header className="tracking-card-heading">
        <span className="tracking-icon">
          <Truck size={18} aria-hidden="true" />
        </span>
        <div>
          <p className="checkout-eyebrow">SHIPMENT</p>
          <h2 id="tracking-shipment-title">Delivery details.</h2>
        </div>
      </header>
      <dl className="tracking-shipment-details">
        <div>
          <dt>Order status</dt>
          <dd className={isInactive ? 'is-inactive' : ''}>
            {order.status === 'pending_payment'
              ? paid
                ? 'Payment confirmed · fulfillment update pending'
                : `${paymentLabel} · fulfillment update pending`
              : order.status === 'confirmed'
                ? 'Confirmed · fulfillment update pending'
                : order.status === 'processing'
                  ? 'Processing'
                  : order.status === 'expired'
                    ? 'Reservation expired'
                    : 'Cancelled'}
          </dd>
        </div>
        <div>
          <dt>Estimated delivery</dt>
          <dd>Not available yet</dd>
        </div>
        <div>
          <dt>Carrier</dt>
          <dd>Not assigned</dd>
        </div>
        <div>
          <dt>Tracking number</dt>
          <dd>Available after dispatch</dd>
        </div>
      </dl>
      <p className="tracking-placeholder-note">
        {isInactive
          ? 'This order is not active and has no shipment tracking.'
          : 'We’ll show shipment information here once a carrier and fulfillment service are connected.'}
      </p>
    </section>
  );
}

export function TrackingPaymentSummary({
  payment,
  order,
}: {
  payment: OrderTrackingPayment | null;
  order: OrderConfirmationData['order'];
}) {
  const status = payment
    ? trackingPaymentLabel(payment)
    : order.status === 'cancelled' || order.status === 'expired'
      ? 'No payment record'
      : order.status === 'confirmed' || order.status === 'processing'
        ? 'Payment confirmed'
        : 'Payment pending';

  return (
    <section className="tracking-card" aria-labelledby="tracking-payment-title">
      <header className="tracking-card-heading">
        <span className="tracking-icon">
          <CreditCard size={18} aria-hidden="true" />
        </span>
        <div>
          <p className="checkout-eyebrow">PAYMENT</p>
          <h2 id="tracking-payment-title">Payment summary.</h2>
        </div>
      </header>
      <div className="tracking-payment-status">
        <span>
          <Clock3 size={15} aria-hidden="true" />
          {status}
        </span>
        <strong>{formatCartPrice(payment?.amount ?? order.total)}</strong>
      </div>
      <p>
        {payment
          ? 'Payment status is shown from the latest payment record. Provider or card details are not displayed.'
          : 'No payment status is available for this order yet.'}
      </p>
    </section>
  );
}

export function TrackingOrderSummary({
  data,
  productImages,
}: {
  data: OrderTrackingData;
  productImages: Record<string, TrackedProductImage>;
}) {
  const { order, items } = data;
  return (
    <section className="tracking-card" aria-labelledby="tracking-order-summary-title">
      <header className="tracking-card-heading">
        <span className="tracking-icon">
          <Package size={18} aria-hidden="true" />
        </span>
        <div>
          <p className="checkout-eyebrow">ORDER SUMMARY</p>
          <h2 id="tracking-order-summary-title">What’s in your order.</h2>
        </div>
      </header>
      {items.length > 0 ? (
        <ul className="tracking-product-list">
          {items.map((item) => {
            const image = item.product_id ? productImages[item.product_id] : null;
            return (
              <li key={item.id}>
                <span className="tracking-product-image">
                  {image ? (
                    <img src={image.url} alt={image.alt || item.product_name} loading="lazy" />
                  ) : (
                    <Package size={20} aria-hidden="true" />
                  )}
                  <span aria-label={`Quantity ${item.quantity}`} className="tracking-quantity">
                    {item.quantity}
                  </span>
                </span>
                <span className="tracking-product-copy">
                  <strong>{item.product_name}</strong>
                  {item.variant_label && <small>{item.variant_label}</small>}
                  <small>SKU {item.sku}</small>
                </span>
                <span className="tracking-product-price">{formatCartPrice(item.line_total)}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>Item details are temporarily unavailable.</p>
      )}
      <dl className="tracking-order-totals">
        <div>
          <dt>Subtotal</dt>
          <dd>{formatCartPrice(order.subtotal)}</dd>
        </div>
        <div>
          <dt>Shipping</dt>
          <dd>{formatCartPrice(order.shipping_amount)}</dd>
        </div>
        <div>
          <dt>Tax</dt>
          <dd>{formatCartPrice(order.tax_amount)}</dd>
        </div>
        <div>
          <dt>Discount</dt>
          <dd>{formatCartPrice(0)}</dd>
        </div>
        <div className="tracking-total">
          <dt>Grand total</dt>
          <dd>{formatCartPrice(order.total)}</dd>
        </div>
      </dl>
      <p className="tracking-preview-note">
        Discount is shown as zero; the current order system does not apply or store discounts.
      </p>
    </section>
  );
}

export function TrackingAddressSummary({ snapshot }: { snapshot: Json }) {
  const name = snapshotValue(snapshot, 'full_name');
  const lines = addressLines(snapshot);
  return (
    <section className="tracking-card" aria-labelledby="tracking-address-title">
      <header className="tracking-card-heading">
        <span className="tracking-icon">
          <MapPin size={18} aria-hidden="true" />
        </span>
        <div>
          <p className="checkout-eyebrow">DELIVERY ADDRESS</p>
          <h2 id="tracking-address-title">Where it’s going.</h2>
        </div>
      </header>
      <address className="tracking-address">
        {name && <strong>{name}</strong>}
        {lines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </address>
    </section>
  );
}

export function TrackingLoading() {
  return (
    <main className="tracking-content" id="checkout-content" aria-busy="true">
      <div className="tracking-skeleton-heading">
        <span />
        <span />
        <span />
      </div>
      <div className="tracking-skeleton-layout">
        <div className="tracking-skeleton-card tracking-skeleton-card--timeline">
          {Array.from({ length: 7 }, (_, index) => (
            <span key={index} />
          ))}
        </div>
        <div className="tracking-skeleton-column">
          <span />
          <span />
          <span />
        </div>
      </div>
    </main>
  );
}
