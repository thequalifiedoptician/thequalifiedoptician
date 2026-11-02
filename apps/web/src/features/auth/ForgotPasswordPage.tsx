import { useRef, useState, type FormEvent } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
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
import { requestPasswordReset } from './services/authService';
import { toAuthServiceError } from './utils/authErrors';
import { validateEmail } from './utils/validation';

type ForgotPasswordErrors = {
  email?: string;
  form?: string;
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [errors, setErrors] = useState<ForgotPasswordErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSentTo('');
    setErrors({});

    const emailResult = validateEmail(email);
    if (!emailResult.valid) {
      setErrors({ email: emailResult.error });
      emailRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const client = await getSupabaseClient();
      await requestPasswordReset(client, email);
      setSentTo(email.trim());
    } catch (error) {
      setErrors({ form: toAuthServiceError(error).message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      className="auth-login-card auth-password-flow-card"
      labelledBy="forgot-password-heading"
    >
      {sentTo && (
        <div className="auth-login-toast" role="status" aria-live="polite">
          <SuccessMessage>
            If an account is associated with {sentTo}, a secure reset link is on its way.
          </SuccessMessage>
        </div>
      )}
      <aside className="auth-login-aside" aria-label="Secure account recovery">
        <span className="auth-login-aside-label">A MORE SECURE EXPERIENCE</span>
        <span className="auth-login-emblem" aria-hidden="true">
          <KeyRound />
        </span>
        <p className="auth-login-aside-kicker">YOUR ACCOUNT, PROTECTED</p>
        <h1>
          Find your way
          <br />
          <em>back.</em>
        </h1>
        <p className="auth-login-aside-copy">
          We’ll send a secure reset link to the address associated with your account.
        </p>
        <div className="auth-login-assurance">
          <ShieldCheck aria-hidden="true" />
          <span>Reset links expire for your security</span>
        </div>
        <span className="auth-login-orbit auth-login-orbit--one" aria-hidden="true" />
        <span className="auth-login-orbit auth-login-orbit--two" aria-hidden="true" />
      </aside>

      <div className="auth-login-content auth-password-flow-content">
        <div className="auth-login-heading">
          <p>ACCOUNT RECOVERY</p>
          <h2 id="forgot-password-heading">Forgot your password?</h2>
          <span>Enter your email and we’ll send you a link to reset it.</span>
        </div>

        <FormContainer
          className="auth-login-form auth-password-flow-form"
          ariaLabel="Request a password reset"
          onSubmit={handleSubmit}
          noValidate
        >
          <TextInput
            inputRef={emailRef}
            id="forgot-password-email"
            label="Email address"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
            maxLength={254}
            required
            disabled={Boolean(sentTo)}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setErrors((current) => ({ ...current, email: undefined, form: undefined }));
            }}
            onBlur={() => {
              if (email) {
                const result = validateEmail(email);
                setErrors((current) => ({ ...current, email: result.error }));
              }
            }}
            error={errors.email}
          />

          {errors.form && <ErrorMessage>{errors.form}</ErrorMessage>}

          <LoadingButton
            className="auth-login-submit"
            type="submit"
            isLoading={isSubmitting}
            loadingLabel="Sending reset link"
            disabled={Boolean(sentTo)}
          >
            Send reset link
          </LoadingButton>
        </FormContainer>

        <p className="auth-signup-login-link auth-password-flow-link">
          Remembered your password? <Link to={AUTH_ROUTES.login}>Back to sign in</Link>
        </p>
      </div>
    </AuthCard>
  );
}
