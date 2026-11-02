import { BadgeCheck } from 'lucide-react';
import {
  getPasswordRequirements,
  getPasswordStrength,
  type PasswordStrength,
} from '../utils/validation';

const STRENGTH_LABELS: Record<Exclude<PasswordStrength, 'empty'>, string> = {
  weak: 'Weak',
  medium: 'Medium',
  strong: 'Strong',
};

export function PasswordStrengthIndicator({ password, id }: { password: string; id: string }) {
  const requirements = getPasswordRequirements(password);
  const strength = getPasswordStrength(password);
  const strengthIndex =
    strength === 'strong' ? 3 : strength === 'medium' ? 2 : strength === 'weak' ? 1 : 0;

  return (
    <div
      className={`auth-password-strength auth-password-strength--${strength}`}
      id={id}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="auth-password-strength-header">
        <span>Password strength</span>
        <span>{strength === 'empty' ? 'Add a password' : STRENGTH_LABELS[strength]}</span>
      </div>
      <div
        className="auth-password-strength-meter"
        role="meter"
        aria-label="Password strength"
        aria-valuemin={0}
        aria-valuemax={3}
        aria-valuenow={strengthIndex}
        aria-valuetext={strength === 'empty' ? 'No password entered' : STRENGTH_LABELS[strength]}
      >
        {[1, 2, 3].map((step) => (
          <span
            className={step <= strengthIndex ? 'is-active' : undefined}
            key={step}
            aria-hidden="true"
          />
        ))}
      </div>
      <ul className="auth-password-requirements">
        {requirements.map(({ label, met }) => (
          <li
            aria-label={`${label}: ${met ? 'met' : 'not met'}`}
            className={met ? 'is-met' : undefined}
            key={label}
          >
            <BadgeCheck aria-hidden="true" />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
