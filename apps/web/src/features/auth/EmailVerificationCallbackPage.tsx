import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { AuthCard } from './components';
import { AUTH_ROUTES } from './constants/auth';
import { useAuth } from './hooks/useAuth';
import { toAuthServiceError } from './utils/authErrors';

function getCallbackError(
  search: string,
  hash: string,
): { code: string; description: string } | null {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/u, ''));
  const code =
    query.get('error_code') ??
    query.get('error') ??
    fragment.get('error_code') ??
    fragment.get('error');

  if (!code) {
    return null;
  }

  return {
    code,
    description: query.get('error_description') ?? fragment.get('error_description') ?? '',
  };
}

function isExpiredVerificationError(error: { code: string; description: string }): boolean {
  return /expired|otp_expired|flow_state_expired/iu.test(`${error.code} ${error.description}`);
}

export default function EmailVerificationCallbackPage() {
  const location = useLocation();
  const { status, user, refreshSession } = useAuth();
  const refreshStarted = useRef(false);
  const [refreshState, setRefreshState] = useState<'idle' | 'pending' | 'complete' | 'failed'>(
    'idle',
  );
  const [refreshError, setRefreshError] = useState('');
  const callbackError = getCallbackError(location.search, location.hash);
  const isVerified =
    status === 'authenticated' && Boolean(user?.email_confirmed_at) && !callbackError;

  useEffect(() => {
    if (!isVerified || refreshStarted.current) {
      return;
    }

    refreshStarted.current = true;
    setRefreshState('pending');
    void refreshSession()
      .then(() => setRefreshState('complete'))
      .catch((error: unknown) => {
        setRefreshError(toAuthServiceError(error).message);
        setRefreshState('failed');
      });
  }, [isVerified, refreshSession]);

  if (callbackError) {
    return (
      <Navigate
        to={
          isExpiredVerificationError(callbackError)
            ? AUTH_ROUTES.verificationExpired
            : AUTH_ROUTES.verificationFailed
        }
        replace
      />
    );
  }

  if (status === 'initializing') {
    return (
      <AuthCard className="auth-verification-card" labelledBy="verification-progress-heading">
        <span className="auth-button-spinner" aria-hidden="true" />
        <h1 id="verification-progress-heading">Verifying your email…</h1>
        <p className="auth-verification-description" role="status" aria-live="polite">
          Please wait while we securely confirm your address.
        </p>
      </AuthCard>
    );
  }

  if (isVerified && refreshState === 'pending') {
    return (
      <AuthCard className="auth-verification-card" labelledBy="verification-refresh-heading">
        <span className="auth-button-spinner" aria-hidden="true" />
        <h1 id="verification-refresh-heading">Securing your session…</h1>
        <p className="auth-verification-description" role="status" aria-live="polite">
          Your email is verified. We’re refreshing your secure session.
        </p>
      </AuthCard>
    );
  }

  if (isVerified && refreshState === 'failed') {
    return (
      <AuthCard className="auth-verification-card" labelledBy="verification-refresh-error-heading">
        <h1 id="verification-refresh-error-heading">Your email is verified.</h1>
        <p className="auth-verification-description">
          We couldn’t refresh your session. Sign in again to continue.
        </p>
        <p className="auth-verification-error" role="alert">
          {refreshError}
        </p>
        <Link
          className="auth-button auth-button--primary auth-verification-action"
          to={AUTH_ROUTES.login}
        >
          Sign in
        </Link>
      </AuthCard>
    );
  }

  if (isVerified && refreshState === 'complete') {
    return <Navigate to={AUTH_ROUTES.verificationSuccess} replace />;
  }

  if (status === 'error' || status === 'unavailable') {
    return (
      <AuthCard className="auth-verification-card" labelledBy="verification-error-heading">
        <h1 id="verification-error-heading">We couldn’t verify your email.</h1>
        <p className="auth-verification-description">
          The link may be invalid or expired. Request a new verification email to continue.
        </p>
        <Link
          className="auth-button auth-button--primary auth-verification-action"
          to={AUTH_ROUTES.verificationPending}
        >
          Return to verification
        </Link>
      </AuthCard>
    );
  }

  return <Navigate to={AUTH_ROUTES.verificationFailed} replace />;
}
