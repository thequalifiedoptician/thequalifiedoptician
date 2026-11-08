import { useCallback, useMemo, useState, type ReactNode } from 'react';
import type { ShopProduct } from '@/features/catalog/shop/productListingService';
import { RecentlyViewedContext } from './recentlyViewedContext';

export function RecentlyViewedProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<ShopProduct[]>([]);

  const trackProduct = useCallback((product: ShopProduct) => {
    setProducts((current) =>
      [product, ...current.filter((item) => item.id !== product.id)].slice(0, 8),
    );
  }, []);

  const value = useMemo(() => ({ products, trackProduct }), [products, trackProduct]);

  return <RecentlyViewedContext.Provider value={value}>{children}</RecentlyViewedContext.Provider>;
}
