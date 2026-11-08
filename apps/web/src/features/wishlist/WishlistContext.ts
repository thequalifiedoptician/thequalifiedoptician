import { createContext } from 'react';

export type WishlistContextValue = {
  productIds: ReadonlySet<string>;
  isLoading: boolean;
  error: string | null;
  operationErrors: ReadonlyMap<string, string>;
  isPending: (productId: string) => boolean;
  isSaved: (productId: string) => boolean;
  toggleWishlist: (productId: string) => Promise<boolean>;
  removeFromWishlist: (productId: string) => Promise<boolean>;
  refreshWishlist: () => void;
};

export const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);
