import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AUTH_ROUTES } from '../constants/auth';
import { useAuth } from '../hooks/useAuth';
import AuthRouteStatus from './AuthRouteStatus';

export default function ProtectedRoute() {
  const { status, isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (status === 'initializing') {
    return <AuthRouteStatus />;
  }

  if (status === 'unavailable' || status === 'error') {
    return <AuthRouteStatus />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={AUTH_ROUTES.login}
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
        replace
      />
    );
  }

  if (!user?.email_confirmed_at) {
    return <Navigate to={AUTH_ROUTES.verificationPending} state={{ email: user?.email }} replace />;
  }

  return <Outlet />;
}
