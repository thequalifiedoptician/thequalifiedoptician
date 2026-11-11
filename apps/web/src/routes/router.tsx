import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import { AuthLayout, AuthSkeleton } from '@/features/auth/components';
import AuthFoundationPreview from '@/features/auth/AuthFoundationPreview';
import ProtectedRoute from '@/features/auth/guards/ProtectedRoute';
import AdminRoute from '@/features/admin/AdminRoute';
import NotFoundPage from './NotFoundPage';

export const router = createBrowserRouter([
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          {
            path: '/account/orders',
            lazy: async () => {
              const { default: OrderHistoryPage } =
                await import('@/features/checkout/orderHistory/OrderHistoryPage');
              return { Component: OrderHistoryPage };
            },
          },
        ],
      },
      {
        element: <AdminRoute />,
        children: [
          {
            path: '/admin',
            element: <Navigate to="/admin/homepage" replace />,
          },
          {
            path: '/admin/homepage',
            lazy: async () => {
              const { default: HomepageAdminPage } =
                await import('@/features/admin/homepage/HomepageAdminPage');
              return { Component: HomepageAdminPage };
            },
          },
          {
            path: '/admin/products',
            lazy: async () => {
              const { default: AdminProductPage } =
                await import('@/features/admin/catalog/AdminProductPage');
              return { Component: AdminProductPage };
            },
          },
          {
            path: '/admin/deals',
            lazy: async () => {
              const { default: DealsAdminPage } =
                await import('@/features/admin/deals/DealsAdminPage');
              return { Component: DealsAdminPage };
            },
          },
          {
            path: '/admin/about',
            lazy: async () => {
              const { default: AboutAdminPage } =
                await import('@/features/admin/about/AboutAdminPage');
              return { Component: AboutAdminPage };
            },
          },
          {
            path: '/admin/orders',
            lazy: async () => {
              const { default: AdminOrdersPage } =
                await import('@/features/admin/orders/AdminOrdersPage');
              return { Component: AdminOrdersPage };
            },
          },
          {
            path: '/admin/payments/pending',
            lazy: async () => {
              const { default: PendingPaymentsAdminPage } =
                await import('@/features/admin/payments/PendingPaymentsAdminPage');
              return { Component: PendingPaymentsAdminPage };
            },
          },
          {
            path: '/admin/settings/payment-accounts',
            lazy: async () => {
              const { default: PaymentAccountsAdminPage } =
                await import('@/features/admin/payments/PaymentAccountsAdminPage');
              return { Component: PaymentAccountsAdminPage };
            },
          },
          {
            path: '/admin/settings/brand',
            lazy: async () => {
              const { default: BrandSettingsPage } =
                await import('@/features/admin/brand/BrandSettingsPage');
              return { Component: BrandSettingsPage };
            },
          },
          {
            path: '/admin/settings/social',
            lazy: async () => {
              const { default: SocialMediaAdminPage } =
                await import('@/features/admin/social/SocialMediaAdminPage');
              return { Component: SocialMediaAdminPage };
            },
          },
        ],
      },
    ],
  },
  {
    path: '/auth/signup',
    HydrateFallback: () => (
      <AuthLayout>
        <AuthSkeleton />
      </AuthLayout>
    ),
    lazy: async () => {
      const { default: SignupPage } = await import('@/features/auth/SignupPage');
      return {
        Component: () => (
          <AuthLayout>
            <SignupPage />
          </AuthLayout>
        ),
      };
    },
  },
  {
    path: '/auth/login',
    HydrateFallback: () => (
      <AuthLayout>
        <AuthSkeleton />
      </AuthLayout>
    ),
    lazy: async () => {
      const { default: LoginPage } = await import('@/features/auth/LoginPage');
      return {
        Component: () => (
          <AuthLayout>
            <LoginPage />
          </AuthLayout>
        ),
      };
    },
  },
  {
    path: '/auth/forgot-password',
    HydrateFallback: () => (
      <AuthLayout>
        <AuthSkeleton />
      </AuthLayout>
    ),
    lazy: async () => {
      const { default: ForgotPasswordPage } = await import('@/features/auth/ForgotPasswordPage');
      return {
        Component: () => (
          <AuthLayout>
            <ForgotPasswordPage />
          </AuthLayout>
        ),
      };
    },
  },
  {
    path: '/auth/reset-password',
    HydrateFallback: () => (
      <AuthLayout>
        <AuthSkeleton />
      </AuthLayout>
    ),
    lazy: async () => {
      const { default: ResetPasswordPage } = await import('@/features/auth/ResetPasswordPage');
      return {
        Component: () => (
          <AuthLayout>
            <ResetPasswordPage />
          </AuthLayout>
        ),
      };
    },
  },
  {
    path: '/auth/verify-email/pending',
    HydrateFallback: () => (
      <AuthLayout>
        <AuthSkeleton />
      </AuthLayout>
    ),
    lazy: async () => {
      const { default: EmailVerificationPendingPage } =
        await import('@/features/auth/EmailVerificationPendingPage');
      return {
        Component: () => (
          <AuthLayout>
            <EmailVerificationPendingPage />
          </AuthLayout>
        ),
      };
    },
  },
  {
    path: '/auth/verify-email/success',
    HydrateFallback: () => (
      <AuthLayout>
        <AuthSkeleton />
      </AuthLayout>
    ),
    lazy: async () => {
      const { default: EmailVerificationSuccessPage } =
        await import('@/features/auth/EmailVerificationSuccessPage');
      return {
        Component: () => (
          <AuthLayout>
            <EmailVerificationSuccessPage />
          </AuthLayout>
        ),
      };
    },
  },
  {
    path: '/auth/verify-email/failed',
    HydrateFallback: () => (
      <AuthLayout>
        <AuthSkeleton />
      </AuthLayout>
    ),
    lazy: async () => {
      const { default: EmailVerificationFailedPage } =
        await import('@/features/auth/EmailVerificationFailedPage');
      return {
        Component: () => (
          <AuthLayout>
            <EmailVerificationFailedPage />
          </AuthLayout>
        ),
      };
    },
  },
  {
    path: '/auth/verify-email/expired',
    HydrateFallback: () => (
      <AuthLayout>
        <AuthSkeleton />
      </AuthLayout>
    ),
    lazy: async () => {
      const { default: EmailVerificationExpiredPage } =
        await import('@/features/auth/EmailVerificationExpiredPage');
      return {
        Component: () => (
          <AuthLayout>
            <EmailVerificationExpiredPage />
          </AuthLayout>
        ),
      };
    },
  },
  {
    path: '/auth/verify-email',
    HydrateFallback: () => (
      <AuthLayout>
        <AuthSkeleton />
      </AuthLayout>
    ),
    lazy: async () => {
      const { default: EmailVerificationCallbackPage } =
        await import('@/features/auth/EmailVerificationCallbackPage');
      return {
        Component: () => (
          <AuthLayout>
            <EmailVerificationCallbackPage />
          </AuthLayout>
        ),
      };
    },
  },
  {
    path: '/auth/foundation',
    element: (
      <AuthLayout>
        <AuthFoundationPreview />
      </AuthLayout>
    ),
  },
  {
    element: <MainLayout />,
    children: [
      {
        index: true,
        lazy: async () => {
          const { default: HomepagePage } = await import('@/features/catalog/HomepagePage');
          return { Component: HomepagePage };
        },
      },
      {
        path: 'shop/:slug',
        lazy: async () => {
          const { default: ProductDetailsPage } =
            await import('@/features/catalog/product-details/ProductDetailsPage');
          return { Component: ProductDetailsPage };
        },
      },
      {
        path: 'shop',
        lazy: async () => {
          const { default: ShopPage } = await import('@/features/catalog/shop/ShopPage');
          return { Component: ShopPage };
        },
      },
      {
        path: 'deals',
        lazy: async () => {
          const { default: DealsPage } = await import('@/features/deals/DealsPage');
          return { Component: DealsPage };
        },
      },
      {
        path: 'about',
        lazy: async () => {
          const { default: AboutPage } = await import('@/features/about/AboutPage');
          return { Component: AboutPage };
        },
      },
      {
        path: 'contact',
        lazy: async () => {
          const { default: ContactPage } = await import('@/features/contact/ContactPage');
          return { Component: ContactPage };
        },
      },
      {
        path: 'wishlist',
        lazy: async () => {
          const { default: WishlistPage } = await import('@/features/wishlist/WishlistPage');
          return { Component: WishlistPage };
        },
      },
      {
        path: 'cart',
        lazy: async () => {
          const { default: CartPage } = await import('@/features/cart/CartPage');
          return { Component: CartPage };
        },
      },
      {
        path: 'checkout/manual-payment/:orderId',
        lazy: async () => {
          const { default: ManualPaymentPage } =
            await import('@/features/checkout/payment/ManualPaymentPage');
          return { Component: ManualPaymentPage };
        },
      },
      {
        path: 'checkout/confirmation/:orderId',
        lazy: async () => {
          const { default: OrderConfirmationPage } =
            await import('@/features/checkout/orderConfirmation/OrderConfirmationPage');
          return { Component: OrderConfirmationPage };
        },
      },
      {
        path: 'account/orders/:orderId/tracking',
        lazy: async () => {
          const { default: OrderTrackingPage } =
            await import('@/features/checkout/orderTracking/OrderTrackingPage');
          return { Component: OrderTrackingPage };
        },
      },
      {
        path: 'checkout',
        lazy: async () => {
          const { default: CheckoutPage } = await import('@/features/checkout/CheckoutPage');
          return { Component: CheckoutPage };
        },
      },
      {
        path: 'categories',
        element: <Navigate to="/shop" replace />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);
