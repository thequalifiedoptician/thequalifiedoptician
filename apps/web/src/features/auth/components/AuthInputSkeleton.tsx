export function AuthInputSkeleton({ label = 'Loading input' }: { label?: string }) {
  return (
    <div className="auth-field auth-input-skeleton" role="status" aria-label={label}>
      <span className="auth-skeleton auth-skeleton-label" aria-hidden="true" />
      <span className="auth-skeleton auth-skeleton-input" aria-hidden="true" />
      <span className="auth-skeleton auth-skeleton-hint" aria-hidden="true" />
    </div>
  );
}

export function AuthSkeleton() {
  return (
    <div
      className="auth-card auth-card-skeleton"
      role="status"
      aria-label="Loading authentication UI"
    >
      <span className="auth-skeleton auth-skeleton-mark" aria-hidden="true" />
      <span className="auth-skeleton auth-skeleton-heading" aria-hidden="true" />
      <span className="auth-skeleton auth-skeleton-description" aria-hidden="true" />
      <AuthInputSkeleton label="Loading email input" />
      <AuthInputSkeleton label="Loading password input" />
      <span className="auth-skeleton auth-skeleton-button" aria-hidden="true" />
    </div>
  );
}
