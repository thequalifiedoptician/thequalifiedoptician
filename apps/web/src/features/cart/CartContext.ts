import { createContext } from 'react';
import type { CartDisplayItem } from './cartTypes';

export type CartContextValue = {
  items: CartDisplayItem[];
  isLoading: boolean;
  error: string | null;
  operationErrors: ReadonlyMap<string, string>;
  itemCount: number;
  isPending: (productId: string, variantId?: string | null) => boolean;
  isItemPending: (itemId: string) => boolean;
  addToCart: (productId: string, variantId: string | null, quantity?: number) => Promise<boolean>;
  updateQuantity: (itemId: string, quantity: number) => Promise<boolean>;
  removeItem: (itemId: string) => Promise<boolean>;
  refreshCart: () => void;
};

export const CartContext = createContext<CartContextValue | undefined>(undefined);
