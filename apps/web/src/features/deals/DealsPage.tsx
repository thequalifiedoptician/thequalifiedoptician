import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Clock3, RefreshCw, Sparkles, Tag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadActiveDeals, type Deal } from './dealsService';
import './deals.css';

function formatEndDate(value: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function DealAction({ deal, featured = false }: { deal: Deal; featured?: boolean }) {
  const external = /^https?:\/\//iu.test(deal.action_href);
  const className = featured ? 'deal-action deal-action--featured' : 'deal-action';
  const content = (
    <>
      {deal.action_label}
      {external ? <ArrowUpRight size={16} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
    </>
  );

  return external ? (
    <a className={className} href={deal.action_href} target="_blank" rel="noreferrer">
      {content}
    </a>
  ) : (
    <Link className={className} to={deal.action_href}>
      {content}
    </Link>
  );
}

function DealCard({ deal, featured = false }: { deal: Deal; featured?: boolean }) {
  const deadline = formatEndDate(deal.ends_at);

  return (
    <article className={featured ? 'deal-card deal-card--featured' : 'deal-card'}>
      <div className="deal-card-image">
        <img src={deal.image_url} alt={deal.image_alt} loading="lazy" />
        {deal.badge && (
          <span className="deal-card-badge">
            <Sparkles size={13} aria-hidden="true" />
            {deal.badge}
          </span>
        )}
      </div>
      <div className="deal-card-copy">
        <div className="deal-card-meta">
          <span>AL SERA OFFER</span>
          {deadline && (
            <span className="deal-card-deadline">
              <Clock3 size={13} aria-hidden="true" />
              Until {deadline}
            </span>
          )}
        </div>
        <h2>{deal.title}</h2>
        {deal.description && <p>{deal.description}</p>}
        <DealAction deal={deal} featured={featured} />
      </div>
    </article>
  );
}

export default function DealsPage() {
  const reduceMotion = useReducedMotion();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    void loadActiveDeals().then(
      (activeDeals) => {
        if (active) {
          setDeals(activeDeals);
          setError(null);
          setIsLoading(false);
        }
      },
      (loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error ? loadError.message : 'Deals could not be loaded.',
          );
          setIsLoading(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const transition = reduceMotion ? { duration: 0 } : { duration: 0.35 };
  const [featuredDeal, ...moreDeals] = deals;

  return (
    <main className="deals-page">
      <header className="deals-intro">
        <p className="deals-eyebrow">
          <Tag size={14} aria-hidden="true" /> THE AL SERA EDIT
        </p>
        <h1>
          Good things,
          <br />
          <em>worth discovering.</em>
        </h1>
        <p className="deals-intro-copy">
          A changing collection of thoughtful finds, special moments, and offers made for you.
        </p>
        <span className="deals-intro-mark" aria-hidden="true">
          A
        </span>
      </header>

      <section className="deals-content" aria-labelledby="deals-heading">
        <div className="deals-section-heading">
          <div>
            <p className="deals-section-eyebrow">A LITTLE EXTRA, JUST FOR YOU</p>
            <h2 id="deals-heading">Current offers</h2>
          </div>
          <Link className="deals-shop-link" to="/shop">
            Explore the shop <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>

        {isLoading ? (
          <div className="deals-loading" role="status" aria-label="Loading offers">
            <span />
            <span />
            <span />
          </div>
        ) : error ? (
          <div className="deals-state deals-state--error" role="alert">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                setReloadKey((key) => key + 1);
              }}
            >
              <RefreshCw size={15} aria-hidden="true" /> Try again
            </button>
          </div>
        ) : deals.length ? (
          <div className="deals-list">
            <AnimatePresence mode="popLayout">
              {featuredDeal && (
                <motion.div
                  key={featuredDeal.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={transition}
                >
                  <DealCard deal={featuredDeal} featured />
                </motion.div>
              )}
              {moreDeals.length > 0 && (
                <div className="deals-grid">
                  {moreDeals.map((deal, index) => (
                    <motion.div
                      key={deal.id}
                      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...transition, delay: reduceMotion ? 0 : index * 0.04 }}
                    >
                      <DealCard deal={deal} />
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="deals-empty">
            <span>
              <Sparkles size={22} aria-hidden="true" />
            </span>
            <p className="deals-section-eyebrow">A QUIET MOMENT</p>
            <h3>Something lovely is on its way.</h3>
            <p>There are no current offers just yet. Explore the collection while you wait.</p>
            <Link to="/shop">
              Discover the collection <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>

      <footer className="deals-footer-note">
        Offers are subject to availability. Any displayed offer details are managed by the store.
      </footer>
    </main>
  );
}
