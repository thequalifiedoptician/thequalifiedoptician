import { useRef, useState, type FormEvent } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { getSupabaseClient } from '@/lib/supabase';
import {
  AuthCard,
  ErrorMessage,
  FormContainer,
  LoadingButton,
  PasswordInput,
  PasswordStrengthIndicator,
  SuccessMessage,
} from './components';
import { AUTH_ROUTES } from './constants/auth';
import { useAuth } from './hooks/useAuth';
import { updatePassword } from './services/authService';
import { toAuthServiceError } from './utils/authErrors';
import { validateConfirmPassword, validateSignupPassword } from './utils/validation';

type ResetPasswordErrors = {
  password?: string;
  confirmPassword?: string;
  form?: string;
};

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<ResetPasswordErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const { search } = useLocation();
  const {
    status,
    isAuthenticated,
    isPasswordRecovery,
    clearPasswordRecovery,
    error: authError,
  } = useAuth();
  const recoveryRedirect = new URLSearchParams(search).get('flow') === 'password-reset';
  const hasRecoverySession = isAuthenticated && (isPasswordRecovery || recoveryRedirect);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});

    const passwordResult = validateSignupPassword(password);
    const confirmationResult = validateConfirmPassword(password, confirmPassword);
    const validationErrors: ResetPasswordErrors = {};

    if (!passwordResult.valid) {
      validationErrors.password = passwordResult.error;
    }
    if (!confirmationResult.valid) {
      validationErrors.confirmPassword = confirmationResult.error;
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      if (validationErrors.password) {
        passwordRef.current?.focus();
      } else {
        document.getElementById('reset-confirm-password')?.focus();
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const client = await getSupabaseClient();
      await updatePassword(client, password);
      clearPasswordRecovery();
      setIsComplete(true);
    } catch (error) {
      setErrors({ form: toAuthServiceError(error).message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      className="auth-login-card auth-password-flow-card"
      labelledBy="reset-password-heading"
    >
      {isComplete && (
        <div className="auth-login-toast" role="status" aria-live="polite">
          <SuccessMessage>Your password has been updated securely.</SuccessMessage>
        </div>
      )}
      <aside className="auth-login-aside" aria-label="Secure password reset">
        <span className="auth-login-aside-label">A MORE SECURE EXPERIENCE</span>
        <span className="auth-login-emblem" aria-hidden="true">
          <KeyRound />
        </span>
        <p className="auth-login-aside-kicker">A FRESH START</p>
        <h1>
          Make it
          <br />
          <em>yours again.</em>
        </h1>
        <p className="auth-login-aside-copy">
          Choose a strong password to keep your AlSera account protected.
        </p>
        <div className="auth-login-assurance">
          <ShieldCheck aria-hidden="true" />
          <span>Your password is never shared</span>
        </div>
        <span className="auth-login-orbit auth-login-orbit--one" aria-hidden="true" />
        <span className="auth-login-orbit auth-login-orbit--two" aria-hidden="true" />
      </aside>

      <div className="auth-login-content auth-password-flow-content">
        {status === 'initializing' ? (
          <div className="auth-password-flow-status" role="status" aria-live="polite">
            <span className="auth-button-spinner" aria-hidden="true" />
            <h2 id="reset-password-heading">Verifying your link</h2>
            <p>Please wait while we securely verify your password reset link.</p>
          </div>
        ) : isComplete ? (
          <div className="auth-password-flow-status" aria-labelledby="reset-password-heading">
            <div className="auth-login-heading">
              <p>ALL SET</p>
              <h2 id="reset-password-heading">Password updated</h2>
              <span>Your new password is ready to use.</span>
            </div>
            <Link className="auth-button auth-button--primary auth-login-submit" to="/">
              Continue to AlSera
            </Link>
          </div>
        ) : !hasRecoverySession ? (
          <div className="auth-password-flow-status" aria-labelledby="reset-password-heading">
            <div className="auth-login-heading">
              <p>ACCOUNT RECOVERY</p>
              <h2 id="reset-password-heading">
                {status === 'unavailable' || status === 'error'
                  ? 'Reset link unavailable'
                  : 'This link can’t be used'}
              </h2>
              <span>
                {status === 'unavailable' || status === 'error'
                  ? 'We could not verify the reset link. Request a new link or try again later.'
                  : 'It may have expired or already been used. Request a new link to continue.'}
              </span>
            </div>
            {(status === 'unavailable' || status === 'error') && (
              <ErrorMessage>{authError ?? 'We could not verify your reset link.'}</ErrorMessage>
            )}
            <Link
              className="auth-button auth-button--primary auth-login-submit"
              to={AUTH_ROUTES.forgotPassword}
            >
              Request a new reset link
            </Link>
            <p className="auth-signup-login-link auth-password-flow-link">
              <Link to={AUTH_ROUTES.login}>Back to sign in</Link>
            </p>
          </div>
        ) : (
          <>
            <div className="auth-login-heading">
              <p>ACCOUNT RECOVERY</p>
              <h2 id="reset-password-heading">Create a new password</h2>
              <span>Use at least 8 characters and meet each security requirement.</span>
            </div>

            <FormContainer
              className="auth-login-form auth-password-flow-form"
              ariaLabel="Set a new password"
              onSubmit={handleSubmit}
              noValidate
            >
              <div className="auth-signup-password-group">
                <PasswordInput
                  inputRef={passwordRef}
                  id="reset-password"
                  label="New password"
                  placeholder="Create a secure password"
                  autoComplete="new-password"
                  autoFocus
                  minLength={8}
                  maxLength={128}
                  required
                  ariaDescribedBy="reset-password-strength"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setErrors((current) => ({
                      ...current,
                      password: undefined,
                      confirmPassword: undefined,
                      form: undefined,
                    }));
                  }}
                  onBlur={() => {
                    if (password) {
                      const result = validateSignupPassword(password);
                      setErrors((current) => ({ ...current, password: result.error }));
                    }
                  }}
                  error={errors.password}
                />
                <PasswordStrengthIndicator password={password} id="reset-password-strength" />
              </div>

              <PasswordInput
                id="reset-confirm-password"
                label="Confirm new password"
                placeholder="Enter your password again"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setErrors((current) => ({
                    ...current,
                    confirmPassword: undefined,
                    form: undefined,
                  }));
                }}
                onBlur={() => {
                  if (confirmPassword) {
                    const result = validateConfirmPassword(password, confirmPassword);
                    setErrors((current) => ({ ...current, confirmPassword: result.error }));
                  }
                }}
                error={errors.confirmPassword}
              />

              {errors.form && <ErrorMessage>{errors.form}</ErrorMessage>}
              <LoadingButton
                className="auth-login-submit"
                type="submit"
                isLoading={isSubmitting}
                loadingLabel="Updating password"
              >
                Update password
              </LoadingButton>
            </FormContainer>
            <p className="auth-signup-login-link auth-password-flow-link">
              <Link to={AUTH_ROUTES.login}>Back to sign in</Link>
            </p>
          </>
        )}
      </div>
    </AuthCard>
  );
}
