import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import type { CartDisplayItem, CartItemRow } from './cartTypes';
import {
  addItemToCart,
  loadCartItems,
  removeCartItem,
  updateCartItemQuantity,
} from './cartService';
import { MAX_CART_QUANTITY, getCartItemKey } from './cartUtils';
import { CartContext, type CartContextValue } from './CartContext';
import './cart.css';

type CartState = {
  userId: string | null;
  items: CartDisplayItem[];
  isLoading: boolean;
  error: string | null;
};

const INITIAL_STATE: CartState = {
  userId: null,
  items: [],
  isLoading: true,
  error: null,
};

function rowToDisplayItem(row: CartItemRow, previous?: CartDisplayItem): CartDisplayItem {
  return {
    ...row,
    product: previous?.product ?? null,
    variant: previous?.variant ?? null,
    inStock: previous?.inStock ?? true,
  };
}

function describeError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Your cart could not be updated. Please try again.';
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { isLoading: isAuthLoading, user } = useAuth();
  const [state, setState] = useState<CartState>(INITIAL_STATE);
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(() => new Set());
  const [operationErrors, setOperationErrors] = useState<Map<string, string>>(() => new Map());
  const [refreshVersion, setRefreshVersion] = useState(0);
  const operationLocks = useRef(new Set<string>());
  const userId = user?.id ?? null;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  useEffect(() => {
    let isCurrent = true;
    if (isAuthLoading) {
      return () => {
        isCurrent = false;
      };
    }

    if (!userId) {
      operationLocks.current.clear();
      return () => {
        isCurrent = false;
      };
    }

    void Promise.resolve().then(async () => {
      try {
        const client = await getSupabaseClient();
        const items = await loadCartItems(client, userId);
        if (isCurrent) {
          setState({ userId, items, isLoading: false, error: null });
        }
      } catch (loadError) {
        if (isCurrent) {
          setState((current) => ({
            userId,
            items: current.userId === userId ? current.items : [],
            isLoading: false,
            error: describeError(loadError),
          }));
        }
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [isAuthLoading, refreshVersion, userId]);

  const addToCart = useCallback(
    async (
      productId: string,
      variantId: string | null,
      requestedQuantity = 1,
    ): Promise<boolean> => {
      if (!userId) {
        return false;
      }
      const key = `${userId}:${getCartItemKey(productId, variantId)}`;
      if (operationLocks.current.has(key)) {
        return false;
      }
      operationLocks.current.add(key);
      const quantity = Math.max(1, Math.min(MAX_CART_QUANTITY, Math.floor(requestedQuantity)));
      const existing =
        state.userId === userId
          ? state.items.find(
              (item) => item.product_id === productId && item.variant_id === variantId,
            )
          : undefined;
      const previous = existing;
      setPendingKeys((current) => new Set(current).add(key));
      setOperationErrors((current) => {
        const next = new Map(current);
        next.delete(key);
        return next;
      });
      setState((current) => {
        const items = current.userId === userId ? [...current.items] : [];
        const matchingIndex = items.findIndex(
          (item) => item.product_id === productId && item.variant_id === variantId,
        );
        if (matchingIndex >= 0) {
          items[matchingIndex] = {
            ...items[matchingIndex],
            quantity: Math.min(MAX_CART_QUANTITY, items[matchingIndex].quantity + quantity),
          };
        } else {
          const now = new Date().toISOString();
          items.push({
            id: `pending:${key}`,
            user_id: userId,
            product_id: productId,
            variant_id: variantId,
            quantity,
            created_at: now,
            updated_at: now,
            product: null,
            variant: null,
            inStock: true,
          });
        }
        return { userId, items, isLoading: false, error: null };
      });

      try {
        const client = await getSupabaseClient();
        const savedRow = await addItemToCart(client, productId, variantId, quantity);
        setState((current) => {
          if (current.userId !== userId) {
            return current;
          }
          const items = current.items.filter(
            (item) => !(item.product_id === productId && item.variant_id === variantId),
          );
          items.push(rowToDisplayItem(savedRow, previous));
          return { ...current, items, isLoading: false, error: null };
        });
        if (userIdRef.current === userId) {
          setState((current) => ({ ...current, isLoading: true }));
          setRefreshVersion((current) => current + 1);
        }
        return true;
      } catch (addError) {
        if (userIdRef.current === userId) {
          setState((current) => {
            if (current.userId !== userId) {
              return current;
            }
            const items = current.items.filter(
              (item) => !(item.product_id === productId && item.variant_id === variantId),
            );
            if (previous) {
              items.push(previous);
            }
            return { ...current, items, isLoading: false };
          });
          setOperationErrors((current) => new Map(current).set(key, describeError(addError)));
        }
        return false;
      } finally {
        operationLocks.current.delete(key);
        setPendingKeys((current) => {
          const next = new Set(current);
          next.delete(key);
          return next;
        });
      }
    },
    [state.items, state.userId, userId],
  );

  const updateQuantity = useCallback(
    async (itemId: string, requestedQuantity: number): Promise<boolean> => {
      if (!userId) {
        return false;
      }
      const previous = state.items.find((item) => item.id === itemId);
      if (!previous) {
        return false;
      }
      const key = `${userId}:${itemId}`;
      if (operationLocks.current.has(key)) {
        return false;
      }
      operationLocks.current.add(key);
      const quantity = Math.max(1, Math.min(MAX_CART_QUANTITY, Math.floor(requestedQuantity)));
      setPendingKeys((current) => new Set(current).add(key));
      setOperationErrors((current) => {
        const next = new Map(current);
        next.delete(key);
        return next;
      });
      setState((current) => ({
        ...current,
        items: current.items.map((item) => (item.id === itemId ? { ...item, quantity } : item)),
      }));

      try {
        const client = await getSupabaseClient();
        const savedRow = await updateCartItemQuantity(client, userId, itemId, quantity);
        setState((current) => ({
          ...current,
          items: current.items.map((item) =>
            item.id === itemId ? rowToDisplayItem(savedRow, item) : item,
          ),
        }));
        return true;
      } catch (updateError) {
        if (userIdRef.current === userId) {
          setState((current) => ({
            ...current,
            items: current.items.map((item) => (item.id === itemId ? previous : item)),
          }));
          setOperationErrors((current) => new Map(current).set(key, describeError(updateError)));
        }
        return false;
      } finally {
        operationLocks.current.delete(key);
        setPendingKeys((current) => {
          const next = new Set(current);
          next.delete(key);
          return next;
        });
      }
    },
    [state.items, userId],
  );

  const removeItem = useCallback(
    async (itemId: string): Promise<boolean> => {
      if (!userId) {
        return false;
      }
      const previous = state.items.find((item) => item.id === itemId);
      if (!previous) {
        return false;
      }
      const key = `${userId}:${itemId}`;
      if (operationLocks.current.has(key)) {
        return false;
      }
      operationLocks.current.add(key);
      setPendingKeys((current) => new Set(current).add(key));
      setOperationErrors((current) => {
        const next = new Map(current);
        next.delete(key);
        return next;
      });
      setState((current) => ({
        ...current,
        items: current.items.filter((item) => item.id !== itemId),
      }));

      try {
        const client = await getSupabaseClient();
        await removeCartItem(client, userId, itemId);
        return true;
      } catch (removeError) {
        if (userIdRef.current === userId) {
          setState((current) => ({ ...current, items: [...current.items, previous] }));
          setOperationErrors((current) => new Map(current).set(key, describeError(removeError)));
        }
        return false;
      } finally {
        operationLocks.current.delete(key);
        setPendingKeys((current) => {
          const next = new Set(current);
          next.delete(key);
          return next;
        });
      }
    },
    [state.items, userId],
  );

  const refreshCart = useCallback(() => {
    if (userId) {
      setState((current) =>
        current.userId === userId ? { ...current, isLoading: true, error: null } : current,
      );
      setRefreshVersion((current) => current + 1);
    }
  }, [userId]);

  const contextValue = useMemo<CartContextValue>(
    () => ({
      items: state.userId === userId ? state.items : [],
      isLoading: isAuthLoading || (userId !== null && (state.userId !== userId || state.isLoading)),
      error: state.userId === userId ? state.error : null,
      operationErrors: userId
        ? new Map(
            [...operationErrors.entries()]
              .filter(([key]) => key.startsWith(`${userId}:`))
              .map(([key, message]) => [key.slice(userId.length + 1), message]),
          )
        : new Map(),
      itemCount:
        state.userId === userId ? state.items.reduce((count, item) => count + item.quantity, 0) : 0,
      isPending: (productId, variantId = null) =>
        userId ? pendingKeys.has(`${userId}:${getCartItemKey(productId, variantId)}`) : false,
      isItemPending: (itemId) => (userId ? pendingKeys.has(`${userId}:${itemId}`) : false),
      addToCart,
      updateQuantity,
      removeItem,
      refreshCart,
    }),
    [
      addToCart,
      isAuthLoading,
      operationErrors,
      pendingKeys,
      refreshCart,
      removeItem,
      state,
      updateQuantity,
      userId,
    ],
  );

  return <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>;
}
