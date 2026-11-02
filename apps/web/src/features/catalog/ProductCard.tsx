import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Eye, Heart, Scale, ShoppingBag, Star } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AUTH_ROUTES } from '@/features/auth/constants/auth';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getAuthRedirectState } from '@/features/auth/utils/authNavigation';
import type { Product } from './productShowcaseData';

type ProductCardProps = {
  product: Product;
};

export default function ProductCard({ product }: ProductCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isSaved, setIsSaved] = useState(false);
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const requireAuthentication = () => {
    if (isAuthenticated) {
      return true;
    }

    navigate(AUTH_ROUTES.login, {
      state: getAuthRedirectState(location),
    });
    return false;
  };

  return (
    <motion.article
      className="product-card"
      whileHover={prefersReducedMotion ? undefined : { y: -5 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
    >
      <div className="product-card-media">
        <img
          className="product-card-image"
          src={product.image}
          alt={product.imageAlt}
          loading="lazy"
          decoding="async"
        />
        <span className="product-category-badge">{product.category}</span>
        {product.badge && <span className="product-editorial-badge">{product.badge}</span>}

        <div className="product-card-actions" role="group" aria-label={`${product.name} actions`}>
          <motion.button
            className={`product-icon-action${isSaved ? ' is-selected' : ''}`}
            type="button"
            aria-label={
              isSaved ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`
            }
            aria-pressed={isSaved}
            title="Wishlist"
            onClick={() => {
              if (requireAuthentication()) {
                setIsSaved((saved) => !saved);
              }
            }}
            whileHover={prefersReducedMotion ? undefined : { scale: 1.08 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }}
          >
            <Heart aria-hidden="true" fill={isSaved ? 'currentColor' : 'none'} />
          </motion.button>
          <motion.button
            className="product-icon-action"
            type="button"
            aria-label={`Quick view ${product.name}`}
            title="Quick view"
            whileHover={prefersReducedMotion ? undefined : { scale: 1.08 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }}
          >
            <Eye aria-hidden="true" />
          </motion.button>
          <motion.button
            className="product-icon-action"
            type="button"
            aria-label={`Compare ${product.name}`}
            title="Compare"
            whileHover={prefersReducedMotion ? undefined : { scale: 1.08 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }}
          >
            <Scale aria-hidden="true" />
          </motion.button>
        </div>

        <span className="product-stock-badge">
          <span aria-hidden="true" />
          {product.stockLabel}
        </span>
      </div>

      <div className="product-card-details">
        <div className="product-card-heading">
          <div className="product-card-title-group">
            <h3>{product.name}</h3>
            <p>{product.description}</p>
          </div>
          <span className="product-card-arrow" aria-hidden="true">
            <ArrowUpRight />
          </span>
        </div>

        <div className="product-rating" aria-label={`Rated ${product.rating} out of 5`}>
          <span className="product-rating-stars" aria-hidden="true">
            {Array.from({ length: 5 }, (_, index) => (
              <Star key={index} fill="currentColor" />
            ))}
          </span>
          <span className="product-rating-value">{product.rating}</span>
          <span className="product-review-count">({product.reviewCount})</span>
        </div>

        <div className="product-purchase-row">
          <div className="product-price-group">
            <span className="product-current-price">{product.price}</span>
            <span className="product-original-price">{product.originalPrice}</span>
          </div>
          <span className="product-discount-badge">{product.discount}</span>
        </div>

        <button
          className="product-add-button"
          type="button"
          onClick={() => {
            requireAuthentication();
          }}
        >
          <ShoppingBag aria-hidden="true" />
          <span>Add to bag</span>
          <ArrowUpRight className="product-add-arrow" aria-hidden="true" />
        </button>
      </div>
    </motion.article>
  );
}
