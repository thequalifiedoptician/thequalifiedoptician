import { AuthSkeleton } from '../components';
import { useAuth } from '../hooks/useAuth';

export default function AuthRouteStatus() {
  const { status, error } = useAuth();

  if (status === 'initializing') {
    return (
      <div className="auth-route-status" aria-label="Authentication status">
        <AuthSkeleton />
      </div>
    );
  }

  return (
    <div className="auth-route-status">
      <section className="auth-route-message" role="alert" aria-live="assertive">
        <h1>Authentication is temporarily unavailable.</h1>
        <p>{error ?? 'Please try again later.'}</p>
        <a href="/">Return to AlSera</a>
      </section>
    </div>
  );
}
