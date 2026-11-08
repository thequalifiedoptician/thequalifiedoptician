import { motion, useReducedMotion } from 'framer-motion';
import { Heart, LoaderCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AUTH_ROUTES } from '@/features/auth/constants/auth';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getAuthRedirectState } from '@/features/auth/utils/authNavigation';
import { useWishlist } from './useWishlist';

type WishlistButtonProps = {
  productId: string;
  productName: string;
  className?: string;
};

export default function WishlistButton({ productId, productName, className }: WishlistButtonProps) {
  const reduceMotion = useReducedMotion();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { isLoading, isPending, isSaved, operationErrors, toggleWishlist } = useWishlist();
  const location = useLocation();
  const navigate = useNavigate();
  const saved = isSaved(productId);
  const pending = isPending(productId);
  const actionError = operationErrors.get(productId) ?? null;

  return (
    <motion.button
      className={`wishlist-toggle${saved ? ' is-saved' : ''}${className ? ` ${className}` : ''}`}
      type="button"
      aria-label={`${saved ? `Remove ${productName} from wishlist` : `Add ${productName} to wishlist`}${
        actionError ? `. Error: ${actionError}` : ''
      }`}
      aria-pressed={saved}
      aria-busy={pending}
      disabled={isLoading || isAuthLoading || pending}
      title={saved ? 'Remove from wishlist' : 'Add to wishlist'}
      onClick={() => {
        if (!isAuthenticated) {
          navigate(AUTH_ROUTES.login, { state: getAuthRedirectState(location) });
          return;
        }
        void toggleWishlist(productId);
      }}
      whileHover={reduceMotion ? undefined : { scale: 1.08 }}
      whileTap={reduceMotion ? undefined : { scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
    >
      {pending ? (
        <LoaderCircle className="wishlist-toggle-spinner" aria-hidden="true" />
      ) : (
        <Heart aria-hidden="true" fill={saved ? 'currentColor' : 'none'} />
      )}
    </motion.button>
  );
}
