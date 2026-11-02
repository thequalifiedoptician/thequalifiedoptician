import { useEffect, useRef, useState, type FormEvent } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase';
import {
  AuthCard,
  AuthDivider,
  ErrorMessage,
  FormContainer,
  LoadingButton,
  PasswordInput,
  RememberMe,
  SocialButton,
  SuccessMessage,
  TextInput,
} from './components';
import { AUTH_OAUTH_RETURN_TO_KEY, AUTH_ROUTES } from './constants/auth';
import { signInWithEmail, signInWithProvider } from './services/authService';
import type { Database } from './types/database';
import { useAuth } from './hooks/useAuth';
import { toAuthServiceError } from './utils/authErrors';
import { validateEmail, validatePassword } from './utils/validation';

type LoginErrors = {
  email?: string;
  password?: string;
  form?: string;
};

type LoginNavigationState = {
  from?: unknown;
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeProvider, setActiveProvider] = useState<'google' | 'github' | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const emailRef = useRef<HTMLInputElement>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [oauthReturnTo] = useState(() =>
    typeof window === 'undefined' ? null : window.sessionStorage.getItem(AUTH_OAUTH_RETURN_TO_KEY),
  );
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const navigationState = location.state as LoginNavigationState | null;
  const redirectTo = safeReturnPath(navigationState?.from ?? oauthReturnTo);
  const visibleSuccessMessage = isAuthenticated
    ? 'You are signed in. Taking you back now.'
    : successMessage;

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    successTimer.current = setTimeout(() => {
      window.sessionStorage.removeItem(AUTH_OAUTH_RETURN_TO_KEY);
      navigate(redirectTo, { replace: true });
    }, 550);

    return () => {
      if (successTimer.current) {
        clearTimeout(successTimer.current);
      }
    };
  }, [isAuthenticated, navigate, redirectTo]);

  useEffect(
    () => () => {
      if (successTimer.current) {
        clearTimeout(successTimer.current);
      }
    },
    [],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMessage('');
    setErrors({});

    const emailResult = validateEmail(email);
    const passwordResult = validatePassword(password);
    const validationErrors: LoginErrors = {};

    if (!emailResult.valid) {
      validationErrors.email = emailResult.error;
    }
    if (!passwordResult.valid) {
      validationErrors.password = passwordResult.error;
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      if (validationErrors.email) {
        emailRef.current?.focus();
      } else {
        document.getElementById('login-password')?.focus();
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const client = await getSupabaseClient();
      await signInWithEmail(client, email, password, rememberMe);
      window.sessionStorage.removeItem(AUTH_OAUTH_RETURN_TO_KEY);
      setSuccessMessage('You are signed in. Taking you back now.');
    } catch (error) {
      setErrors({ form: toAuthServiceError(error).message });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleProviderSignIn(provider: 'google' | 'github') {
    setErrors({});
    setSuccessMessage('');
    setActiveProvider(provider);

    try {
      const client: SupabaseClient<Database> = await getSupabaseClient();
      await signInWithProvider(client, provider, rememberMe, redirectTo);
    } catch (error) {
      window.sessionStorage.removeItem(AUTH_OAUTH_RETURN_TO_KEY);
      setErrors({ form: toAuthServiceError(error).message });
      setActiveProvider(null);
    }
  }

  return (
    <AuthCard className="auth-login-card" labelledBy="login-heading">
      {visibleSuccessMessage && (
        <div className="auth-login-toast" role="status" aria-live="polite">
          <SuccessMessage>{visibleSuccessMessage}</SuccessMessage>
        </div>
      )}
      <aside className="auth-login-aside" aria-label="AlSera account benefits">
        <span className="auth-login-aside-label">A MORE PERSONAL EXPERIENCE</span>
        <span className="auth-login-emblem" aria-hidden="true">
          <KeyRound />
        </span>
        <p className="auth-login-aside-kicker">WELCOME TO ALSERA</p>
        <h1>
          Good to have
          <br />
          you <em>back.</em>
        </h1>
        <p className="auth-login-aside-copy">
          Your considered collection, saved for whenever you return.
        </p>
        <div className="auth-login-assurance">
          <ShieldCheck aria-hidden="true" />
          <span>Private and secure by design</span>
        </div>
        <span className="auth-login-orbit auth-login-orbit--one" aria-hidden="true" />
        <span className="auth-login-orbit auth-login-orbit--two" aria-hidden="true" />
      </aside>

      <div className="auth-login-content">
        <div className="auth-login-heading">
          <p>YOUR ALSERA ACCOUNT</p>
          <h2 id="login-heading">Sign in</h2>
          <span>Welcome back. Enter your details to continue.</span>
        </div>

        <FormContainer
          className="auth-login-form"
          ariaLabel="Sign in to AlSera"
          onSubmit={handleSubmit}
          noValidate
        >
          <TextInput
            inputRef={emailRef}
            id="login-email"
            label="Email address"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
            maxLength={254}
            required
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
          <PasswordInput
            id="login-password"
            label="Password"
            placeholder="Enter your password"
            autoComplete="current-password"
            minLength={8}
            maxLength={128}
            required
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setErrors((current) => ({ ...current, password: undefined, form: undefined }));
            }}
            onBlur={() => {
              if (password) {
                const result = validatePassword(password);
                setErrors((current) => ({ ...current, password: result.error }));
              }
            }}
            error={errors.password}
          />

          <div className="auth-login-options">
            <RememberMe
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              description="Keep me signed in on this device"
            />
            <Link className="auth-login-text-link" to={AUTH_ROUTES.forgotPassword}>
              Forgot password?
            </Link>
          </div>

          {errors.form && <ErrorMessage>{errors.form}</ErrorMessage>}
          <LoadingButton
            className="auth-login-submit"
            type="submit"
            isLoading={isSubmitting}
            loadingLabel="Signing in"
            disabled={Boolean(activeProvider)}
          >
            Sign in to your account
          </LoadingButton>
        </FormContainer>

        <AuthDivider label="or continue with" />
        <div className="auth-login-social">
          <SocialButton
            provider="Google"
            onClick={() => void handleProviderSignIn('google')}
            disabled={isSubmitting || activeProvider !== null}
          />
          <SocialButton
            provider="GitHub"
            onClick={() => void handleProviderSignIn('github')}
            disabled={isSubmitting || activeProvider !== null}
          />
        </div>
        {activeProvider && (
          <p className="auth-login-provider-status" role="status" aria-live="polite">
            Connecting to {activeProvider === 'google' ? 'Google' : 'GitHub'}…
          </p>
        )}
        <p className="auth-signup-login-link">
          New to AlSera? <Link to={AUTH_ROUTES.signup}>Create an account</Link>
        </p>
        <p className="auth-login-security-note">
          Sign-in is protected with encrypted connections and secure sessions.
        </p>
      </div>
    </AuthCard>
  );
}

function safeReturnPath(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return '/';
  }

  return value;
}
