import { motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, ArrowLeft, ArrowRight, RefreshCw, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { getSupabaseClient } from '@/lib/supabase';
import ProductDiscoverySections from './ProductDiscoverySections';
import ProductImageGallery from './ProductImageGallery';
import ProductSpecifications from './ProductSpecifications';
import ProductVariantSelector from './ProductVariantSelector';
import PurchaseInformationPanel from './PurchaseInformationPanel';
import { loadProductDetails, type ProductDetails } from './productDetailsService';
import { useRecentlyViewed } from './useRecentlyViewed';
import './product-details.css';

type PageState =
  | { requestKey: string; status: 'loading' }
  | { requestKey: string; status: 'error'; message: string }
  | { requestKey: string; status: 'not-found' }
  | { requestKey: string; status: 'ready'; details: ProductDetails };

function ProductDetailsSkeleton() {
  return (
    <>
      <div className="product-details-skeleton" role="status" aria-label="Loading product details">
        <div className="product-details-skeleton-gallery">
          <span className="skeleton-block" />
          <div>
            <span className="skeleton-block" />
            <span className="skeleton-block" />
            <span className="skeleton-block" />
          </div>
        </div>
        <div className="product-details-skeleton-copy">
          <span className="skeleton-block" />
          <span className="skeleton-block" />
          <span className="skeleton-block" />
          <span className="skeleton-block" />
          <span className="skeleton-block" />
          <span className="product-details-variant-skeleton skeleton-block" />
          <span className="visually-hidden">Loading product details and options</span>
        </div>
      </div>
      <section className="product-details-related-skeleton" aria-label="Loading related products">
        <span className="skeleton-block" />
        <div className="shop-loading">
          <LoadingSkeleton variant="product" count={4} />
        </div>
        <span className="visually-hidden">Loading related products</span>
      </section>
    </>
  );
}

function ProductDetailsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="product-details-status" role="alert" aria-labelledby="product-error-title">
      <span className="product-details-status-icon product-details-status-icon--error">
        <AlertCircle aria-hidden="true" />
      </span>
      <h1 id="product-error-title">This product is taking a moment.</h1>
      <p>{message}</p>
      <button type="button" onClick={onRetry}>
        <RefreshCw size={15} aria-hidden="true" /> Try again
      </button>
      <Link to="/shop">
        <ArrowLeft size={15} aria-hidden="true" /> Back to shop
      </Link>
    </section>
  );
}

function ProductNotFound() {
  return (
    <section className="product-details-status" aria-labelledby="product-not-found-title">
      <span className="product-details-status-icon">
        <AlertCircle aria-hidden="true" />
      </span>
      <h1 id="product-not-found-title">This piece is no longer available.</h1>
      <p>It may have moved or is not part of the current collection.</p>
      <Link to="/shop">
        Explore the collection <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </section>
  );
}

export default function ProductDetailsPage() {
  const { slug } = useParams<{ slug: string }>();
  const reduceMotion = useReducedMotion();
  const [retryCount, setRetryCount] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [pageState, setPageState] = useState<PageState>({
    requestKey: '',
    status: 'loading',
  });
  const { trackProduct } = useRecentlyViewed();
  const requestKey = `${slug ?? ''}:${retryCount}`;

  useEffect(() => {
    let isCurrent = true;

    if (!slug) {
      return () => {
        isCurrent = false;
      };
    }

    void (async () => {
      try {
        const client = await getSupabaseClient();
        const details = await loadProductDetails(client, slug);
        if (isCurrent) {
          setPageState(
            details
              ? { requestKey, status: 'ready', details }
              : { requestKey, status: 'not-found' },
          );
        }
      } catch (error) {
        if (isCurrent) {
          setPageState({
            requestKey,
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
      isCurrent = false;
    };
  }, [requestKey, slug]);

  useEffect(() => {
    if (pageState.status !== 'ready') {
      return;
    }

    const { product, images, categoryName, brandName, inStock, variants } = pageState.details;
    const primaryImage = images[0];
    trackProduct({
      ...product,
      imageUrl: primaryImage?.image_url ?? product.thumbnail_url,
      imageAlt: primaryImage?.alt_text || product.name,
      categoryName,
      brandName,
      inStock,
      hasVariants: variants.length > 0,
    });
  }, [pageState, trackProduct]);

  if (!slug || pageState.requestKey !== requestKey || pageState.status === 'loading') {
    return (
      <div className="product-details-page">
        {slug ? <ProductDetailsSkeleton /> : <ProductNotFound />}
      </div>
    );
  }

  if (pageState.status === 'error') {
    return (
      <div className="product-details-page">
        <ProductDetailsError
          message={pageState.message}
          onRetry={() => setRetryCount((count) => count + 1)}
        />
      </div>
    );
  }

  if (pageState.status === 'not-found') {
    return (
      <div className="product-details-page">
        <ProductNotFound />
      </div>
    );
  }

  const { product, categoryName, brandName, inStock, variants } = pageState.details;
  const selectedVariant =
    variants.find((variant) => variant.id === selectedVariantId) ??
    variants.find((variant) => variant.inStock) ??
    variants[0] ??
    null;
  const selectedInStock = selectedVariant ? selectedVariant.inStock : inStock;
  const specifications = [
    { label: 'SKU', value: selectedVariant?.sku ?? product.sku },
    { label: 'Brand', value: brandName },
    { label: 'Category', value: categoryName },
    { label: 'Color', value: selectedVariant?.color ?? null },
    { label: 'Size', value: selectedVariant?.size ?? null },
    { label: 'Material', value: selectedVariant?.material ?? null },
  ];

  return (
    <motion.article
      className="product-details-page"
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.38, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link className="product-details-back" to="/shop">
        <ArrowLeft size={15} aria-hidden="true" /> Back to collection
      </Link>

      <div className="product-details-layout">
        <ProductImageGallery key={product.id} product={product} images={pageState.details.images} />

        <section className="product-details-information" aria-labelledby="product-title">
          <p className="product-details-eyebrow">
            {brandName ?? 'AlSera collection'}
            {categoryName && <span aria-hidden="true"> / </span>}
            {categoryName}
          </p>
          <h1 id="product-title">{product.name}</h1>

          <div className="product-details-rating" aria-label="No customer ratings yet">
            <span aria-hidden="true">
              {Array.from({ length: 5 }, (_, index) => (
                <Star key={index} />
              ))}
            </span>
            <span>No reviews yet</span>
          </div>

          <ProductVariantSelector
            variants={variants}
            selectedVariant={selectedVariant}
            onSelect={setSelectedVariantId}
          />
          <PurchaseInformationPanel
            key={selectedVariant?.id ?? product.id}
            product={product}
            variant={selectedVariant}
            inStock={selectedInStock}
          />

          {product.short_description && (
            <p className="product-details-short-description">{product.short_description}</p>
          )}
        </section>
      </div>

      <div className="product-details-lower">
        {(product.description || product.short_description) && (
          <section className="product-details-section" aria-labelledby="product-description-title">
            <p className="product-details-section-eyebrow">A CLOSER LOOK</p>
            <h2 id="product-description-title">About this piece</h2>
            {product.description ? (
              <p className="product-details-description">{product.description}</p>
            ) : (
              <p className="product-details-description">{product.short_description}</p>
            )}
          </section>
        )}

        <section className="product-details-section" aria-labelledby="product-specifications-title">
          <p className="product-details-section-eyebrow">THE DETAILS</p>
          <h2 id="product-specifications-title">Specifications</h2>
          <ProductSpecifications specifications={specifications} />
        </section>
      </div>

      <ProductDiscoverySections product={product} currentProductId={product.id} />
    </motion.article>
  );
}
