import { Navigate, Outlet } from 'react-router-dom';
import { AUTH_ROUTES } from '../constants/auth';
import { useAuth } from '../hooks/useAuth';
import AuthRouteStatus from './AuthRouteStatus';

export default function GuestRoute() {
  const { status, isAuthenticated } = useAuth();

  if (status === 'initializing') {
    return <AuthRouteStatus />;
  }

  if (status === 'unavailable' || status === 'error') {
    return <AuthRouteStatus />;
  }

  if (isAuthenticated) {
    return <Navigate to={AUTH_ROUTES.account} replace />;
  }

  return <Outlet />;
}
