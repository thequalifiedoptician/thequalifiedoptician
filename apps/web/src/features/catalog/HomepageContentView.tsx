import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Eye, Sparkles } from 'lucide-react';
import { useCallback, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type {
  HomepageCard,
  HomepageContent,
  HomepageSection,
} from '@/features/admin/homepage/homepageContent';
import { AUTH_ROUTES } from '@/features/auth/constants/auth';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getAuthRedirectState } from '@/features/auth/utils/authNavigation';
import HomepageProductQuickView from './HomepageProductQuickView';
import './homepage-content.css';

function ActionLink({
  href,
  children,
  className,
}: {
  href: string;
  children: string;
  className: string;
}) {
  if (!href) {
    return null;
  }
  if (href.startsWith('/') && !href.startsWith('//')) {
    return (
      <Link className={className} to={href}>
        {children}
        <ArrowUpRight aria-hidden="true" />
      </Link>
    );
  }
  let destination: URL;
  try {
    destination = new URL(href);
  } catch {
    return null;
  }
  if (destination.protocol !== 'https:') {
    return null;
  }
  return (
    <a className={className} href={destination.href} target="_blank" rel="noreferrer">
      {children}
      <ArrowUpRight aria-hidden="true" />
    </a>
  );
}

function ProductLink({ href, children }: { href: string; children: ReactNode }) {
  if (href.startsWith('/') && !href.startsWith('//')) {
    return <Link to={href}>{children}</Link>;
  }
  let destination: string | null = null;
  try {
    const parsedUrl = new URL(href);
    if (parsedUrl.protocol === 'https:') destination = parsedUrl.href;
  } catch {
    destination = null;
  }
  return destination ? (
    <a href={destination} target="_blank" rel="noreferrer">
      {children}
    </a>
  ) : (
    <>{children}</>
  );
}

function SectionCard({
  card,
  kind,
  index,
}: {
  card: HomepageCard;
  kind: HomepageSection['kind'];
  index: number;
}) {
  const reduceMotion = useReducedMotion();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const quickViewButtonRef = useRef<HTMLButtonElement>(null);
  const closeQuickView = useCallback(() => {
    setQuickViewOpen(false);
  }, []);
  const cardContent = (
    <>
      {card.imageUrl ? (
        <img src={card.imageUrl} alt={card.imageAlt} loading="lazy" decoding="async" />
      ) : (
        <span className="homepage-card-mark" aria-hidden="true">
          {kind === 'categories' ? <Sparkles /> : card.title.slice(0, 1)}
        </span>
      )}
      {card.badge && <span className="homepage-card-badge">{card.badge}</span>}
      {card.eyebrow && <span className="homepage-card-eyebrow">{card.eyebrow}</span>}
      <h3>{card.title}</h3>
      {card.description && <p>{card.description}</p>}
      {card.price && <strong className="homepage-card-price">{card.price}</strong>}
      {card.detail && <span className="homepage-card-detail">{card.detail}</span>}
      {card.actionLabel && (
        <span className="homepage-card-link">
          {card.actionLabel} <ArrowUpRight aria-hidden="true" />
        </span>
      )}
    </>
  );

  if (kind === 'faq') {
    return (
      <details className="homepage-faq-card">
        <summary>{card.title}</summary>
        <p>{card.description}</p>
      </details>
    );
  }

  if (kind === 'products') {
    const slug = card.actionHref.match(/^\/shop\/([^/?#]+)/u)?.[1];
    const productHref = slug ? `/shop/${slug}` : '/shop';
    let quickViewSlug: string | null = null;
    if (slug) {
      try {
        quickViewSlug = decodeURIComponent(slug);
      } catch {
        quickViewSlug = slug;
      }
    }
    const handleProductAction = (event: MouseEvent<HTMLElement>) => {
      if (isAuthLoading || isAuthenticated) {
        return;
      }
      event.preventDefault();
      navigate(AUTH_ROUTES.login, {
        state: getAuthRedirectState(location, productHref),
      });
    };

    return (
      <>
        <motion.article
          className="homepage-content-card homepage-content-card--products homepage-product-card"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-35px' }}
          transition={{
            duration: reduceMotion ? 0 : 0.38,
            delay: reduceMotion ? 0 : Math.min(index, 5) * 0.04,
          }}
        >
          <Link
            className="homepage-product-card-link"
            to={productHref}
            aria-label={`View ${card.title}${slug ? ' product details' : ' in the shop'}`}
            onClick={handleProductAction}
          >
            {cardContent}
          </Link>
          <button
            ref={quickViewButtonRef}
            className="homepage-product-quick-view-trigger"
            type="button"
            title="Quick View"
            aria-label={`Quick View: ${card.title}`}
            disabled={isAuthLoading}
            onClick={() => {
              if (!isAuthenticated) {
                navigate(AUTH_ROUTES.login, {
                  state: getAuthRedirectState(location, productHref),
                });
                return;
              }
              setQuickViewOpen(true);
            }}
          >
            <Eye aria-hidden="true" />
          </button>
        </motion.article>
        <AnimatePresence onExitComplete={() => quickViewButtonRef.current?.focus()}>
          {quickViewOpen && (
            <HomepageProductQuickView card={card} slug={quickViewSlug} onClose={closeQuickView} />
          )}
        </AnimatePresence>
      </>
    );
  }

  if (card.actionHref) {
    return (
      <motion.article
        className={`homepage-content-card homepage-content-card--${kind}`}
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-35px' }}
        transition={{
          duration: reduceMotion ? 0 : 0.38,
          delay: reduceMotion ? 0 : Math.min(index, 5) * 0.04,
        }}
      >
        <ProductLink href={card.actionHref}>{cardContent}</ProductLink>
      </motion.article>
    );
  }

  return (
    <motion.article
      className={`homepage-content-card homepage-content-card--${kind}`}
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-35px' }}
      transition={{
        duration: reduceMotion ? 0 : 0.38,
        delay: reduceMotion ? 0 : Math.min(index, 5) * 0.04,
      }}
    >
      {cardContent}
    </motion.article>
  );
}

function ContentSection({ section, index }: { section: HomepageSection; index: number }) {
  const banner = section.kind === 'campaign';
  return (
    <section
      className={`homepage-content-section homepage-content-section--${section.kind}`}
      id={`home-${section.id}`}
      aria-labelledby={`home-${section.id}-title`}
    >
      {banner ? (
        <div className="homepage-content-banner">
          <div className="homepage-content-banner-copy">
            {section.eyebrow && (
              <p className="homepage-section-eyebrow">
                <Sparkles />
                {section.eyebrow}
              </p>
            )}
            <h2 id={`home-${section.id}-title`}>{section.title}</h2>
            {section.description && <p>{section.description}</p>}
            {section.actionLabel && section.actionHref && (
              <ActionLink className="homepage-banner-link" href={section.actionHref}>
                {section.actionLabel}
              </ActionLink>
            )}
          </div>
          {section.imageUrl && (
            <img
              className="homepage-banner-art"
              src={section.imageUrl}
              alt={section.imageAlt}
              loading="lazy"
            />
          )}
          <span className="homepage-banner-seal" aria-hidden="true">
            <Sparkles />
          </span>
        </div>
      ) : (
        <>
          <header className="homepage-content-heading">
            <div>
              {section.eyebrow && (
                <p className="homepage-section-eyebrow">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  {section.eyebrow}
                </p>
              )}
              <h2 id={`home-${section.id}-title`}>{section.title}</h2>
              {section.description && <p>{section.description}</p>}
            </div>
            {section.actionLabel && (
              <ActionLink className="homepage-section-action" href={section.actionHref}>
                {section.actionLabel}
              </ActionLink>
            )}
          </header>
          <div className={`homepage-content-grid homepage-content-grid--${section.kind}`}>
            {section.cards.map((card, cardIndex) => (
              <SectionCard key={card.id} card={card} kind={section.kind} index={cardIndex} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export default function HomepageContentView({ content }: { content: HomepageContent }) {
  const reduceMotion = useReducedMotion();
  const hero = content.hero;

  return (
    <div className="managed-homepage">
      <section className="managed-home-hero" aria-labelledby="managed-home-title">
        <div className="managed-home-copy">
          <p className="homepage-section-eyebrow">
            <Sparkles />
            {hero.eyebrow}
          </p>
          <motion.h1
            id="managed-home-title"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.55 }}
          >
            {hero.title}
          </motion.h1>
          <p className="managed-home-description">{hero.description}</p>
          <div className="managed-home-actions">
            <ActionLink className="managed-home-primary" href={hero.primaryHref}>
              {hero.primaryLabel}
            </ActionLink>
            <ActionLink className="managed-home-secondary" href={hero.secondaryHref}>
              {hero.secondaryLabel}
            </ActionLink>
          </div>
          <p className="managed-home-signature">
            <span />
            {hero.signature}
          </p>
        </div>
        <motion.div
          className="managed-home-art"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.7 }}
        >
          <img src={hero.imageUrl} alt={hero.imageAlt} fetchPriority="high" />
          <span className="managed-home-art-caption">OBJECTS WITH INTENTION</span>
        </motion.div>
      </section>
      {content.sections
        .filter((section) => section.enabled)
        .map((section, index) => (
          <ContentSection section={section} index={index} key={section.id} />
        ))}
    </div>
  );
}
