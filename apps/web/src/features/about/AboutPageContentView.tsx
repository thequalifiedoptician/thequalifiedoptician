import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBrandSettings } from '@/features/brand/brandSettingsContext';
import type { AboutPageContent } from './aboutContent';
import './about-page.css';

function ImageOrArtwork({
  src,
  alt,
  className,
  brandName,
  logoUrl,
}: {
  src: string;
  alt: string;
  className: string;
  brandName: string;
  logoUrl: string | null;
}) {
  return (
    <div className={className}>
      {src ? (
        <img src={src} alt={alt} loading="lazy" decoding="async" />
      ) : (
        <div className="about-artwork" aria-hidden="true">
          <span className="about-artwork-ring" />
          <span className="about-artwork-mark">
            {logoUrl ? <img src={logoUrl} alt="" /> : brandName.charAt(0)}
          </span>
          <span className="about-artwork-caption">{brandName}</span>
        </div>
      )}
    </div>
  );
}

export default function AboutPageContentView({ content }: { content: AboutPageContent }) {
  const reduceMotion = useReducedMotion();
  const { settings: brand } = useBrandSettings();
  return (
    <div className="about-page-view">
      <section className="about-hero" aria-labelledby="about-title">
        <motion.div
          className="about-hero-copy"
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.45 }}
        >
          <p className="about-eyebrow">
            <Sparkles size={14} aria-hidden="true" />
            {content.hero.eyebrow}
          </p>
          <h1 id="about-title">{content.hero.title}</h1>
          <p className="about-hero-description">{content.hero.description}</p>
          <span className="about-hero-rule" aria-hidden="true" />
        </motion.div>
        <motion.div
          className="about-hero-art-wrap"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.6 }}
        >
          <ImageOrArtwork
            src={content.hero.imageUrl}
            alt={content.hero.imageAlt}
            className="about-hero-art"
            brandName={brand.brand_name}
            logoUrl={brand.logo_url}
          />
        </motion.div>
      </section>

      <section className="about-story" aria-labelledby="about-story-title">
        <ImageOrArtwork
          src={content.story.imageUrl}
          alt={content.story.imageAlt}
          className="about-story-art"
          brandName={brand.brand_name}
          logoUrl={brand.logo_url}
        />
        <div className="about-story-copy">
          <p className="about-eyebrow">{content.story.eyebrow}</p>
          <h2 id="about-story-title">{content.story.title}</h2>
          {content.story.body.split(/\n{2,}/u).map((paragraph, index) => (
            <p key={`${index}-${paragraph.slice(0, 20)}`}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section className="about-values" aria-labelledby="about-values-title">
        <header className="about-section-heading">
          <p className="about-eyebrow">WHAT GUIDES US</p>
          <h2 id="about-values-title">A few things we believe.</h2>
        </header>
        <div className="about-values-grid">
          {content.values.map((value, index) => (
            <article className="about-value-card" key={`${index}-${value.title}`}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{value.title}</h3>
              <p>{value.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-closing" aria-labelledby="about-closing-title">
        <span className="about-closing-mark" aria-hidden="true">
          <Sparkles />
        </span>
        <p className="about-eyebrow">THE EVERYDAY, MADE YOURS</p>
        <h2 id="about-closing-title">{content.closing.title}</h2>
        <p>{content.closing.description}</p>
        <Link to="/shop">
          Explore the collection <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}
