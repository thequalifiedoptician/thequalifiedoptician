import type { Database } from '@/features/auth/types/database';
import type { ShopProduct } from '@/features/catalog/shop/productListingService';

export type CartItemRow = Database['public']['Tables']['cart_items']['Row'];

export type CartVariant = {
  id: string;
  sku: string;
  color: string | null;
  size: string | null;
  material: string | null;
  price: number | null;
};

export type CartDisplayItem = CartItemRow & {
  product: ShopProduct | null;
  variant: CartVariant | null;
  inStock: boolean;
};
