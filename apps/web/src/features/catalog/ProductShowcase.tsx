import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import ProductCard from './ProductCard';
import { productGroups } from './productShowcaseData';

export default function ProductShowcase() {
  const prefersReducedMotion = useReducedMotion();
  const [activeGroup, setActiveGroup] = useState<string>(productGroups[0].id);

  useEffect(() => {
    const sections = productGroups
      .map((group) => document.getElementById(group.id))
      .filter((section): section is HTMLElement => section !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSections = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => second.intersectionRatio - first.intersectionRatio);
        const currentSection = visibleSections[0]?.target.id;

        if (currentSection) {
          setActiveGroup(currentSection);
        }
      },
      {
        rootMargin: '-18% 0px -58% 0px',
        threshold: [0, 0.15, 0.35, 0.6],
      },
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="product-showcase">
      <section className="product-intro" aria-labelledby="product-showcase-heading">
        <motion.div
          className="product-intro-copy"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-70px' }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.68, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="product-section-eyebrow">
            <span className="product-section-index">03</span>
            <Sparkles aria-hidden="true" />
            THE GOOD THINGS, GATHERED
          </p>
          <h2 id="product-showcase-heading">
            Keep the things
            <br />
            that <em>feel like you.</em>
          </h2>
          <p className="product-intro-description">
            Considered objects for daily rituals, quiet moments, and everything in between.
          </p>
        </motion.div>

        <a className="product-view-all-link" href="#featured-products">
          View all objects
          <span aria-hidden="true">
            <ArrowUpRight />
          </span>
        </a>
      </section>

      <nav className="product-filter-bar" aria-label="Product collection navigation">
        <span className="product-filter-label">EXPLORE THE EDIT</span>
        <div className="product-filter-links">
          {productGroups.map((group) => (
            <a
              className={`product-filter-link${activeGroup === group.id ? ' is-active' : ''}`}
              href={`#${group.id}`}
              aria-current={activeGroup === group.id ? 'location' : undefined}
              key={group.id}
              onClick={() => setActiveGroup(group.id)}
            >
              {group.navLabel}
            </a>
          ))}
        </div>
        <span className="product-filter-aside">A FEW THINGS WE LOVE</span>
      </nav>

      {productGroups.map((group, groupIndex) => (
        <section
          className="product-group"
          id={group.id}
          aria-labelledby={`${group.id}-heading`}
          key={group.id}
        >
          <div className="product-group-heading">
            <div className="product-group-heading-copy">
              <p className="product-group-eyebrow">
                <span>{String(groupIndex + 1).padStart(2, '0')}</span>
                {group.eyebrow}
              </p>
              <h3 id={`${group.id}-heading`}>{group.title}</h3>
              <p className="product-group-description">{group.description}</p>
            </div>
            <a className="product-group-link" href="#featured-products">
              Explore the edit
              <ArrowRight aria-hidden="true" />
            </a>
          </div>

          <div className="product-grid">
            {group.products.map((product, index) => (
              <motion.div
                className="product-grid-item"
                key={`${group.id}-${product.id}`}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-45px' }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.52,
                  delay: prefersReducedMotion ? 0 : index * 0.07,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
