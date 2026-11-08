import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, LoaderCircle, ShoppingBag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AUTH_ROUTES } from '@/features/auth/constants/auth';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getAuthRedirectState } from '@/features/auth/utils/authNavigation';
import { useCart } from './useCart';

type CartAddButtonProps = {
  productId: string;
  productName: string;
  variantId?: string | null;
  quantity?: number;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
};

export default function CartAddButton({
  productId,
  productName,
  variantId = null,
  quantity = 1,
  disabled = false,
  className = '',
  compact = false,
}: CartAddButtonProps) {
  const { addToCart, isPending, operationErrors } = useCart();
  const { isAuthenticated } = useAuth();
  const [wasAdded, setWasAdded] = useState(false);
  const reduceMotion = useReducedMotion();
  const location = useLocation();
  const navigate = useNavigate();
  const pending = isPending(productId, variantId);
  const operationKey = `${productId}:${variantId ?? 'base'}`;
  const error = operationErrors.get(operationKey);

  useEffect(() => {
    if (!wasAdded) {
      return;
    }
    const timer = window.setTimeout(() => setWasAdded(false), 1700);
    return () => window.clearTimeout(timer);
  }, [wasAdded]);

  const handleAdd = async () => {
    if (!isAuthenticated) {
      navigate(AUTH_ROUTES.login, { state: getAuthRedirectState(location) });
      return;
    }
    setWasAdded(false);
    setWasAdded(await addToCart(productId, variantId, quantity));
  };

  return (
    <div className={`cart-add-control${compact ? ' is-compact' : ''}`}>
      <motion.button
        className={className}
        type="button"
        disabled={disabled || pending}
        aria-label={
          disabled
            ? `${productName} is out of stock`
            : pending
              ? `Adding ${productName} to your bag`
              : wasAdded
                ? `${productName} added to your bag`
                : `Add ${productName} to your bag`
        }
        aria-describedby={error ? `${operationKey}-error` : undefined}
        onClick={() => void handleAdd()}
        whileHover={reduceMotion || disabled ? undefined : { y: -1 }}
        whileTap={reduceMotion || disabled ? undefined : { scale: 0.98 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={pending ? 'pending' : wasAdded ? 'added' : 'idle'}
            className="cart-add-button-content"
            initial={reduceMotion ? false : { opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -3 }}
            transition={{ duration: reduceMotion ? 0 : 0.16 }}
          >
            {pending ? (
              <LoaderCircle aria-hidden="true" className="cart-spinning-icon" />
            ) : wasAdded ? (
              <Check aria-hidden="true" />
            ) : (
              <ShoppingBag aria-hidden="true" />
            )}
            {compact
              ? pending
                ? 'Adding'
                : wasAdded
                  ? 'Added'
                  : 'Add to bag'
              : pending
                ? 'Adding to bag'
                : wasAdded
                  ? 'Added to bag'
                  : 'Add to bag'}
          </motion.span>
        </AnimatePresence>
      </motion.button>
      {error && (
        <p className="cart-inline-error" id={`${operationKey}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
