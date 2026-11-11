import { motion, useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  LoaderCircle,
  ShoppingBag,
  Star,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { HomepageCard } from '@/features/admin/homepage/homepageContent';
import { AUTH_ROUTES } from '@/features/auth/constants/auth';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getAuthRedirectState } from '@/features/auth/utils/authNavigation';
import CartAddButton from '@/features/cart/CartAddButton';
import { useCart } from '@/features/cart/useCart';
import WishlistButton from '@/features/wishlist/WishlistButton';
import { getSupabaseClient } from '@/lib/supabase';
import {
  loadProductDetails,
  type AvailableProductVariant,
  type ProductDetails,
} from './product-details/productDetailsService';
import './homepage-product-quick-view.css';

type Props = {
  card: HomepageCard;
  slug: string | null;
  onClose: () => void;
};

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; details: ProductDetails }
  | { status: 'not-found' }
  | { status: 'error'; message: string };

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
}

export default function HomepageProductQuickView({ card, slug, onClose }: Props) {
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>(
    slug ? { status: 'loading' } : { status: 'not-found' },
  );
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const { addToCart, isPending } = useCart();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!slug) {
      return;
    }

    let active = true;
    void (async () => {
      try {
        const client = await getSupabaseClient();
        const details = await loadProductDetails(client, slug);
        if (active) {
          setLoadState(details ? { status: 'ready', details } : { status: 'not-found' });
          setSelectedImage(0);
          setSelectedVariantId(null);
        }
      } catch (error) {
        if (active) {
          setLoadState({
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'We could not load this product. Please try again.',
          });
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [loadAttempt, slug]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!dialogRef.current.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const details = loadState.status === 'ready' ? loadState.details : null;
  const { product, images, variants, categoryName, inStock } = details ?? {
    product: null,
    images: [],
    variants: [],
    categoryName: null,
    inStock: false,
  };
  const variant: AvailableProductVariant | null =
    variants.find((item) => item.id === selectedVariantId) ??
    variants.find((item) => item.inStock) ??
    variants[0] ??
    null;
  const available = variant ? variant.inStock : inStock;
  const price = product ? (variant?.price ?? product.price) : null;
  const comparePrice =
    product?.compare_price !== null &&
    product?.compare_price !== undefined &&
    price !== null &&
    product.compare_price > price
      ? product.compare_price
      : null;
  const gallery = product
    ? images.length > 0
      ? images.map((image) => ({
          src: image.image_url,
          alt: image.alt_text || product.name,
        }))
      : product.thumbnail_url
        ? [{ src: product.thumbnail_url, alt: product.name }]
        : []
    : card.imageUrl
      ? [{ src: card.imageUrl, alt: card.imageAlt || card.title }]
      : [];
  const image = gallery[selectedImage] ?? gallery[0];
  const productName = product?.name ?? card.title;
  const authReturnTo = slug ? `/shop/${encodeURIComponent(slug)}` : '/shop';
  const selectedSku = variant?.sku ?? product?.sku;
  const activeCartPending = product ? isPending(product.id, variant?.id ?? null) : false;

  const handleBuyNow = async () => {
    if (!product || !available || activeCartPending || buying) {
      return;
    }
    if (!isAuthenticated) {
      navigate(AUTH_ROUTES.login, {
        state: getAuthRedirectState(location, authReturnTo),
      });
      return;
    }
    setBuyError(null);
    setBuying(true);
    try {
      const added = await addToCart(product.id, variant?.id ?? null);
      if (added) {
        onClose();
        navigate('/checkout');
      } else {
        setBuyError('This item could not be added to your bag. Please try again.');
      }
    } finally {
      setBuying(false);
    }
  };

  return createPortal(
    <motion.div
      className="homepage-quick-view-backdrop"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.18 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.section
        ref={dialogRef}
        className="homepage-quick-view-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Quick View: ${card.title}`}
        tabIndex={-1}
        initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: 12, scale: 0.985 }}
        transition={{ duration: reduceMotion ? 0 : 0.22 }}
      >
        <button
          ref={closeButtonRef}
          className="homepage-quick-view-close"
          type="button"
          aria-label="Close Quick View"
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </button>

        <div className="homepage-quick-view-layout">
          <div className="homepage-quick-view-gallery">
            <div className="homepage-quick-view-main-image">
              {image ? (
                <img src={image.src} alt={image.alt} decoding="async" />
              ) : (
                <span className="homepage-quick-view-image-placeholder">
                  <Eye aria-hidden="true" />
                  Product image unavailable
                </span>
              )}
              {gallery.length > 1 && (
                <>
                  <button
                    className="homepage-quick-view-gallery-arrow is-previous"
                    type="button"
                    aria-label="Show previous product image"
                    onClick={() =>
                      setSelectedImage((index) => (index - 1 + gallery.length) % gallery.length)
                    }
                  >
                    <ChevronLeft aria-hidden="true" />
                  </button>
                  <button
                    className="homepage-quick-view-gallery-arrow is-next"
                    type="button"
                    aria-label="Show next product image"
                    onClick={() => setSelectedImage((index) => (index + 1) % gallery.length)}
                  >
                    <ChevronRight aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="homepage-quick-view-thumbnails" aria-label="Product gallery">
                {gallery.map((item, index) => (
                  <button
                    key={`${item.src}-${index}`}
                    type="button"
                    aria-label={`Show product image ${index + 1}`}
                    aria-pressed={selectedImage === index}
                    onClick={() => setSelectedImage(index)}
                  >
                    <img src={item.src} alt="" loading="lazy" decoding="async" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="homepage-quick-view-information">
            {loadState.status === 'loading' ? (
              <div className="homepage-quick-view-status" role="status">
                <LoaderCircle className="homepage-quick-view-spinner" aria-hidden="true" />
                Loading product details
              </div>
            ) : loadState.status === 'error' ? (
              <div className="homepage-quick-view-status is-error" role="alert">
                <AlertCircle aria-hidden="true" />
                <span>{loadState.message}</span>
                <button
                  type="button"
                  onClick={() => {
                    setLoadState({ status: 'loading' });
                    setLoadAttempt((count) => count + 1);
                  }}
                >
                  Try again
                </button>
              </div>
            ) : (
              <>
                <p className="homepage-quick-view-eyebrow">
                  {categoryName || card.eyebrow || 'AlSera collection'}
                </p>
                <h2 id="homepage-quick-view-title">{productName}</h2>
                <p id="homepage-quick-view-description" className="homepage-quick-view-description">
                  {product?.short_description ||
                    card.description ||
                    'A considered piece for everyday living.'}
                </p>
                <div className="homepage-quick-view-rating" aria-label="No customer reviews yet">
                  <span aria-hidden="true">
                    <Star />
                  </span>
                  <span>No reviews yet</span>
                </div>

                <div className="homepage-quick-view-price">
                  {price !== null ? formatPrice(price) : card.price || 'See price in shop'}
                  {comparePrice !== null && price !== null && (
                    <>
                      <del>{formatPrice(comparePrice)}</del>
                      <span>{Math.round(((comparePrice - price) / comparePrice) * 100)}% off</span>
                    </>
                  )}
                </div>
                {selectedSku && <p className="homepage-quick-view-sku">SKU: {selectedSku}</p>}

                {variants.length > 0 && (
                  <label className="homepage-quick-view-variant">
                    <span>Choose an option</span>
                    <select
                      value={variant?.id ?? ''}
                      onChange={(event) => setSelectedVariantId(event.target.value)}
                    >
                      {variants.map((item) => (
                        <option key={item.id} value={item.id} disabled={!item.inStock}>
                          {[item.color, item.size, item.material].filter(Boolean).join(' · ') ||
                            item.sku}
                          {!item.inStock ? ' · Sold out' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <p
                  className={`homepage-quick-view-stock${available ? '' : ' is-unavailable'}`}
                  role="status"
                >
                  <span aria-hidden="true" />
                  {product
                    ? available
                      ? 'In stock'
                      : 'Currently sold out'
                    : 'Availability shown on product page'}
                </p>

                {product ? (
                  <div className="homepage-quick-view-actions">
                    <CartAddButton
                      productId={product.id}
                      productName={product.name}
                      variantId={variant?.id ?? null}
                      disabled={!available || isAuthLoading}
                      className="homepage-quick-view-add"
                      label="Add to Cart"
                      authReturnTo={authReturnTo}
                    />
                    <button
                      className="homepage-quick-view-buy"
                      type="button"
                      disabled={!available || isAuthLoading || buying || activeCartPending}
                      onClick={() => void handleBuyNow()}
                    >
                      {buying ? (
                        <LoaderCircle className="homepage-quick-view-spinner" aria-hidden="true" />
                      ) : (
                        <ShoppingBag aria-hidden="true" />
                      )}
                      {buying ? 'Adding to bag' : 'Buy Now'}
                    </button>
                  </div>
                ) : (
                  <p className="homepage-quick-view-unavailable">
                    This display item is not connected to an active catalog product.
                  </p>
                )}
                {product && (
                  <WishlistButton
                    productId={product.id}
                    productName={product.name}
                    className="homepage-quick-view-wishlist"
                    authReturnTo={authReturnTo}
                  />
                )}
                {buyError && (
                  <p className="homepage-quick-view-error" role="alert">
                    {buyError}
                  </p>
                )}
                <Link
                  className="homepage-quick-view-full-link"
                  to={slug ? `/shop/${encodeURIComponent(slug)}` : '/shop'}
                  onClick={onClose}
                >
                  View Full Product <ChevronRight aria-hidden="true" />
                </Link>
              </>
            )}
          </div>
        </div>
      </motion.section>
    </motion.div>,
    document.body,
  );
}
