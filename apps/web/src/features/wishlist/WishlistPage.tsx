import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, ArrowRight, Heart, RefreshCw, ShoppingBag, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import EmptyState from '@/components/ui/EmptyState';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getAuthRedirectState } from '@/features/auth/utils/authNavigation';
import { loadShopCatalog, type ShopCatalog } from '@/features/catalog/shop/productListingService';
import { useWishlist } from './useWishlist';
import './wishlist.css';

type CatalogState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; catalog: ShopCatalog };

function WishlistSkeleton() {
  return (
    <div className="wishlist-skeleton-list" role="status" aria-label="Loading wishlist">
      {Array.from({ length: 3 }, (_, index) => (
        <div className="wishlist-skeleton-item" key={index}>
          <span className="wishlist-skeleton-image" />
          <span className="wishlist-skeleton-copy">
            <i />
            <i />
            <i />
          </span>
          <span className="wishlist-skeleton-action" />
        </div>
      ))}
      <span className="visually-hidden">Loading your saved pieces</span>
    </div>
  );
}

function WishlistError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="wishlist-error" role="alert">
      <span>
        <AlertCircle size={22} aria-hidden="true" />
      </span>
      <h2>We couldn’t load your saved pieces.</h2>
      <p>{message}</p>
      <button type="button" onClick={onRetry}>
        <RefreshCw size={15} aria-hidden="true" />
        Try again
      </button>
    </section>
  );
}

export default function WishlistPage() {
  const reduceMotion = useReducedMotion();
  const location = useLocation();
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const userId = user?.id ?? null;
  const {
    error: wishlistError,
    isLoading: isWishlistLoading,
    isPending,
    operationErrors,
    productIds,
    refreshWishlist,
    removeFromWishlist,
  } = useWishlist();
  const [catalogState, setCatalogState] = useState<CatalogState>({ status: 'loading' });
  const catalogLoadedKey = useRef<string | null>(null);
  const catalogLoadingKey = useRef<string | null>(null);
  const requestedProductIds = useMemo(() => [...productIds].sort(), [productIds]);
  const productIdsKey = requestedProductIds.join(',');
  const requestKey = `${userId ?? ''}:${productIdsKey}`;

  const loadProducts = useCallback(async () => {
    if (!isAuthenticated || isWishlistLoading || wishlistError) {
      return;
    }

    if (productIds.size === 0) {
      catalogLoadedKey.current = requestKey;
      catalogLoadingKey.current = null;
      setCatalogState({ status: 'ready', catalog: { products: [], categories: [], brands: [] } });
      return;
    }
    if (catalogLoadedKey.current === requestKey || catalogLoadingKey.current === requestKey) {
      return;
    }

    catalogLoadingKey.current = requestKey;
    setCatalogState({ status: 'loading' });
    try {
      const client = await getSupabaseClient();
      const catalog = await loadShopCatalog(client, requestedProductIds);
      if (catalogLoadingKey.current === requestKey) {
        catalogLoadingKey.current = null;
        catalogLoadedKey.current = requestKey;
        setCatalogState({ status: 'ready', catalog });
      }
    } catch (loadError) {
      if (catalogLoadingKey.current === requestKey) {
        catalogLoadingKey.current = null;
        setCatalogState({
          status: 'error',
          message:
            loadError instanceof Error
              ? loadError.message
              : 'We could not load your saved pieces. Please try again.',
        });
      }
    }
  }, [
    isAuthenticated,
    isWishlistLoading,
    productIds.size,
    requestKey,
    requestedProductIds,
    wishlistError,
  ]);

  useEffect(() => {
    void Promise.resolve().then(loadProducts);
  }, [loadProducts]);

  const productsById = useMemo(
    () =>
      new Map(
        (catalogState.status === 'ready' ? catalogState.catalog.products : []).map((product) => [
          product.id,
          product,
        ]),
      ),
    [catalogState],
  );
  const savedProducts = [...productIds]
    .map((productId) => productsById.get(productId))
    .filter((product) => product !== undefined);
  const unavailableProductIds = [...productIds].filter((productId) => !productsById.has(productId));

  if (isAuthLoading) {
    return (
      <div className="wishlist-page">
        <WishlistSkeleton />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={getAuthRedirectState(location)} replace />;
  }

  const retryLoading = () => {
    if (wishlistError) {
      refreshWishlist();
      return;
    }
    void loadProducts();
  };

  return (
    <motion.div
      className="wishlist-page"
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.34 }}
    >
      <header className="wishlist-heading">
        <div className="wishlist-heading-copy">
          <p className="wishlist-eyebrow">
            <Heart size={14} aria-hidden="true" /> THE PIECES YOU LOVE
          </p>
          <h1>Your wishlist</h1>
          <p>A little collection of things worth coming back to.</p>
        </div>
        <span className="wishlist-count" aria-live="polite">
          <Heart size={15} aria-hidden="true" />
          {productIds.size} {productIds.size === 1 ? 'saved piece' : 'saved pieces'}
        </span>
      </header>

      {wishlistError ? (
        <WishlistError message={wishlistError} onRetry={retryLoading} />
      ) : isWishlistLoading || catalogState.status === 'loading' ? (
        <WishlistSkeleton />
      ) : catalogState.status === 'error' ? (
        <WishlistError message={catalogState.message} onRetry={retryLoading} />
      ) : productIds.size === 0 ? (
        <motion.div
          className="wishlist-empty"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.34 }}
        >
          <EmptyState type="wishlist" />
          <Link className="wishlist-shop-link" to="/shop">
            Shop the collection <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </motion.div>
      ) : (
        <div className="wishlist-content">
          <div className="wishlist-list" aria-label="Saved products">
            <AnimatePresence initial={false}>
              {savedProducts.map((product, index) => (
                <motion.article
                  className="wishlist-item"
                  key={product.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, x: -12, height: 0 }}
                  transition={{
                    duration: reduceMotion ? 0 : 0.24,
                    delay: reduceMotion ? 0 : Math.min(index, 5) * 0.035,
                  }}
                  layout
                >
                  <Link
                    className="wishlist-item-image"
                    to={`/shop/${encodeURIComponent(product.slug)}`}
                    aria-label={`View ${product.name} details`}
                  >
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.imageAlt} loading="lazy" />
                    ) : (
                      <ShoppingBag aria-hidden="true" />
                    )}
                  </Link>
                  <div className="wishlist-item-info">
                    <p className="wishlist-item-brand">
                      {product.brandName ?? 'AlSera collection'}
                    </p>
                    <h2>
                      <Link to={`/shop/${encodeURIComponent(product.slug)}`}>{product.name}</Link>
                    </h2>
                    <p className={`wishlist-item-stock${product.inStock ? '' : ' is-sold-out'}`}>
                      <span aria-hidden="true" />
                      {product.inStock ? 'In stock' : 'Currently sold out'}
                    </p>
                    <span className="wishlist-item-price">${product.price.toFixed(2)}</span>
                    {operationErrors.get(product.id) && (
                      <p className="wishlist-item-error" role="alert">
                        {operationErrors.get(product.id)}
                      </p>
                    )}
                  </div>
                  <button
                    className="wishlist-remove"
                    type="button"
                    aria-label={`Remove ${product.name} from wishlist`}
                    aria-busy={isPending(product.id)}
                    disabled={isPending(product.id)}
                    onClick={() => void removeFromWishlist(product.id)}
                  >
                    <Trash2 size={17} aria-hidden="true" />
                    <span>{isPending(product.id) ? 'Removing…' : 'Remove'}</span>
                  </button>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>

          {unavailableProductIds.length > 0 && (
            <section
              className="wishlist-unavailable"
              aria-labelledby="wishlist-unavailable-heading"
            >
              <h2 id="wishlist-unavailable-heading">No longer in the collection</h2>
              <p>
                {unavailableProductIds.length}{' '}
                {unavailableProductIds.length === 1 ? 'saved item is' : 'saved items are'} no longer
                available to view.
              </p>
              {unavailableProductIds.map((productId) => (
                <div className="wishlist-unavailable-item" key={productId}>
                  <button
                    type="button"
                    disabled={isPending(productId)}
                    onClick={() => void removeFromWishlist(productId)}
                  >
                    {isPending(productId) ? 'Removing…' : 'Remove unavailable item'}
                  </button>
                  {operationErrors.get(productId) && (
                    <p role="alert">{operationErrors.get(productId)}</p>
                  )}
                </div>
              ))}
            </section>
          )}

          <Link className="wishlist-continue-link" to="/shop">
            <ArrowRight size={15} aria-hidden="true" />
            Continue shopping
          </Link>
        </div>
      )}
    </motion.div>
  );
}
