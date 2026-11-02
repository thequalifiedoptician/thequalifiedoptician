import { Check, Eye, EyeOff, Info, LoaderCircle, X } from 'lucide-react';
import {
  useId,
  useState,
  type ButtonHTMLAttributes,
  type FormEventHandler,
  type InputHTMLAttributes,
  type Ref,
  type ReactNode,
} from 'react';

export type AuthButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';

type AuthButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AuthButtonVariant;
  children: ReactNode;
};

export function AuthButton({
  variant = 'primary',
  className = '',
  children,
  type = 'button',
  ...props
}: AuthButtonProps) {
  return (
    <button
      className={`auth-button auth-button--${variant}${className ? ` ${className}` : ''}`}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

type LoadingButtonProps = AuthButtonProps & {
  isLoading?: boolean;
  loadingLabel?: string;
};

export function LoadingButton({
  isLoading = false,
  loadingLabel = 'Loading',
  children,
  disabled,
  ...props
}: LoadingButtonProps) {
  return (
    <AuthButton disabled={disabled || isLoading} aria-busy={isLoading} {...props}>
      {isLoading && (
        <LoaderCircle className="auth-button-spinner" aria-hidden="true" focusable="false" />
      )}
      <span>{isLoading ? loadingLabel : children}</span>
    </AuthButton>
  );
}

export type SocialProvider = 'Google' | 'GitHub' | 'Facebook';

type SocialButtonProps = {
  provider: SocialProvider;
  onClick?: () => void;
  disabled?: boolean;
};

const socialProviderText: Record<SocialProvider, string> = {
  Google: 'G',
  GitHub: 'GH',
  Facebook: 'f',
};

export function SocialButton({ provider, onClick, disabled = false }: SocialButtonProps) {
  return (
    <button
      className={`auth-social-button auth-social-button--${provider.toLowerCase()}`}
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      aria-label={`Continue with ${provider}`}
    >
      <span className="auth-social-mark" aria-hidden="true">
        <span>{socialProviderText[provider]}</span>
      </span>
      <span>{provider}</span>
    </button>
  );
}

type FieldState = 'default' | 'error' | 'success';

type AuthFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> & {
  label: string;
  hint?: string;
  error?: string;
  state?: FieldState;
  inputType?: 'text' | 'email' | 'search' | 'password';
  trailingControl?: ReactNode;
  inputRef?: Ref<HTMLInputElement>;
  ariaDescribedBy?: string;
};

function AuthField({
  label,
  hint,
  error,
  state = 'default',
  inputType = 'text',
  trailingControl,
  inputRef,
  ariaDescribedBy,
  id,
  className = '',
  disabled,
  ...inputProps
}: AuthFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const message = error ?? hint;
  const messageId = message ? `${inputId}-message` : undefined;
  const describedBy = [messageId, ariaDescribedBy].filter(Boolean).join(' ') || undefined;
  const fieldState = error ? 'error' : state;

  return (
    <div className={`auth-field${className ? ` ${className}` : ''}`}>
      <label className="auth-field-label" htmlFor={inputId}>
        {label}
        {inputProps.required && (
          <>
            <span className="auth-required-marker" aria-hidden="true">
              *
            </span>
            <span className="visually-hidden"> (required)</span>
          </>
        )}
      </label>
      <span
        className={`auth-input-shell auth-input-shell--${fieldState}${disabled ? ' is-disabled' : ''}`}
      >
        <input
          {...inputProps}
          ref={inputRef}
          id={inputId}
          type={inputType}
          disabled={disabled}
          aria-invalid={
            fieldState === 'error' ? true : fieldState === 'success' ? false : undefined
          }
          aria-describedby={describedBy}
        />
        {trailingControl ??
          (fieldState === 'success' && (
            <Check className="auth-input-status auth-input-status--success" aria-hidden="true" />
          ))}
      </span>
      {message && (
        <span
          className={`auth-field-message${error ? ' auth-field-message--error' : ''}`}
          id={messageId}
          role={error ? 'alert' : undefined}
        >
          {error && <Info aria-hidden="true" />}
          {message}
        </span>
      )}
    </div>
  );
}

type TextInputProps = Omit<AuthFieldProps, 'inputType' | 'trailingControl'> & {
  type?: 'text' | 'email' | 'search';
};

export function TextInput({ type = 'text', ...props }: TextInputProps) {
  return <AuthField {...props} inputType={type} />;
}

type PasswordInputProps = Omit<AuthFieldProps, 'inputType' | 'trailingControl'>;

export function PasswordInput(props: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);
  const generatedId = useId();
  const fieldId = props.id ?? generatedId;

  return (
    <AuthField
      {...props}
      id={fieldId}
      inputType={isVisible ? 'text' : 'password'}
      trailingControl={
        <button
          className="auth-password-toggle"
          type="button"
          aria-label={isVisible ? 'Hide password' : 'Show password'}
          aria-pressed={isVisible}
          aria-controls={fieldId}
          onClick={() => setIsVisible((visible) => !visible)}
          disabled={props.disabled}
        >
          {isVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      }
    />
  );
}

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> & {
  label: string;
  description?: string;
  ariaDescribedBy?: string;
};

export function Checkbox({
  label,
  description,
  ariaDescribedBy,
  id,
  className = '',
  ...inputProps
}: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const describedBy = [descriptionId, ariaDescribedBy].filter(Boolean).join(' ') || undefined;

  return (
    <label className={`auth-checkbox${className ? ` ${className}` : ''}`} htmlFor={inputId}>
      <input {...inputProps} id={inputId} type="checkbox" aria-describedby={describedBy} />
      <span className="auth-checkbox-control" aria-hidden="true">
        <Check />
      </span>
      <span className="auth-checkbox-copy">
        <span className="auth-checkbox-label">{label}</span>
        {description && (
          <span className="auth-checkbox-description" id={descriptionId}>
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

type RememberMeProps = Omit<CheckboxProps, 'label'> & {
  label?: string;
};

export function RememberMe({ label = 'Remember me', ...props }: RememberMeProps) {
  return <Checkbox {...props} label={label} />;
}

type AuthMessageProps = {
  children: ReactNode;
  title?: string;
};

export function ErrorMessage({ children, title }: AuthMessageProps) {
  return (
    <div className="auth-message auth-message--error" role="alert">
      <X aria-hidden="true" />
      <span>
        {title && <strong>{title}</strong>}
        <span>{children}</span>
      </span>
    </div>
  );
}

export function SuccessMessage({ children, title }: AuthMessageProps) {
  return (
    <div className="auth-message auth-message--success" role="status" aria-live="polite">
      <Check aria-hidden="true" />
      <span>
        {title && <strong>{title}</strong>}
        <span>{children}</span>
      </span>
    </div>
  );
}

export function AuthDivider({ label = 'or continue with' }: { label?: string }) {
  return (
    <div className="auth-divider" role="separator" aria-label={label}>
      <span />
      <span>{label}</span>
      <span />
    </div>
  );
}

export function FormContainer({
  children,
  onSubmit,
  className = '',
  ariaLabel,
  noValidate = false,
}: {
  children: ReactNode;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  className?: string;
  ariaLabel?: string;
  noValidate?: boolean;
}) {
  return (
    <form
      className={`auth-form-container${className ? ` ${className}` : ''}`}
      onSubmit={onSubmit}
      aria-label={ariaLabel}
      noValidate={noValidate}
    >
      {children}
    </form>
  );
}
