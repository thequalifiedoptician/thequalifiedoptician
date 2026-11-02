import { createBrowserRouter } from 'react-router-dom';
import BrandExperienceAsync from '@/features/catalog/BrandExperienceAsync';
import HeroSection from '@/features/catalog/HeroSection';
import HomeCatalogAsync from '@/features/catalog/HomeCatalogAsync';
import MainLayout from '@/layouts/MainLayout';
import { AuthLayout, AuthSkeleton } from '@/features/auth/components';
import AuthFoundationPreview from '@/features/auth/AuthFoundationPreview';
import NotFoundPage from './NotFoundPage';

export const router = createBrowserRouter([
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
