import { AlertCircle, BadgeCheck, Clock3, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuthCard } from './AuthLayout';
import { AUTH_ROUTES } from '../constants/auth';

export type VerificationStatus = 'success' | 'failed' | 'expired';

const STATUS_CONTENT = {
  success: {
    Icon: BadgeCheck,
    label: 'EMAIL VERIFIED',
    heading: 'You’re all set.',
    description: 'Your email address is verified and your AlSera account is ready.',
    action: 'Continue to AlSera',
    to: '/',
  },
  failed: {
    Icon: AlertCircle,
    label: 'VERIFICATION NOT COMPLETE',
    heading: 'We couldn’t verify your email.',
    description:
      'The link may be invalid or already used. Request a fresh verification email to try again.',
    action: 'Return to verification',
    to: AUTH_ROUTES.verificationPending,
  },
  expired: {
    Icon: Clock3,
    label: 'LINK EXPIRED',
    heading: 'This link has expired.',
    description: 'For your security, verification links expire. Request a new email to continue.',
    action: 'Send a new verification email',
    to: AUTH_ROUTES.verificationPending,
  },
} as const;

export function EmailVerificationStatus({ status }: { status: VerificationStatus }) {
  const { Icon, label, heading, description, action, to } = STATUS_CONTENT[status];

  return (
    <AuthCard className="auth-verification-card" labelledBy="verification-status-heading">
      <span className={`auth-verification-emblem auth-verification-emblem--${status}`}>
        <Icon aria-hidden="true" />
      </span>
      <p className="auth-verification-kicker">{label}</p>
      <h1 id="verification-status-heading">{heading}</h1>
      <p className="auth-verification-description">{description}</p>
      <div className="auth-verification-assurance">
        <ShieldCheck aria-hidden="true" />
        <span>Your account security is our priority.</span>
      </div>
      <Link className="auth-button auth-button--primary auth-verification-action" to={to}>
        {action}
      </Link>
      {status !== 'success' && (
        <Link className="auth-verification-secondary" to={AUTH_ROUTES.login}>
          Back to sign in
        </Link>
      )}
    </AuthCard>
  );
}
