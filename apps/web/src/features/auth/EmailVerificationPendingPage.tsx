import { useEffect, useState, type FormEvent } from 'react';
import { MailCheck, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { getSupabaseClient } from '@/lib/supabase';
import {
  AuthCard,
  ErrorMessage,
  FormContainer,
  LoadingButton,
  SuccessMessage,
  TextInput,
} from './components';
import { AUTH_ROUTES } from './constants/auth';
import { resendSignupVerification } from './services/authService';
import { toAuthServiceError } from './utils/authErrors';
import { getSafeAuthReturnPath } from './utils/authNavigation';
import { validateEmail } from './utils/validation';

const RESEND_COOLDOWN_SECONDS = 60;

type VerificationNavigationState = {
  email?: unknown;
  from?: unknown;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export default function EmailVerificationPendingPage() {
  const location = useLocation();
  const navigationState = location.state as VerificationNavigationState | null;
  const redirectTo = getSafeAuthReturnPath(navigationState?.from);
  const [email, setEmail] = useState(
    isNonEmptyString(navigationState?.email) ? navigationState.email.trim() : '',
  );
  const [emailError, setEmailError] = useState('');
  const [formError, setFormError] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCooldown((remaining) => Math.max(remaining - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function handleResend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailError('');
    setFormError('');
    setResendMessage('');

    const emailResult = validateEmail(email);
    if (!emailResult.valid) {
      setEmailError(emailResult.error ?? 'Enter a valid email address.');
      document.getElementById('verification-email')?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const client = await getSupabaseClient();
      await resendSignupVerification(client, email);
      setResendMessage(
        'If this address needs verification, a fresh link is on its way. Check your inbox and spam folder.',
      );
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (requestError) {
      const authError = toAuthServiceError(requestError);
      setFormError(authError.message);
      if (authError.code === 'rate-limited') {
        setCooldown(RESEND_COOLDOWN_SECONDS);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {resendMessage && (
        <div className="auth-login-toast" role="status" aria-live="polite">
          <SuccessMessage>{resendMessage}</SuccessMessage>
        </div>
      )}
      <AuthCard
        className="auth-verification-pending-card"
        labelledBy="verification-pending-heading"
      >
        <span className="auth-verification-pending-icon" aria-hidden="true">
          <MailCheck />
        </span>
        <p className="auth-verification-kicker">ONE LAST STEP</p>
        <h1 id="verification-pending-heading">Check your inbox.</h1>
        <p className="auth-verification-description">
          We’ve sent a verification link to your email. Open it to confirm your address and finish
          setting up your AlSera account.
        </p>
        <div className="auth-verification-instructions">
          <ShieldCheck aria-hidden="true" />
          <p>
            Don’t see it? Check your spam or promotions folder. For your security, the link will
            expire.
          </p>
        </div>

        <FormContainer
          className="auth-verification-resend-form"
          ariaLabel="Resend verification email"
          onSubmit={handleResend}
          noValidate
        >
          <TextInput
            id="verification-email"
            label="Email address"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            maxLength={254}
            required
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setEmailError('');
              setFormError('');
              setResendMessage('');
            }}
            error={emailError}
          />
          {!resendMessage && formError && <ErrorMessage>{formError}</ErrorMessage>}
          <LoadingButton
            className="auth-login-submit"
            type="submit"
            isLoading={isSubmitting}
            loadingLabel="Sending verification email"
            disabled={cooldown > 0}
          >
            {cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend verification email'}
          </LoadingButton>
        </FormContainer>
        <p className="auth-verification-pending-footer">
          Already verified?{' '}
          <Link to={AUTH_ROUTES.login} state={{ from: redirectTo }}>
            Return to sign in
          </Link>
        </p>
      </AuthCard>
    </>
  );
}
