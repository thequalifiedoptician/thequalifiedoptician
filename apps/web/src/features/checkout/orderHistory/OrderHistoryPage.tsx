import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Package,
  RefreshCw,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { AUTH_ROUTES } from '@/features/auth/constants/auth';
import { getAuthRedirectState } from '@/features/auth/utils/authNavigation';
import { formatCartPrice } from '@/features/cart/cartUtils';
import {
  loadOrderHistory,
  ORDER_HISTORY_PAGE_SIZE,
  type OrderHistoryEntry,
} from './orderHistoryService';
import './order-history.css';

type HistoryStatus = 'pending_payment' | 'confirmed' | 'processing' | 'cancelled' | 'expired';

function statusLabel(status: HistoryStatus): string {
  if (status === 'pending_payment') return 'Payment pending';
  if (status === 'confirmed') return 'Confirmed';
  if (status === 'processing') return 'Processing';
  return status === 'cancelled' ? 'Cancelled' : 'Reservation expired';
}

function OrderCard({ entry }: { entry: OrderHistoryEntry }) {
  const { order, items } = entry;
  const quantity = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <article className="order-history-card">
      <header className="order-history-card-header">
        <div>
          <p>ORDER NUMBER</p>
          <strong>{order.order_number}</strong>
        </div>
        <span className={`order-history-status order-history-status--${order.status}`}>
          {statusLabel(order.status)}
        </span>
      </header>
      <div className="order-history-card-meta">
        <span>
          Placed{' '}
          <time dateTime={order.created_at}>
            {new Date(order.created_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
        </span>
        <span>
          {quantity} {quantity === 1 ? 'item' : 'items'}
        </span>
      </div>
      <ul className="order-history-items" aria-label="Items in this order">
        {items.slice(0, 3).map((item) => (
          <li key={item.id}>
            <span className="order-history-item-copy">
              <strong>{item.product_name}</strong>
              <small>
                {item.variant_label ? `${item.variant_label} · ` : ''}Qty {item.quantity}
              </small>
            </span>
            <span>{formatCartPrice(item.line_total)}</span>
          </li>
        ))}
        {items.length > 3 && (
          <li className="order-history-more-items">and {items.length - 3} more items</li>
        )}
        {items.length === 0 && (
          <li className="order-history-more-items">Item details are unavailable.</li>
        )}
      </ul>
      <footer className="order-history-card-footer">
        <span>
          <small>ORDER TOTAL</small>
          <strong>{formatCartPrice(order.total)}</strong>
        </span>
        <div>
          <Link
            className="order-history-secondary-action"
            to={`/account/orders/${encodeURIComponent(order.id)}/tracking`}
          >
            Track order <ArrowRight size={14} aria-hidden="true" />
          </Link>
          <Link
            className="order-history-primary-action"
            to={`/checkout/confirmation/${encodeURIComponent(order.id)}`}
          >
            View details <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </footer>
    </article>
  );
}

export default function OrderHistoryPage() {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [entries, setEntries] = useState<OrderHistoryEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const [loadedRequest, setLoadedRequest] = useState<string | null>(null);
  const userId = user?.id;
  const requestKey = `${page}:${retryVersion}`;
  const isLoading = loadedRequest !== requestKey;
  const pageCount = Math.max(1, Math.ceil(totalCount / ORDER_HISTORY_PAGE_SIZE));

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      navigate(AUTH_ROUTES.login, {
        replace: true,
        state: getAuthRedirectState(location),
      });
    }
  }, [isAuthLoading, isAuthenticated, location, navigate]);

  useEffect(() => {
    let active = true;
    if (!userId) return;

    void (async () => {
      try {
        const client = await getSupabaseClient();
        const result = await loadOrderHistory(client, userId, page);
        if (!active) return;
        setEntries(result.entries);
        setTotalCount(result.totalCount);
        setError(null);
      } catch (loadError) {
        if (!active) return;
        setError(
          loadError instanceof Error ? loadError.message : 'Your orders could not be loaded.',
        );
      } finally {
        if (active) setLoadedRequest(requestKey);
      }
    })();

    return () => {
      active = false;
    };
  }, [page, requestKey, userId]);

  useEffect(() => {
    if (!isLoading && !error) headingRef.current?.focus();
  }, [error, isLoading]);

  if (isAuthLoading || !isAuthenticated || isLoading) {
    return (
      <main className="order-history-page" id="main-content" aria-busy="true">
        <div
          className="order-history-skeleton-heading"
          role="status"
          aria-label="Loading your orders"
        >
          <span />
          <span />
        </div>
        <div className="order-history-skeleton-grid">
          <span />
          <span />
          <span />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="order-history-page" id="main-content">
        <section className="order-history-error" role="alert">
          <span>
            <ClipboardList size={23} aria-hidden="true" />
          </span>
          <p className="checkout-eyebrow">MY ORDERS</p>
          <h1>Your order history is taking a moment.</h1>
          <p>{error}</p>
          <button type="button" onClick={() => setRetryVersion((version) => version + 1)}>
            <RefreshCw size={15} aria-hidden="true" /> Try again
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="order-history-page" id="main-content">
      <motion.header
        className="order-history-heading"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32 }}
      >
        <p className="checkout-eyebrow">
          <ClipboardList size={14} aria-hidden="true" /> YOUR AL SERA ACCOUNT
        </p>
        <h1 ref={headingRef} tabIndex={-1}>
          Your orders.
        </h1>
        <p>Every thoughtful find, gathered in one place.</p>
      </motion.header>

      {entries.length === 0 ? (
        <section className="order-history-empty">
          <span>
            <Package size={23} aria-hidden="true" />
          </span>
          <p className="checkout-eyebrow">A FRESH BEGINNING</p>
          <h2>No orders just yet.</h2>
          <p>When you place an order, its details and tracking link will be waiting here.</p>
          <Link className="order-history-primary-action" to="/shop">
            Explore the collection <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>
      ) : (
        <>
          <div className="order-history-list-heading">
            <h2>{totalCount === 1 ? 'One order' : `${totalCount} orders`}</h2>
            <span>Most recent first</span>
          </div>
          <div className="order-history-list">
            {entries.map((entry, index) => (
              <motion.div
                key={entry.order.id}
                initial={reduceMotion ? false : { opacity: 0, y: 9 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduceMotion ? { duration: 0 } : { delay: index * 0.045 }}
              >
                <OrderCard entry={entry} />
              </motion.div>
            ))}
          </div>
          {pageCount > 1 && (
            <nav className="order-history-pagination" aria-label="Order history pages">
              <button
                type="button"
                disabled={page <= 1}
                aria-label="Previous page"
                onClick={() => setPage((current) => current - 1)}
              >
                <ChevronLeft size={17} aria-hidden="true" />
              </button>
              <span>
                Page {page} of {pageCount}
              </span>
              <button
                type="button"
                disabled={page >= pageCount}
                aria-label="Next page"
                onClick={() => setPage((current) => current + 1)}
              >
                <ChevronRight size={17} aria-hidden="true" />
              </button>
            </nav>
          )}
        </>
      )}
    </main>
  );
}
