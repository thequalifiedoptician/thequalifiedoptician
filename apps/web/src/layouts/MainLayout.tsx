import { Outlet, useLocation } from 'react-router-dom';
import FloatingActions from '@/components/shared/FloatingActions';
import { RecentlyViewedProvider } from '@/features/catalog/product-details/RecentlyViewedProvider';
import SiteFooter from '@/components/shared/SiteFooter';
import SiteHeader from '@/components/shared/SiteHeader';
import { CartProvider } from '@/features/cart/CartProvider';
import { WishlistProvider } from '@/features/wishlist/WishlistProvider';

export default function MainLayout() {
  const { pathname } = useLocation();
  const isCheckout = pathname === '/checkout';

  return (
    <CartProvider>
      <WishlistProvider>
        {!isCheckout && <SiteHeader />}
        <main
          id="main-content"
          className={isCheckout ? 'page-container checkout-main' : 'page-container'}
        >
          <RecentlyViewedProvider>
            <Outlet />
          </RecentlyViewedProvider>
        </main>
        {!isCheckout && <SiteFooter />}
        {!isCheckout && <FloatingActions />}
      </WishlistProvider>
    </CartProvider>
  );
}
