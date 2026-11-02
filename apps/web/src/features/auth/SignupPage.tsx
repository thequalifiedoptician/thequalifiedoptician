import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ShieldCheck, UserRoundPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '@/lib/supabase';
import { AUTH_ROUTES } from './constants/auth';
import {
  AuthCard,
  Checkbox,
  ErrorMessage,
  FormContainer,
  LoadingButton,
  PasswordInput,
  PasswordStrengthIndicator,
  SuccessMessage,
  TextInput,
} from './components';
import { signUpWithEmail } from './services/authService';
import { useAuth } from './hooks/useAuth';
import { toAuthServiceError } from './utils/authErrors';
import {
  validateConfirmPassword,
  validateEmail,
  validateName,
  validateSignupPassword,
} from './utils/validation';

type SignupErrors = {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
  form?: string;
};

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const fullNameRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const timer = setTimeout(() => navigate('/', { replace: true }), 650);
    return () => clearTimeout(timer);
  }, [isAuthenticated, navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMessage('');
    setErrors({});

    const validationErrors: SignupErrors = {};
    const nameResult = validateName(fullName);
    const emailResult = validateEmail(email);
    const passwordResult = validateSignupPassword(password);
    const confirmationResult = validateConfirmPassword(password, confirmPassword);

    if (!nameResult.valid) {
      validationErrors.fullName = nameResult.error;
    }
    if (!emailResult.valid) {
      validationErrors.email = emailResult.error;
    }
    if (!passwordResult.valid) {
      validationErrors.password = passwordResult.error;
    }
    if (!confirmationResult.valid) {
      validationErrors.confirmPassword = confirmationResult.error;
    }
    if (!acceptedTerms) {
      validationErrors.terms = 'Please accept the terms to create an account.';
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      if (validationErrors.fullName) {
        fullNameRef.current?.focus();
      } else if (validationErrors.email) {
        document.getElementById('signup-email')?.focus();
      } else if (validationErrors.password) {
        document.getElementById('signup-password')?.focus();
      } else if (validationErrors.confirmPassword) {
        document.getElementById('signup-confirm-password')?.focus();
      } else {
        document.getElementById('signup-terms')?.focus();
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const client = await getSupabaseClient();
      const result = await signUpWithEmail(client, fullName, email, password);
      setSuccessMessage(
        result.session
          ? 'Your account is ready. Taking you to AlSera…'
          : `Account created. Check ${email.trim()} for a verification link to finish setting up your account.`,
      );
    } catch (error) {
      setErrors({ form: toAuthServiceError(error).message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard className="auth-login-card auth-signup-card" labelledBy="signup-heading">
      {successMessage && (
        <div className="auth-login-toast" role="status" aria-live="polite">
          <SuccessMessage>{successMessage}</SuccessMessage>
        </div>
      )}
      <aside className="auth-login-aside" aria-label="AlSera account benefits">
        <span className="auth-login-aside-label">A MORE PERSONAL EXPERIENCE</span>
        <span className="auth-login-emblem" aria-hidden="true">
          <UserRoundPlus />
        </span>
        <p className="auth-login-aside-kicker">A PLACE FOR THE CONSIDERED</p>
        <h1>
          Make room for
          <br />
          <em>the good.</em>
        </h1>
        <p className="auth-login-aside-copy">
          Create your AlSera account to keep your favorites and make every visit feel personal.
        </p>
        <div className="auth-login-assurance">
          <ShieldCheck aria-hidden="true" />
          <span>Your details stay private and secure</span>
        </div>
        <span className="auth-login-orbit auth-login-orbit--one" aria-hidden="true" />
        <span className="auth-login-orbit auth-login-orbit--two" aria-hidden="true" />
      </aside>

      <div className="auth-login-content auth-signup-content">
        <div className="auth-login-heading">
          <p>YOUR ALSERA ACCOUNT</p>
          <h2 id="signup-heading">Create an account</h2>
          <span>A few details to make your experience your own.</span>
        </div>

        <FormContainer
          className="auth-login-form auth-signup-form"
          ariaLabel="Create an AlSera account"
          onSubmit={handleSubmit}
          noValidate
        >
          <TextInput
            inputRef={fullNameRef}
            id="signup-full-name"
            label="Full name"
            placeholder="Your name"
            autoComplete="name"
            autoFocus
            maxLength={80}
            required
            value={fullName}
            onChange={(event) => {
              setFullName(event.target.value);
              setErrors((current) => ({ ...current, fullName: undefined, form: undefined }));
            }}
            onBlur={() => {
              if (fullName) {
                const result = validateName(fullName);
                setErrors((current) => ({ ...current, fullName: result.error }));
              }
            }}
            error={errors.fullName}
          />
          <TextInput
            id="signup-email"
            label="Email address"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
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
          <div className="auth-signup-password-group">
            <PasswordInput
              id="signup-password"
              label="Password"
              placeholder="Create a secure password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
              ariaDescribedBy="signup-password-strength"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setErrors((current) => ({ ...current, password: undefined, form: undefined }));
              }}
              onBlur={() => {
                if (password) {
                  const result = validateSignupPassword(password);
                  setErrors((current) => ({ ...current, password: result.error }));
                }
              }}
              error={errors.password}
            />
            <PasswordStrengthIndicator password={password} id="signup-password-strength" />
          </div>
          <PasswordInput
            id="signup-confirm-password"
            label="Confirm password"
            placeholder="Enter your password again"
            autoComplete="new-password"
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

          <div className="auth-signup-terms-wrap">
            <Checkbox
              id="signup-terms"
              label="I agree to the Terms & Conditions and Privacy Policy."
              checked={acceptedTerms}
              required
              aria-invalid={Boolean(errors.terms)}
              ariaDescribedBy={errors.terms ? 'signup-terms-error' : undefined}
              className={`auth-signup-terms${errors.terms ? ' auth-signup-terms--error' : ''}`}
              onChange={(event) => {
                setAcceptedTerms(event.target.checked);
                setErrors((current) => ({ ...current, terms: undefined, form: undefined }));
              }}
            />
            {errors.terms && (
              <span
                className="auth-field-message auth-field-message--error"
                id="signup-terms-error"
              >
                {errors.terms}
              </span>
            )}
          </div>

          {errors.form && <ErrorMessage>{errors.form}</ErrorMessage>}
          <LoadingButton
            className="auth-login-submit"
            type="submit"
            isLoading={isSubmitting}
            loadingLabel="Creating account"
            disabled={Boolean(successMessage)}
          >
            Create account
          </LoadingButton>
        </FormContainer>

        <p className="auth-signup-login-link">
          Already have an account? <Link to={AUTH_ROUTES.login}>Sign in</Link>
        </p>
        <p className="auth-login-security-note">
          We’ll send you an email to verify your address and protect your account.
        </p>
      </div>
    </AuthCard>
  );
}
