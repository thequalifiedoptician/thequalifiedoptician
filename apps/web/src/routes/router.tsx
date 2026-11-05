import { createBrowserRouter } from 'react-router-dom';
import BrandExperienceAsync from '@/features/catalog/BrandExperienceAsync';
import HeroSection from '@/features/catalog/HeroSection';
import HomeCatalogAsync from '@/features/catalog/HomeCatalogAsync';
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
        element: <AdminRoute />,
        children: [
          {
            path: '/admin/products',
            lazy: async () => {
              const { default: AdminProductPage } =
                await import('@/features/admin/catalog/AdminProductPage');
              return { Component: AdminProductPage };
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
        element: (
          <>
            <HeroSection />
            <HomeCatalogAsync />
            <BrandExperienceAsync />
          </>
        ),
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);
