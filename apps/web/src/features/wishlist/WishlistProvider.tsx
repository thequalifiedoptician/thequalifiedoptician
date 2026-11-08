import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { addWishlistItem, loadWishlistProductIds, removeWishlistItem } from './wishlistService';
import { WishlistContext, type WishlistContextValue } from './WishlistContext';

type WishlistState = {
  userId: string | null;
  productIds: Set<string>;
  isLoading: boolean;
  error: string | null;
};

const INITIAL_STATE: WishlistState = {
  userId: null,
  productIds: new Set(),
  isLoading: true,
  error: null,
};

function getOperationKey(userId: string, productId: string): string {
  return `${userId}:${productId}`;
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { isLoading: isAuthLoading, user } = useAuth();
  const [state, setState] = useState<WishlistState>(INITIAL_STATE);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
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

    void (async () => {
      try {
        const client = await getSupabaseClient();
        const productIds = await loadWishlistProductIds(client, userId);
        if (isCurrent) {
          setState({ userId, productIds: new Set(productIds), isLoading: false, error: null });
        }
      } catch (loadError) {
        if (isCurrent) {
          setState((current) => ({
            userId,
            productIds: current.userId === userId ? current.productIds : new Set(),
            isLoading: false,
            error:
              loadError instanceof Error
                ? loadError.message
                : 'Your wishlist could not be loaded. Please try again.',
          }));
        }
      }
    })();

    return () => {
      isCurrent = false;
    };
  }, [isAuthLoading, refreshVersion, userId]);

  const mutateWishlist = useCallback(
    async (productId: string, shouldSave: boolean): Promise<boolean> => {
      if (!userId) {
        return false;
      }

      const key = getOperationKey(userId, productId);
      if (operationLocks.current.has(key)) {
        return false;
      }
      operationLocks.current.add(key);
      const currentItemSaved = state.userId === userId && state.productIds.has(productId);
      setPendingIds((current) => new Set(current).add(key));
      setOperationErrors((current) => {
        const next = new Map(current);
        next.delete(key);
        return next;
      });
      setState((current) => {
        const productIds = new Set(current.userId === userId ? current.productIds : []);
        if (shouldSave) {
          productIds.add(productId);
        } else {
          productIds.delete(productId);
        }
        return { userId, productIds, isLoading: false, error: null };
      });

      try {
        const client = await getSupabaseClient();
        if (shouldSave) {
          await addWishlistItem(client, userId, productId);
        } else {
          await removeWishlistItem(client, userId, productId);
        }
        return true;
      } catch (operationError) {
        if (userIdRef.current === userId) {
          setState((current) => {
            const productIds = new Set(current.userId === userId ? current.productIds : []);
            if (currentItemSaved) {
              productIds.add(productId);
            } else {
              productIds.delete(productId);
            }
            return { userId, productIds, isLoading: false, error: null };
          });
          setOperationErrors((current) =>
            new Map(current).set(
              key,
              operationError instanceof Error
                ? operationError.message
                : 'Your wishlist could not be updated. Please try again.',
            ),
          );
        }
        return false;
      } finally {
        operationLocks.current.delete(key);
        setPendingIds((current) => {
          const next = new Set(current);
          next.delete(key);
          return next;
        });
      }
    },
    [state.productIds, state.userId, userId],
  );

  const toggleWishlist = useCallback(
    (productId: string) => {
      const isCurrentlySaved = state.userId === userId && state.productIds.has(productId);
      return mutateWishlist(productId, !isCurrentlySaved);
    },
    [mutateWishlist, state.productIds, state.userId, userId],
  );

  const removeFromWishlist = useCallback(
    (productId: string) => mutateWishlist(productId, false),
    [mutateWishlist],
  );

  const refreshWishlist = useCallback(() => {
    if (userId) {
      setState((current) =>
        current.userId === userId ? { ...current, isLoading: true, error: null } : current,
      );
      setRefreshVersion((current) => current + 1);
    }
  }, [userId]);

  const contextValue = useMemo<WishlistContextValue>(
    () => ({
      productIds: state.userId === userId ? state.productIds : new Set(),
      isLoading: isAuthLoading || (userId !== null && (state.userId !== userId || state.isLoading)),
      error: state.userId === userId ? state.error : null,
      operationErrors: userId
        ? new Map(
            [...operationErrors.entries()]
              .filter(([key]) => key.startsWith(`${userId}:`))
              .map(([key, message]) => [key.slice(userId.length + 1), message]),
          )
        : new Map(),
      isPending: (productId) =>
        userId ? pendingIds.has(getOperationKey(userId, productId)) : false,
      isSaved: (productId) => state.userId === userId && state.productIds.has(productId),
      toggleWishlist,
      removeFromWishlist,
      refreshWishlist,
    }),
    [
      isAuthLoading,
      operationErrors,
      pendingIds,
      refreshWishlist,
      removeFromWishlist,
      state,
      toggleWishlist,
      userId,
    ],
  );

  return <WishlistContext.Provider value={contextValue}>{children}</WishlistContext.Provider>;
}
