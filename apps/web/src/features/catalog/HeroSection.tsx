import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HeroSection() {
  const prefersReducedMotion = useReducedMotion();
  const reveal = (delay: number) => ({
    initial: prefersReducedMotion ? false : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: prefersReducedMotion ? 0 : 0.72,
      delay: prefersReducedMotion ? 0 : delay,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  });

  return (
    <section className="hero-section" aria-labelledby="hero-heading">
      <div className="hero-copy">
        <motion.div className="hero-eyebrow" {...reveal(0.08)}>
          <span className="hero-eyebrow-mark" aria-hidden="true">
            <Sparkles />
          </span>
          <span>The art of living, considered</span>
        </motion.div>

        <motion.h1 id="hero-heading" {...reveal(0.16)}>
          A softer kind
          <br />
          of <em>everyday.</em>
        </motion.h1>

        <motion.p className="hero-description" {...reveal(0.24)}>
          Thoughtful objects and everyday essentials, brought together for the moments that make
          life feel like yours.
        </motion.p>

        <motion.div className="hero-actions" {...reveal(0.32)}>
          <Link className="hero-primary-action" to="/shop">
            Explore the edit
            <span className="hero-action-icon" aria-hidden="true">
              <ArrowUpRight />
            </span>
          </Link>
          <Link className="hero-secondary-action" to="/about">
            Our point of view
            <ArrowUpRight className="hero-secondary-arrow" aria-hidden="true" />
          </Link>
        </motion.div>

        <motion.div className="hero-signature" {...reveal(0.4)}>
          <span className="hero-signature-rule" aria-hidden="true" />
          <span>Make room for what matters.</span>
        </motion.div>
      </div>

      <motion.div
        className="hero-artwork"
        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.97, x: 18 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{
          duration: prefersReducedMotion ? 0 : 0.95,
          delay: prefersReducedMotion ? 0 : 0.18,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <div className="hero-artwork-frame">
          <img
            className="hero-still-life"
            src="/images/alsera-hero-still-life.svg"
            alt="Sculptural ceramic vessels and a leafy branch arranged in warm afternoon light"
            fetchPriority="high"
          />
          <div className="hero-artwork-index" aria-hidden="true">
            <span>01</span>
            <span className="hero-artwork-index-line" />
            <span>AL SERA</span>
          </div>
        </div>

        <motion.div
          className="hero-floating-note hero-floating-note--top"
          animate={prefersReducedMotion ? undefined : { y: [0, -7, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="floating-note-caption">A point of view</span>
          <span className="floating-note-title">The beauty of less.</span>
          <span className="floating-note-rule" aria-hidden="true" />
        </motion.div>

        <motion.div
          className="hero-floating-note hero-floating-note--bottom"
          animate={prefersReducedMotion ? undefined : { y: [0, 6, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
        >
          <span className="floating-note-icon" aria-hidden="true">
            <Sparkles />
          </span>
          <span className="floating-note-copy">
            <span className="floating-note-title">A little more intention.</span>
            <span className="floating-note-caption">For the everyday, and everything in it.</span>
          </span>
        </motion.div>

        <span className="hero-orbit hero-orbit--one" aria-hidden="true" />
        <span className="hero-orbit hero-orbit--two" aria-hidden="true" />
      </motion.div>
    </section>
  );
}
