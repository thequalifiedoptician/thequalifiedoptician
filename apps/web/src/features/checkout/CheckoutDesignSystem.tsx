import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  CreditCard,
  LockKeyhole,
  PackageCheck,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MouseEventHandler, ReactNode } from 'react';

export type CheckoutStepId = 'delivery' | 'payment' | 'review';

const steps: { id: CheckoutStepId; label: string }[] = [
  { id: 'delivery', label: 'Delivery' },
  { id: 'payment', label: 'Payment' },
  { id: 'review', label: 'Review' },
];

export function CheckoutFrame({ children }: { children: ReactNode }) {
  return (
    <div className="checkout-page">
      <a className="checkout-skip-link" href="#checkout-content">
        Skip to checkout
      </a>
      <header className="checkout-header">
        <Link className="checkout-wordmark" to="/" aria-label="AlSera home">
          <span className="checkout-monogram">A</span>
          <span>
            <strong>AlSera</strong>
            <small>Considered living</small>
          </span>
        </Link>
        <div className="checkout-header-center">
          <PackageCheck size={15} aria-hidden="true" />
          <span>Secure checkout</span>
        </div>
        <Link className="checkout-header-help" to="/cart">
          <ArrowLeft size={15} aria-hidden="true" />
          Back to bag
        </Link>
      </header>
      {children}
      <footer className="checkout-footer">
        <span>AlSera · Thoughtfully chosen, carefully delivered.</span>
        <span>
          <ShieldCheck size={14} aria-hidden="true" />
          Safepay hosted checkout · status pending verification
        </span>
      </footer>
    </div>
  );
}

export function CheckoutStepper({
  currentStep,
  onStepSelect,
}: {
  currentStep: CheckoutStepId;
  onStepSelect: (step: CheckoutStepId) => void;
}) {
  const currentIndex = steps.findIndex((step) => step.id === currentStep);
  return (
    <nav className="checkout-stepper" aria-label="Checkout progress">
      <ol>
        {steps.map((step, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isAvailable = index <= currentIndex;
          return (
            <li
              className={[
                'checkout-step',
                isCurrent ? 'is-current' : '',
                isComplete ? 'is-complete' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              key={step.id}
            >
              {index > 0 && <span className="checkout-step-connector" aria-hidden="true" />}
              <button
                type="button"
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`${step.label}${isComplete ? ', complete' : isCurrent ? ', current step' : ''}`}
                disabled={!isAvailable}
                onClick={() => onStepSelect(step.id)}
              >
                <span className="checkout-step-number">
                  {isComplete ? <Check size={14} aria-hidden="true" /> : `0${index + 1}`}
                </span>
                <span className="checkout-step-label">{step.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function CheckoutSection({
  number,
  icon,
  eyebrow,
  title,
  description,
  children,
}: {
  number: string;
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="checkout-section">
      <div className="checkout-section-heading">
        <span className="checkout-section-icon" aria-hidden="true">
          {icon}
        </span>
        <div>
          <p className="checkout-eyebrow">
            <span>{number}</span> {eyebrow}
          </p>
          <h2>{title}</h2>
          {description && <p className="checkout-section-description">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export function CheckoutCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`checkout-card${className ? ` ${className}` : ''}`}>{children}</div>;
}

export function CheckoutField({
  id,
  label,
  hint,
  children,
  className = '',
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`checkout-field${className ? ` ${className}` : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <small>{hint}</small>}
    </div>
  );
}

export function CheckoutNotice({
  tone,
  title,
  children,
}: {
  tone: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  children: ReactNode;
}) {
  const Icon =
    tone === 'success' ? Check : tone === 'error' || tone === 'warning' ? CircleAlert : ShieldCheck;
  return (
    <div
      className={`checkout-notice checkout-notice--${tone}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <Icon size={18} aria-hidden="true" />
      <div>
        {title && <strong>{title}</strong>}
        <p>{children}</p>
      </div>
    </div>
  );
}

export function CheckoutButton({
  children,
  variant = 'primary',
  type = 'button',
  disabled = false,
  onClick,
}: {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'quiet';
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <button
      className={`checkout-button checkout-button--${variant}`}
      type={type}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function CheckoutTrustBadges() {
  return (
    <ul className="checkout-trust-list" aria-label="Checkout assurances">
      <li>
        <LockKeyhole size={15} aria-hidden="true" />
        <span>Safepay hosted checkout</span>
      </li>
      <li>
        <PackageCheck size={15} aria-hidden="true" />
        <span>Delivery details first</span>
      </li>
      <li>
        <CreditCard size={15} aria-hidden="true" />
        <span>Stock checked at order</span>
      </li>
    </ul>
  );
}

export function CheckoutLoadingState() {
  return (
    <div className="checkout-loading" role="status" aria-busy="true">
      <span className="checkout-loading-orb" />
      <div>
        <strong>Preparing your checkout</strong>
        <p>Gathering the details for your bag.</p>
      </div>
      <div className="checkout-loading-lines" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

export function CheckoutEmptyState() {
  return (
    <div className="checkout-state-card">
      <span className="checkout-state-icon">
        <Truck size={23} aria-hidden="true" />
      </span>
      <p className="checkout-eyebrow">A fresh start</p>
      <h2>Your bag is waiting for something lovely.</h2>
      <p>Choose a few considered pieces, and they’ll be waiting here when you’re ready.</p>
      <Link className="checkout-button checkout-button--primary" to="/shop">
        Explore the collection <ArrowRight size={16} aria-hidden="true" />
      </Link>
      <Link className="checkout-state-back" to="/cart">
        Return to your bag
      </Link>
    </div>
  );
}

export function CheckoutErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="checkout-state-card checkout-state-card--error">
      <span className="checkout-state-icon">
        <CircleAlert size={23} aria-hidden="true" />
      </span>
      <p className="checkout-eyebrow">A moment, please</p>
      <h2>We couldn’t prepare your checkout.</h2>
      <p>{message}</p>
      <CheckoutButton onClick={onRetry}>Try again</CheckoutButton>
      <Link className="checkout-state-back" to="/cart">
        <ArrowLeft size={14} aria-hidden="true" /> Return to your bag
      </Link>
    </div>
  );
}
