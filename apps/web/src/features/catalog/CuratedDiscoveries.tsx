import { motion, useReducedMotion, type Variants } from 'framer-motion';
import {
  ArrowDownRight,
  ArrowUpRight,
  AudioLines,
  CookingPot,
  Cpu,
  Flower2,
  Gamepad2,
  Gem,
  House,
  Shirt,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

const MotionLink = motion.create(Link);

type Category = {
  name: string;
  description: string;
  count: string;
  icon: LucideIcon;
  tone: string;
};

type Collection = {
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  className: string;
  action: string;
};

const categories: Category[] = [
  {
    name: 'Electronics',
    description: 'Technology, made more thoughtful',
    count: '24 objects',
    icon: AudioLines,
    tone: 'electronics',
  },
  {
    name: 'Fashion',
    description: 'Considered pieces, worn often',
    count: '32 objects',
    icon: Shirt,
    tone: 'fashion',
  },
  {
    name: 'Home living',
    description: 'Make a little room to exhale',
    count: '28 objects',
    icon: House,
    tone: 'home',
  },
  {
    name: 'Beauty',
    description: 'Small rituals, lasting feeling',
    count: '19 objects',
    icon: Flower2,
    tone: 'beauty',
  },
  {
    name: 'Gaming',
    description: 'A new way to switch off',
    count: '16 objects',
    icon: Gamepad2,
    tone: 'gaming',
  },
  {
    name: 'Smart devices',
    description: 'Quietly clever by design',
    count: '21 objects',
    icon: Cpu,
    tone: 'smart',
  },
  {
    name: 'Kitchen',
    description: 'For the pleasure of gathering',
    count: '26 objects',
    icon: CookingPot,
    tone: 'kitchen',
  },
  {
    name: 'Accessories',
    description: 'The details that feel like you',
    count: '34 objects',
    icon: Gem,
    tone: 'accessories',
  },
];

const collections: Collection[] = [
  {
    number: '01',
    eyebrow: 'JUST ARRIVED',
    title: 'The new familiar',
    description: 'Fresh perspectives for the rituals you already love.',
    image: '/images/collection-new-familiar.svg',
    alt: 'Sculpted ceramic forms and a leafy branch against a pale apricot wall',
    className: 'collection-card--arrivals',
    action: 'Explore new arrivals',
  },
  {
    number: '02',
    eyebrow: 'THE AL SERA EDIT',
    title: 'Objects with intention',
    description: 'Quietly considered, endlessly lived with.',
    image: '/images/collection-intention.svg',
    alt: 'A sculptural lounge chair, side table and branch in a sunlit room',
    className: 'collection-card--editors',
    action: "Explore the editor's edit",
  },
  {
    number: '03',
    eyebrow: 'A STUDY IN FORM',
    title: 'A little less ordinary',
    description: 'Special pieces, made to find their place.',
    image: '/images/collection-limited-form.svg',
    alt: 'A handmade clay vessel and folded textile in soft evening light',
    className: 'collection-card--limited',
    action: 'Explore limited edition',
  },
];

const collectionContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

const collectionItemVariants: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.68, ease: [0.22, 1, 0.36, 1] },
  },
};

function SectionHeading({
  eyebrow,
  title,
  description,
  index,
  id,
}: {
  eyebrow: string;
  title: ReactNode;
  description: string;
  index: string;
  id: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const headingReveal = (y: number, delay: number) => ({
    initial: prefersReducedMotion ? false : { opacity: 0, y },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: prefersReducedMotion ? 0 : 0.58, delay },
  });

  return (
    <div className="curated-heading">
      <div className="curated-heading-copy">
        <motion.p className="curated-eyebrow" {...headingReveal(10, 0)}>
          <span className="curated-eyebrow-index">{index}</span>
          <span>{eyebrow}</span>
        </motion.p>
        <motion.h2 id={id} {...headingReveal(16, 0.06)}>
          {title}
        </motion.h2>
        <motion.p className="curated-heading-description" {...headingReveal(12, 0.12)}>
          {description}
        </motion.p>
      </div>
      <span className="curated-heading-ornament" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    </div>
  );
}

function CategoryCard({ category }: { category: Category }) {
  const Icon = category.icon;
  const prefersReducedMotion = useReducedMotion();

  return (
    <MotionLink
      className={`category-card category-card--${category.tone}`}
      to={`/shop?category=${encodeURIComponent(category.name.toLowerCase())}`}
      whileHover={prefersReducedMotion ? undefined : { y: -6, scale: 1.015 }}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 330, damping: 23 }}
      aria-label={`${category.name}: ${category.description}, ${category.count}`}
    >
      <span className="category-card-orbit" aria-hidden="true" />
      <span className="category-card-count">{category.count}</span>
      <span className="category-art" aria-hidden="true">
        <span className="category-art-halo" />
        <Icon className="category-art-icon" strokeWidth={1.35} />
        <span className="category-art-spark category-art-spark--one" />
        <span className="category-art-spark category-art-spark--two" />
      </span>
      <span className="category-card-copy">
        <span className="category-card-title">{category.name}</span>
        <span className="category-card-description">{category.description}</span>
      </span>
      <span className="category-card-arrow" aria-hidden="true">
        <ArrowUpRight />
      </span>
    </MotionLink>
  );
}

function CollectionCard({ collection }: { collection: Collection }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.article
      className={`collection-card ${collection.className}`}
      variants={prefersReducedMotion ? undefined : collectionItemVariants}
      whileHover={prefersReducedMotion ? undefined : { y: -5 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <img
        className="collection-card-image"
        src={collection.image}
        alt={collection.alt}
        loading="lazy"
        decoding="async"
      />
      <span className="collection-card-shade" aria-hidden="true" />
      <span className="collection-card-index" aria-hidden="true">
        {collection.number} / 03
      </span>
      <div className="collection-card-copy">
        <span className="collection-card-eyebrow">{collection.eyebrow}</span>
        <h3>{collection.title}</h3>
        <p>{collection.description}</p>
        <Link className="collection-card-link" to="/shop">
          {collection.action}
          <span aria-hidden="true">
            <ArrowUpRight />
          </span>
        </Link>
      </div>
      <span className="collection-card-corner" aria-hidden="true">
        <ArrowUpRight />
      </span>
    </motion.article>
  );
}

export default function CuratedDiscoveries() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="curated-discoveries">
      <section
        className="category-section"
        id="category-section"
        aria-labelledby="category-heading"
      >
        <SectionHeading
          id="category-heading"
          eyebrow="A WORLD, WELL CONSIDERED"
          title={
            <>
              Find your kind
              <br />
              of <em>everyday.</em>
            </>
          }
          description="A few good places to begin. Each one shaped around the things we reach for, return to, and make our own."
          index="01"
        />

        <motion.div
          className="category-grid"
          variants={prefersReducedMotion ? undefined : collectionContainerVariants}
          initial={prefersReducedMotion ? false : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {categories.map((category) => {
            return (
              <motion.div
                className="category-grid-item"
                key={category.name}
                variants={collectionItemVariants}
              >
                <CategoryCard category={category} />
              </motion.div>
            );
          })}
        </motion.div>
        <div className="category-section-footnote">
          <span>GOOD THINGS, IN THEIR OWN TIME</span>
          <span className="category-footnote-rule" aria-hidden="true" />
          <span>AL SERA / 2026</span>
        </div>
      </section>

      <section
        className="collections-section"
        id="featured-collections"
        aria-labelledby="collections-heading"
      >
        <SectionHeading
          id="collections-heading"
          eyebrow="GATHERED WITH A POINT OF VIEW"
          title={
            <>
              The <em>AlSera</em> edit.
            </>
          }
          description="A changing collection of things worth noticing. Selected for how they look, feel, and live with you."
          index="02"
        />

        <motion.div
          className="collections-grid"
          variants={collectionContainerVariants}
          initial={prefersReducedMotion ? false : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {collections.map((collection) => (
            <CollectionCard collection={collection} key={collection.number} />
          ))}
        </motion.div>
      </section>

      <section className="campaign-section" aria-labelledby="campaign-heading">
        <span className="campaign-orbit campaign-orbit--one" aria-hidden="true" />
        <span className="campaign-orbit campaign-orbit--two" aria-hidden="true" />
        <span className="campaign-arch" aria-hidden="true" />
        <motion.div
          className="campaign-content"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="campaign-eyebrow">
            <Sparkles aria-hidden="true" />A NOTE ON LIVING WELL
          </p>
          <h2 id="campaign-heading">
            Less, but <em>better.</em>
          </h2>
          <p className="campaign-description">
            Good design doesn’t ask for attention. It earns a place in your everyday—and stays.
          </p>
          <Link className="campaign-link" to="/about">
            Get to know AlSera
            <span aria-hidden="true">
              <ArrowUpRight />
            </span>
          </Link>
        </motion.div>
        <div className="campaign-seal" aria-hidden="true">
          <span>MADE FOR</span>
          <Sparkles />
          <span>THE EVERYDAY</span>
        </div>
        <div className="campaign-bottom-note" aria-hidden="true">
          <span>OBJECTS WITH A LITTLE MORE MEANING</span>
          <ArrowDownRight />
        </div>
      </section>
    </div>
  );
}
