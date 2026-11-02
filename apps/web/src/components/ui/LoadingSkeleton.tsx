type LoadingSkeletonProps = {
  variant: 'product' | 'category' | 'hero' | 'card' | 'button';
  count?: number;
};

export default function LoadingSkeleton({ variant, count = 1 }: LoadingSkeletonProps) {
  const skeletons = Array.from({ length: Math.max(1, count) }, (_, index) => index);

  if (variant === 'hero') {
    return (
      <div className="skeleton-hero" role="status" aria-label="Loading hero content">
        <div className="skeleton-hero-copy">
          <span className="skeleton-block skeleton-eyebrow" />
          <span className="skeleton-block skeleton-hero-title" />
          <span className="skeleton-block skeleton-hero-title skeleton-hero-title--short" />
          <span className="skeleton-block skeleton-hero-description" />
          <span className="skeleton-block skeleton-hero-button" />
        </div>
        <span className="skeleton-hero-art" />
        <span className="visually-hidden">Loading hero content</span>
      </div>
    );
  }

  if (variant === 'button') {
    return (
      <span className="skeleton-button-list" role="status" aria-label="Loading buttons">
        {skeletons.map((index) => (
          <span className="skeleton-block skeleton-button" key={index} />
        ))}
        <span className="visually-hidden">Loading buttons</span>
      </span>
    );
  }

  return (
    <div
      className={`skeleton-grid skeleton-grid--${variant}`}
      role="status"
      aria-label={`Loading ${variant === 'card' ? 'cards' : `${variant} items`}`}
    >
      {skeletons.map((index) => (
        <div className={`skeleton-card skeleton-card--${variant}`} key={index}>
          <span className="skeleton-block skeleton-card-image" />
          <span className="skeleton-card-copy">
            <span className="skeleton-block skeleton-card-title" />
            <span className="skeleton-block skeleton-card-line" />
            <span className="skeleton-block skeleton-card-line skeleton-card-line--short" />
            {variant === 'product' && <span className="skeleton-block skeleton-card-button" />}
          </span>
        </div>
      ))}
      <span className="visually-hidden">Loading {variant} items</span>
    </div>
  );
}
