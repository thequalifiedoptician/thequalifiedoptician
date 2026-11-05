import { Navigate } from 'react-router-dom';
import { EmailVerificationStatus } from './components';
import { AUTH_ROUTES } from './constants/auth';
import { useAuth } from './hooks/useAuth';

export default function EmailVerificationSuccessPage() {
  const { status, user } = useAuth();

  if (status === 'initializing') {
    return <Navigate to={AUTH_ROUTES.verificationCallback} replace />;
  }

  if (status !== 'authenticated' || !user?.email_confirmed_at) {
    return <Navigate to={AUTH_ROUTES.verificationFailed} replace />;
  }

  return <EmailVerificationStatus status="success" />;
}
