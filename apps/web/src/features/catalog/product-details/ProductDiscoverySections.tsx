import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { getSupabaseClient } from '@/lib/supabase';
import ShopProductCard from '@/features/catalog/shop/ShopProductCard';
import type { ShopProduct } from '@/features/catalog/shop/productListingService';
import type { Database } from '@/features/auth/types/database';
import { loadRelatedProducts } from './productDetailsService';
import { useRecentlyViewed } from './useRecentlyViewed';
import '@/features/catalog/shop/shop.css';

type ProductRow = Database['public']['Tables']['products']['Row'];

type ProductDiscoverySectionsProps = {
  product: ProductRow;
  currentProductId: string;
};

export default function ProductDiscoverySections({
  product,
  currentProductId,
}: ProductDiscoverySectionsProps) {
  const reduceMotion = useReducedMotion();
  const [relatedState, setRelatedState] = useState<
    | { requestKey: string; status: 'loading' }
    | { requestKey: string; status: 'error'; message: string }
    | { requestKey: string; status: 'ready'; products: ShopProduct[] }
  >({ requestKey: '', status: 'loading' });
  const { products: recentlyViewed } = useRecentlyViewed();
  const requestKey = `${product.id}:${product.category_id ?? ''}:${product.brand_id ?? ''}`;
  const previouslyViewed = recentlyViewed.filter((item) => item.id !== currentProductId);

  useEffect(() => {
    let isCurrent = true;
    void (async () => {
      try {
        const client = await getSupabaseClient();
        const related = await loadRelatedProducts(client, product);
        if (isCurrent) {
          setRelatedState({ requestKey, status: 'ready', products: related });
        }
      } catch (error) {
        if (isCurrent) {
          setRelatedState({
            requestKey,
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Related pieces are temporarily unavailable.',
          });
        }
      }
    })();

    return () => {
      isCurrent = false;
    };
  }, [product, requestKey]);

  const showRelatedLoading =
    relatedState.requestKey !== requestKey || relatedState.status === 'loading';

  return (
    <div className="product-discovery-sections">
      <section
        className="product-discovery-section"
        aria-labelledby="related-products-heading"
        aria-busy={showRelatedLoading}
      >
        <div className="product-discovery-heading">
          <p className="product-details-section-eyebrow">A LITTLE MORE TO EXPLORE</p>
          <h2 id="related-products-heading">Related pieces</h2>
        </div>
        {showRelatedLoading ? (
          <div className="shop-loading product-discovery-loading">
            <LoadingSkeleton variant="product" count={4} />
          </div>
        ) : relatedState.status === 'error' ? (
          <p className="product-discovery-message" role="status">
            {relatedState.message}
          </p>
        ) : relatedState.products.length > 0 ? (
          <div className="shop-product-grid">
            {relatedState.products.map((relatedProduct, index) => (
              <ShopProductCard key={relatedProduct.id} product={relatedProduct} index={index} />
            ))}
          </div>
        ) : (
          <p className="product-discovery-message">There are no related pieces to show just yet.</p>
        )}
      </section>

      {previouslyViewed.length > 0 && (
        <motion.section
          className="product-discovery-section"
          aria-labelledby="recently-viewed-heading"
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.28 }}
        >
          <div className="product-discovery-heading">
            <p className="product-details-section-eyebrow">PICK UP WHERE YOU LEFT OFF</p>
            <h2 id="recently-viewed-heading">Recently viewed</h2>
          </div>
          <div className="shop-product-grid">
            {previouslyViewed.map((viewedProduct, index) => (
              <ShopProductCard key={viewedProduct.id} product={viewedProduct} index={index} />
            ))}
          </div>
        </motion.section>
      )}
    </div>
  );
}
