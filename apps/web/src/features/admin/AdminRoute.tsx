import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function AdminRoute() {
  const { user } = useAuth();

  if (user?.app_metadata.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
