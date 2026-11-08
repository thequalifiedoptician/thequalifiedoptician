import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Minus, PackageCheck, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import EmptyState from '@/components/ui/EmptyState';
import { AUTH_ROUTES } from '@/features/auth/constants/auth';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getAuthRedirectState } from '@/features/auth/utils/authNavigation';
import CartSummary from './CartSummary';
import { useCart } from './useCart';
import {
  formatCartPrice,
  getCartItemPrice,
  getCartLineTotal,
  MAX_CART_QUANTITY,
} from './cartUtils';
import type { CartDisplayItem } from './cartTypes';

function CartSkeleton() {
  return (
    <div
      className="cart-layout cart-layout-skeleton"
      aria-label="Loading your cart"
      aria-busy="true"
    >
      <div className="cart-items-list">
        {[0, 1, 2].map((item) => (
          <div className="cart-skeleton-row" key={item}>
            <span />
            <div>
              <span />
              <span />
              <span />
            </div>
          </div>
        ))}
      </div>
      <div className="cart-skeleton-summary">
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function CartLine({ item, index }: { item: CartDisplayItem; index: number }) {
  const { updateQuantity, removeItem, operationErrors, isItemPending } = useCart();
  const reduceMotion = useReducedMotion();
  const operationError = operationErrors.get(item.id);
  const pending = isItemPending(item.id);
  const product = item.product;
  const itemName = product?.name ?? 'Unavailable product';
  const variantLabel = item.variant
    ? [item.variant.color, item.variant.size, item.variant.material, `SKU ${item.variant.sku}`]
        .filter(Boolean)
        .join(' · ')
    : item.variant_id
      ? 'Option no longer available'
      : null;

  return (
    <motion.li
      className={`cart-line${item.inStock ? '' : ' is-unavailable'}`}
      aria-busy={pending}
      layout={!reduceMotion}
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, x: -18, height: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.24, delay: reduceMotion ? 0 : index * 0.04 }}
    >
      <div className="cart-line-image">
        {product?.imageUrl ? (
          <img src={product.imageUrl} alt={product.imageAlt} loading="lazy" />
        ) : (
          <ShoppingBag aria-hidden="true" />
        )}
      </div>
      <div className="cart-line-details">
        <div className="cart-line-copy">
          <div>
            <p className="cart-line-brand">{product?.brandName ?? 'AlSera collection'}</p>
            <h2>
              {product ? (
                <Link to={`/shop/${encodeURIComponent(product.slug)}`}>{product.name}</Link>
              ) : (
                itemName
              )}
            </h2>
            {variantLabel && <p className="cart-line-variant">{variantLabel}</p>}
            <p className={`cart-line-stock${item.inStock ? '' : ' is-unavailable'}`} role="status">
              <span aria-hidden="true" />
              {item.inStock ? 'Available' : 'Currently unavailable'}
            </p>
          </div>
          <div className="cart-line-prices">
            <span>{item.inStock ? formatCartPrice(getCartItemPrice(item)) : '—'}</span>
            {item.inStock && <small>each</small>}
          </div>
        </div>
        {!item.inStock && (
          <p className="cart-unavailable-note">
            This item cannot be included in your order. You can remove it from your bag.
          </p>
        )}
        <div className="cart-line-actions">
          {item.inStock && (
            <div
              className="cart-quantity-control"
              role="group"
              aria-label={`Quantity for ${itemName}`}
            >
              <button
                type="button"
                aria-label={`Decrease ${itemName} quantity`}
                disabled={pending || item.quantity <= 1}
                onClick={() => void updateQuantity(item.id, item.quantity - 1)}
              >
                <Minus aria-hidden="true" />
              </button>
              <output aria-label={`${item.quantity} items`}>{item.quantity}</output>
              <button
                type="button"
                aria-label={`Increase ${itemName} quantity`}
                disabled={pending || item.quantity >= MAX_CART_QUANTITY}
                onClick={() => void updateQuantity(item.id, item.quantity + 1)}
              >
                <Plus aria-hidden="true" />
              </button>
            </div>
          )}
          <button
            className="cart-remove-button"
            type="button"
            disabled={pending}
            aria-busy={pending}
            aria-label={`Remove ${itemName} from cart`}
            onClick={() => void removeItem(item.id)}
          >
            <Trash2 aria-hidden="true" />
            Remove
          </button>
          {item.inStock && (
            <strong className="cart-line-total">{formatCartPrice(getCartLineTotal(item))}</strong>
          )}
        </div>
        {operationError && (
          <p className="cart-line-error" role="alert">
            {operationError}
          </p>
        )}
      </div>
    </motion.li>
  );
}

export default function CartPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { items, isLoading, error, refreshCart } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      navigate(AUTH_ROUTES.login, { replace: true, state: getAuthRedirectState(location) });
    }
  }, [isAuthLoading, isAuthenticated, location, navigate]);

  if (isAuthLoading || !isAuthenticated || isLoading) {
    return (
      <section className="cart-page" aria-label="Shopping cart">
        <CartSkeleton />
      </section>
    );
  }

  return (
    <motion.section
      className="cart-page"
      aria-labelledby="cart-page-title"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.32 }}
    >
      <header className="cart-page-header">
        <div>
          <p className="cart-eyebrow">
            <PackageCheck aria-hidden="true" /> Thoughtfully chosen
          </p>
          <h1 id="cart-page-title">Your bag</h1>
          <p>
            {error
              ? 'Your cart could not be loaded.'
              : `${items.reduce((count, item) => count + item.quantity, 0)} pieces ready for a closer look.`}
          </p>
        </div>
        <Link to="/shop">Continue browsing</Link>
      </header>

      {error && (
        <div className="cart-load-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={refreshCart}>
            Try again
          </button>
        </div>
      )}

      {items.length === 0 && !error ? (
        <div className="cart-empty-wrap">
          <EmptyState
            type="cart"
            actionLabel="Explore the collection"
            onAction={() => navigate('/shop')}
          />
        </div>
      ) : items.length > 0 ? (
        <div className="cart-layout">
          <section aria-label="Items in your bag">
            <ul className="cart-items-list">
              <AnimatePresence initial={false}>
                {items.map((item, index) => (
                  <CartLine item={item} index={index} key={item.id} />
                ))}
              </AnimatePresence>
            </ul>
            {items.some((item) => !item.inStock) && (
              <p className="cart-unavailable-summary" role="status">
                Unavailable items are excluded from your estimated total.
              </p>
            )}
          </section>
          <CartSummary items={items} />
        </div>
      ) : null}
    </motion.section>
  );
}
