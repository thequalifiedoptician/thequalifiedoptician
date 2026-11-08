import { createContext } from 'react';
import type { ShopProduct } from '@/features/catalog/shop/productListingService';

export type RecentlyViewedContextValue = {
  products: ShopProduct[];
  trackProduct: (product: ShopProduct) => void;
};

export const RecentlyViewedContext = createContext<RecentlyViewedContextValue | null>(null);
