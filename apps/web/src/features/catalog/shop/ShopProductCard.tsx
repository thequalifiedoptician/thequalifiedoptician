import { motion, useReducedMotion } from 'framer-motion';
import { Eye, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ShopProduct } from './productListingService';
import CartAddButton from '@/features/cart/CartAddButton';
import WishlistButton from '@/features/wishlist/WishlistButton';

type ShopProductCardProps = {
  product: ShopProduct;
  index: number;
};

export default function ShopProductCard({ product, index }: ShopProductCardProps) {
  const reduceMotion = useReducedMotion();
  const hasDiscount = product.compare_price !== null && product.compare_price > product.price;
  const discount = hasDiscount
    ? Math.round(((product.compare_price! - product.price) / product.compare_price!) * 100)
    : null;

  return (
    <motion.article
      className="shop-product-card"
      initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.99 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-35px' }}
      transition={{
        duration: reduceMotion ? 0 : 0.42,
        delay: reduceMotion ? 0 : Math.min(index % 4, 3) * 0.055,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={reduceMotion ? undefined : { y: -4 }}
    >
      <div className="shop-product-media">
        <Link
          className="shop-product-image-link"
          to={`/shop/${encodeURIComponent(product.slug)}`}
          aria-label={`View ${product.name} details`}
        >
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.imageAlt} loading="lazy" decoding="async" />
          ) : (
            <span className="shop-product-no-image" aria-hidden="true">
              <ShoppingBag aria-hidden="true" />
            </span>
          )}
        </Link>
        {product.categoryName && (
          <span className="shop-product-category">{product.categoryName}</span>
        )}
        {discount !== null && <span className="shop-product-discount">{discount}% off</span>}
        <div
          className="shop-product-quick-actions"
          role="group"
          aria-label={`${product.name} actions`}
        >
          <WishlistButton productId={product.id} productName={product.name} />
          <Link
            to={`/shop/${encodeURIComponent(product.slug)}`}
            aria-label={`View details for ${product.name}`}
            title={`View ${product.name}`}
          >
            <Eye aria-hidden="true" />
          </Link>
        </div>
        <span className={`shop-product-stock${product.inStock ? '' : ' is-sold-out'}`}>
          <span aria-hidden="true" />
          {product.inStock ? 'In stock' : 'Sold out'}
        </span>
      </div>

      <div className="shop-product-copy">
        <div className="shop-product-brand-row">
          <span>{product.brandName ?? 'AlSera collection'}</span>
          {product.featured && <span className="shop-product-featured">Featured</span>}
        </div>
        <h3>
          <Link to={`/shop/${encodeURIComponent(product.slug)}`}>{product.name}</Link>
        </h3>
        {product.short_description && (
          <p className="shop-product-description">{product.short_description}</p>
        )}
        <div className="shop-product-price-row">
          <span className="shop-product-price">${product.price.toFixed(2)}</span>
          {hasDiscount && (
            <span className="shop-product-compare-price">${product.compare_price!.toFixed(2)}</span>
          )}
        </div>
        {product.hasVariants ? (
          <Link
            className="shop-product-add shop-product-choose-options"
            to={`/shop/${encodeURIComponent(product.slug)}`}
            aria-label={`Choose options for ${product.name}`}
          >
            <ShoppingBag size={16} aria-hidden="true" />
            Choose options
          </Link>
        ) : (
          <CartAddButton
            className="shop-product-add"
            productId={product.id}
            productName={product.name}
            disabled={!product.inStock}
            compact
          />
        )}
      </div>
    </motion.article>
  );
}
