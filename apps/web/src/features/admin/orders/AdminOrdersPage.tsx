import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LoaderCircle,
  Package,
  Search,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSupabaseClient } from '@/lib/supabase';
import { formatCartPrice } from '@/features/cart/cartUtils';
import {
  ADMIN_ORDER_PAGE_SIZE,
  loadAdminOrders,
  type AdminOrderStatus,
  type AdminOrderWithItems,
} from './orderService';
import './admin-orders.css';

type OrderNotice = { kind: 'error'; message: string };
const ORDER_STATUSES: { value: AdminOrderStatus; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending_payment', label: 'Payment pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'expired', label: 'Expired' },
];
const DATE_FILTERS = [
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 days' },
  { value: '30days', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom range' },
] as const;
type DateFilter = (typeof DATE_FILTERS)[number]['value'];

function localDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getLocalDateOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDateValue(date);
}

function getDateRange(filter: DateFilter, from: string, to: string) {
  if (filter === 'all') return { startAt: null, endAt: null };
  if (filter === 'custom' && (!from || !to)) return { startAt: null, endAt: null };
  const today = localDateValue(new Date());
  const startDate =
    filter === 'today'
      ? today
      : filter === '7days'
        ? getLocalDateOffset(-6)
        : filter === '30days'
          ? getLocalDateOffset(-29)
          : from;
  const endDate = filter === 'custom' ? to : today;
  const endExclusive = new Date(`${endDate}T00:00:00`);
  endExclusive.setDate(endExclusive.getDate() + 1);
  return {
    startAt: new Date(`${startDate}T00:00:00`).toISOString(),
    endAt: endExclusive.toISOString(),
  };
}

const EMPTY_SUMMARY = {
  orderCount: 0,
  pendingCount: 0,
  inactiveCount: 0,
  pendingOrderValue: 0,
};

function snapshotValue(
  snapshot: AdminOrderWithItems['order']['shipping_address_snapshot'],
  key: string,
) {
  if (typeof snapshot !== 'object' || snapshot === null || Array.isArray(snapshot)) return '';
  const value = snapshot[key];
  return typeof value === 'string' ? value : '';
}

function getAddressLines(snapshot: AdminOrderWithItems['order']['shipping_address_snapshot']) {
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

function orderStatusLabel(status: AdminOrderWithItems['order']['status']): string {
  if (status === 'pending_payment') return 'Payment pending';
  if (status === 'confirmed') return 'Confirmed';
  if (status === 'processing') return 'Processing';
  return status === 'cancelled' ? 'Cancelled' : 'Expired';
}

function OrderRow({ entry }: { entry: AdminOrderWithItems }) {
  const { order, items } = entry;
  const customerName = snapshotValue(order.shipping_address_snapshot, 'full_name');
  const customerEmail = snapshotValue(order.shipping_address_snapshot, 'email');
  const customerPhone = snapshotValue(order.shipping_address_snapshot, 'phone');
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <details className="admin-order-entry">
      <summary className="admin-order-row">
        <span className="admin-order-number">
          <strong>{order.order_number}</strong>
          <small>{new Date(order.created_at).toLocaleString()}</small>
        </span>
        <span className="admin-order-customer">
          <strong>{customerName || 'Customer details unavailable'}</strong>
          <small>{customerEmail || customerPhone || 'Contact details unavailable'}</small>
        </span>
        <span className={`admin-order-status admin-order-status--${order.status}`}>
          {orderStatusLabel(order.status)}
        </span>
        <span className="admin-order-count">
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </span>
        <strong className="admin-order-total">{formatCartPrice(order.total)}</strong>
        <ChevronDown className="admin-order-chevron" size={16} aria-hidden="true" />
      </summary>
      <div className="admin-order-details">
        <section>
          <h3>Items</h3>
          {items.length ? (
            <ul className="admin-order-items">
              {items.map((item) => (
                <li key={item.id}>
                  <span>
                    <strong>{item.product_name}</strong>
                    <small>
                      {item.variant_label ? `${item.variant_label} · ` : ''}SKU {item.sku}
                    </small>
                  </span>
                  <span>
                    {item.quantity} × {formatCartPrice(item.unit_price)}
                  </span>
                  <strong>{formatCartPrice(item.line_total)}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p>There are no item details for this order.</p>
          )}
          <dl className="admin-order-totals">
            <div>
              <dt>Subtotal</dt>
              <dd>{formatCartPrice(order.subtotal)}</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>{formatCartPrice(order.shipping_amount)}</dd>
            </div>
            <div>
              <dt>Tax</dt>
              <dd>{formatCartPrice(order.tax_amount)}</dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd>{formatCartPrice(order.total)}</dd>
            </div>
          </dl>
        </section>
        <section>
          <h3>Shipping address</h3>
          <address>
            <strong>{customerName}</strong>
            {getAddressLines(order.shipping_address_snapshot).map((line) => (
              <span key={line}>{line}</span>
            ))}
            {customerEmail && <a href={`mailto:${customerEmail}`}>{customerEmail}</a>}
            {customerPhone && <a href={`tel:${customerPhone}`}>{customerPhone}</a>}
          </address>
        </section>
        <p className="admin-order-payment-note">
          Payment is pending. No payment gateway is connected in this phase.
        </p>
        <p className="admin-order-reservation">
          Temporary inventory reservation expires{' '}
          <time dateTime={order.reservation_expires_at}>
            {new Date(order.reservation_expires_at).toLocaleString()}
          </time>
        </p>
      </div>
    </details>
  );
}

export default function AdminOrdersPage() {
  const reduceMotion = useReducedMotion();
  const [orders, setOrders] = useState<AdminOrderWithItems[]>([]);
  const [status, setStatus] = useState<AdminOrderStatus>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('30days');
  const [customStart, setCustomStart] = useState(() => getLocalDateOffset(-29));
  const [customEnd, setCustomEnd] = useState(() => localDateValue(new Date()));
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [orderSummary, setOrderSummary] = useState(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<OrderNotice | null>(null);
  const pageCount = Math.max(1, Math.ceil(totalCount / ADMIN_ORDER_PAGE_SIZE));
  const { startAt, endAt } = getDateRange(dateFilter, customStart, customEnd);

  const load = useCallback(
    async (isCurrent: () => boolean = () => true) => {
      setIsLoading(true);
      try {
        const client = await getSupabaseClient();
        const result = await loadAdminOrders(client, { page, status, search, startAt, endAt });
        if (!isCurrent()) return;
        setOrders(result.orders);
        setTotalCount(result.totalCount);
        setOrderSummary(result.summary);
        setNotice(null);
      } catch (error) {
        if (!isCurrent()) return;
        setNotice({
          kind: 'error',
          message: error instanceof Error ? error.message : 'Orders could not be loaded.',
        });
      } finally {
        if (isCurrent()) setIsLoading(false);
      }
    },
    [endAt, page, search, startAt, status],
  );

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      if (active) await load(() => active);
    });
    return () => {
      active = false;
    };
  }, [load]);

  const firstOrder = totalCount === 0 ? 0 : (page - 1) * ADMIN_ORDER_PAGE_SIZE + 1;
  const lastOrder = Math.min(page * ADMIN_ORDER_PAGE_SIZE, totalCount);
  const summary = useMemo(() => {
    const count = orderSummary.orderCount;
    return `${count} ${count === 1 ? 'order' : 'orders'} in selected period`;
  }, [orderSummary.orderCount]);

  return (
    <main className="admin-orders">
      <header className="admin-orders-topbar">
        <Link className="admin-orders-brand" to="/" aria-label="AlSera home">
          <span className="admin-orders-brand-mark">A</span>
          <span>
            <strong>AlSera</strong>
            <small>Commerce studio</small>
          </span>
        </Link>
        <nav className="admin-orders-nav" aria-label="Admin navigation">
          <span>ADMIN CONSOLE</span>
          <Link to="/admin/homepage">Homepage</Link>
          <Link to="/admin/products">Products</Link>
          <Link className="is-active" to="/admin/orders" aria-current="page">
            Orders
          </Link>
          <Link to="/" className="admin-orders-storefront">
            <ArrowLeft size={15} aria-hidden="true" /> Storefront
          </Link>
        </nav>
      </header>

      <div className="admin-orders-content">
        <motion.header
          className="admin-orders-heading"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div>
            <p className="admin-orders-eyebrow">
              <ClipboardList size={15} aria-hidden="true" /> ORDER MANAGEMENT
            </p>
            <h1>Customer orders</h1>
            <p>
              Review recent purchases, customer details, shipping information, and order totals.
            </p>
          </div>
          <div className="admin-orders-summary">
            <Package size={17} aria-hidden="true" />
            <span>{summary}</span>
          </div>
        </motion.header>

        <section className="admin-orders-metrics" aria-label="Order summary">
          <article className="admin-orders-metric">
            <span>Orders in period</span>
            <strong>{orderSummary.orderCount}</strong>
            <small>Based on selected dates</small>
          </article>
          <article className="admin-orders-metric admin-orders-metric--pending">
            <span>Payment pending</span>
            <strong>{orderSummary.pendingCount}</strong>
            <small>Not yet collected</small>
          </article>
          <article className="admin-orders-metric admin-orders-metric--inactive">
            <span>Cancelled / expired</span>
            <strong>{orderSummary.inactiveCount}</strong>
            <small>Based on selected dates</small>
          </article>
          <article className="admin-orders-metric admin-orders-metric--value">
            <span>Unpaid order value</span>
            <strong>{formatCartPrice(orderSummary.pendingOrderValue)}</strong>
            <small>Pending orders only · not revenue</small>
          </article>
        </section>

        <section className="admin-orders-panel" aria-label="Customer orders">
          <div className="admin-orders-toolbar">
            <div>
              <h2>All orders</h2>
              <p>
                {totalCount
                  ? `Showing ${firstOrder}–${lastOrder} of ${totalCount}`
                  : 'Orders are listed newest first.'}
              </p>
            </div>
            <div className="admin-orders-filters">
              <label className="admin-orders-search">
                <Search size={16} aria-hidden="true" />
                <span className="visually-hidden">Search by order number</span>
                <input
                  type="search"
                  placeholder="Search order number"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <label className="admin-orders-select">
                <span className="visually-hidden">Filter by order status</span>
                <select
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value as AdminOrderStatus);
                    setPage(1);
                  }}
                >
                  {ORDER_STATUSES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} aria-hidden="true" />
              </label>
              <label className="admin-orders-select admin-orders-date-select">
                <CalendarDays size={15} aria-hidden="true" />
                <span className="visually-hidden">Filter by order date</span>
                <select
                  value={dateFilter}
                  onChange={(event) => {
                    setDateFilter(event.target.value as DateFilter);
                    setPage(1);
                  }}
                >
                  {DATE_FILTERS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} aria-hidden="true" />
              </label>
            </div>
          </div>

          {dateFilter === 'custom' && (
            <div className="admin-orders-date-range">
              <label>
                <span>From</span>
                <input
                  type="date"
                  value={customStart}
                  max={customEnd}
                  onChange={(event) => {
                    if (event.target.value) setCustomStart(event.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <label>
                <span>To</span>
                <input
                  type="date"
                  value={customEnd}
                  min={customStart}
                  onChange={(event) => {
                    if (event.target.value) setCustomEnd(event.target.value);
                    setPage(1);
                  }}
                />
              </label>
            </div>
          )}

          {notice && (
            <div className="admin-orders-error" role="alert">
              {notice.message}
              <button type="button" onClick={() => void load()}>
                Try again
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="admin-orders-loading" role="status">
              <LoaderCircle className="admin-orders-spinner" size={22} aria-hidden="true" />
              Loading customer orders…
            </div>
          ) : notice ? null : orders.length === 0 ? (
            <div className="admin-orders-empty">
              <span>
                <Package size={22} aria-hidden="true" />
              </span>
              <h3>{totalCount ? 'No matching orders' : 'No orders yet'}</h3>
              <p>
                {totalCount
                  ? 'Try another order number or status filter.'
                  : 'Orders placed by customers will appear here.'}
              </p>
            </div>
          ) : (
            <>
              <div className="admin-orders-table-head" aria-hidden="true">
                <span>Order</span>
                <span>Customer</span>
                <span>Status</span>
                <span>Items</span>
                <span>Total</span>
                <span />
              </div>
              <div className="admin-orders-list">
                {orders.map((entry) => (
                  <OrderRow key={entry.order.id} entry={entry} />
                ))}
              </div>
            </>
          )}

          <footer className="admin-orders-pagination">
            <span>
              {totalCount ? `${firstOrder}–${lastOrder} of ${totalCount} orders` : '0 orders'}
            </span>
            <div>
              <button
                type="button"
                aria-label="Previous page"
                title="Previous page"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((current) => current - 1)}
              >
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <span>
                Page {page} of {pageCount}
              </span>
              <button
                type="button"
                aria-label="Next page"
                title="Next page"
                disabled={page >= pageCount || isLoading}
                onClick={() => setPage((current) => current + 1)}
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          </footer>
        </section>
      </div>
    </main>
  );
}
