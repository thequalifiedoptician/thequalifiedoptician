import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type Variants,
} from 'framer-motion';
import {
  ArrowDownRight,
  ArrowRight,
  BadgeCheck,
  BadgeHelp,
  Check,
  ChevronDown,
  Clock3,
  CreditCard,
  Headphones,
  HeartHandshake,
  Leaf,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  Smile,
  Sparkles,
  Star,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type IconContent = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const trustFeatures: IconContent[] = [
  {
    icon: Truck,
    title: 'Free shipping',
    description: 'A considered journey from the first click to your front door.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure payments',
    description: 'A calm, clear experience at every important step.',
  },
  {
    icon: RotateCcw,
    title: 'Easy returns',
    description: 'Clear, approachable guidance when a piece is not quite right.',
  },
  {
    icon: Headphones,
    title: '24/7 customer support',
    description: 'Helpful answers and a little care whenever you need a hand.',
  },
  {
    icon: BadgeCheck,
    title: 'Quality guarantee',
    description: 'A point of view built around quality, usefulness, and lasting form.',
  },
];

const shoppingBenefits: IconContent[] = [
  {
    icon: Clock3,
    title: 'Fast delivery',
    description: 'A clear journey from checkout through arrival.',
  },
  {
    icon: PackageCheck,
    title: 'Easy checkout',
    description: 'A straightforward path from basket to checkout.',
  },
  {
    icon: BadgeCheck,
    title: 'Verified products',
    description: 'Helpful details to choose with a little more confidence.',
  },
  {
    icon: CreditCard,
    title: 'Best prices',
    description: 'Clear pricing, presented without surprises.',
  },
  {
    icon: Smile,
    title: 'Customer satisfaction',
    description: 'A calmer shopping experience, shaped around people.',
  },
  {
    icon: HeartHandshake,
    title: 'Responsive support',
    description: 'Helpful guidance, whenever a question comes up.',
  },
];

const partnerMarks = [
  { name: 'FORM & FIELD', style: 'serif' },
  { name: 'NORTH / STILL', style: 'spaced' },
  { name: 'morrow', style: 'lowercase' },
  { name: 'COMMON OBJECTS', style: 'compact' },
  { name: 'ATELIER 08', style: 'serif' },
  { name: 'GOODFORM', style: 'spaced' },
];

const testimonials = [
  {
    name: 'Avery R.',
    initials: 'AR',
    location: 'Portland, OR',
    tone: 'sage',
    quote:
      'The details feel considered without trying too hard. It made choosing something for our home feel genuinely enjoyable.',
  },
  {
    name: 'Morgan L.',
    initials: 'ML',
    location: 'Brooklyn, NY',
    tone: 'clay',
    quote:
      'A lovely edit of pieces I would not have found in the usual places. The whole experience feels calm and personal.',
  },
  {
    name: 'Jordan P.',
    initials: 'JP',
    location: 'Austin, TX',
    tone: 'stone',
    quote:
      'I came for one small thing and left with a new favourite daily ritual. Thoughtful design really does make a difference.',
  },
];

const questions = [
  {
    id: 'delivery',
    question: 'How does delivery work?',
    answer:
      'Delivery options and timing are shown with each order. This preview keeps those details informational; no orders or delivery services are connected.',
  },
  {
    id: 'returns',
    question: 'Can I return an item?',
    answer:
      'Return eligibility and timeframes depend on the final store policy. The live policy should be reviewed here before this experience is published.',
  },
  {
    id: 'payments',
    question: 'Which payment methods are accepted?',
    answer:
      'Payment methods will be listed at checkout once payment services are configured. This interface is a design preview and does not process payments.',
  },
  {
    id: 'product-care',
    question: 'Where can I find product care information?',
    answer:
      'Care guidance belongs with each product’s details. We aim to make the practical information as considered as the object itself.',
  },
  {
    id: 'support',
    question: 'How can I get in touch?',
    answer:
      'The contact page is the place for product questions and order support. Contact details and support hours should be confirmed before launch.',
  },
];

const socialMetrics = [
  { label: 'People in our community', value: 12_480, suffix: '+', display: '12,480+' },
  { label: 'Orders delivered', value: 8_640, suffix: '+', display: '8,640+' },
  { label: 'Thoughtful finds', value: 240, suffix: '+', display: '240+' },
  { label: 'Places reached', value: 18, suffix: '', display: '18' },
];

const cardStagger: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.075 },
  },
};

const cardReveal: Variants = {
  hidden: { opacity: 0, y: 17 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

function BrandSectionHeading({
  number,
  eyebrow,
  title,
  description,
  id,
}: {
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  id: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="brand-section-heading"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-55px' }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.58, ease: [0.22, 1, 0.36, 1] }}
    >
      <p className="brand-section-eyebrow">
        <span>{number}</span>
        {eyebrow}
      </p>
      <h2 id={id}>{title}</h2>
      <p className="brand-section-description">{description}</p>
    </motion.div>
  );
}

function IconCard({ item, index }: { item: IconContent; index: number }) {
  const Icon = item.icon;
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.article
      className="trust-card"
      variants={cardReveal}
      whileHover={prefersReducedMotion ? undefined : { y: -5 }}
      transition={{ type: 'spring', stiffness: 310, damping: 25 }}
    >
      <span className="trust-card-index">{String(index + 1).padStart(2, '0')}</span>
      <span className="trust-card-icon" aria-hidden="true">
        <Icon />
      </span>
      <h3>{item.title}</h3>
      <p>{item.description}</p>
      <span className="trust-card-rule" aria-hidden="true" />
    </motion.article>
  );
}

function AnimatedMetric({ metric }: { metric: (typeof socialMetrics)[number] }) {
  const prefersReducedMotion = useReducedMotion();
  const value = useMotionValue(0);
  const formattedValue = useTransform(value, (latest) => {
    return `${Math.round(latest).toLocaleString()}${metric.suffix}`;
  });
  const metricRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(metricRef, { once: true, amount: 0.5 });

  useEffect(() => {
    if (!isInView) {
      return;
    }

    if (prefersReducedMotion) {
      value.set(metric.value);
      return;
    }

    const controls = animate(value, metric.value, {
      duration: 1.25,
      ease: [0.22, 1, 0.36, 1],
    });

    return () => controls.stop();
  }, [isInView, metric.value, prefersReducedMotion, value]);

  return (
    <div className="social-proof-metric" ref={metricRef}>
      <motion.span className="social-proof-value" aria-label={metric.display}>
        {formattedValue}
      </motion.span>
      <span className="social-proof-label">{metric.label}</span>
    </div>
  );
}

export default function BrandExperience() {
  const prefersReducedMotion = useReducedMotion();
  const [openQuestion, setOpenQuestion] = useState<string | null>(questions[0].id);

  return (
    <div className="brand-experience">
      <section className="trust-section" aria-labelledby="trust-heading">
        <BrandSectionHeading
          number="04"
          eyebrow="A LITTLE MORE PEACE OF MIND"
          title="Good things. Good care."
          description="Illustrative service statements for design preview. Confirm shipping, payment, returns, support, and quality policies before publishing."
          id="trust-heading"
        />
        <motion.div
          className="trust-grid"
          variants={cardStagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-45px' }}
        >
          {trustFeatures.map((item, index) => (
            <IconCard item={item} index={index} key={item.title} />
          ))}
        </motion.div>
      </section>

      <section className="benefits-section" aria-labelledby="benefits-heading">
        <div className="benefits-panel">
          <div className="benefits-intro">
            <p className="brand-section-eyebrow">
              <span>05</span>
              THE EVERYDAY, ELEVATED
            </p>
            <h2 id="benefits-heading">
              Small details.
              <br />
              <em>Better days.</em>
            </h2>
            <p>
              Shopping should leave room for the good part: finding something that feels just right.
            </p>
            <p className="benefits-preview-note">
              Illustrative benefit concepts; confirm service, verification, and pricing details
              before launch.
            </p>
          </div>
          <motion.div
            className="benefit-grid"
            variants={cardStagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
          >
            {shoppingBenefits.map((item) => {
              const Icon = item.icon;

              return (
                <motion.article className="benefit-item" variants={cardReveal} key={item.title}>
                  <span className="benefit-icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
          <span className="benefits-ornament benefits-ornament--one" aria-hidden="true" />
          <span className="benefits-ornament benefits-ornament--two" aria-hidden="true" />
        </div>
      </section>

      <section className="brands-section" aria-labelledby="brands-heading">
        <div className="brands-heading-row">
          <div>
            <p className="brand-section-eyebrow">
              <span>06</span>
              GOOD COMPANY
            </p>
            <h2 id="brands-heading">A few names we admire.</h2>
          </div>
          <p>Brand marks shown as visual placeholders.</p>
        </div>
        <div className="brand-slider" role="group" aria-label="Illustrative partner brand marks">
          <div className="brand-slider-track">
            {[...partnerMarks, ...partnerMarks].map((brand, index) => (
              <div
                className={`brand-mark-placeholder brand-mark-placeholder--${brand.style}`}
                key={`${brand.name}-${index}`}
                aria-hidden={index >= partnerMarks.length}
              >
                {brand.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="testimonial-section" aria-labelledby="testimonial-heading">
        <div className="testimonial-heading-row">
          <BrandSectionHeading
            number="07"
            eyebrow="KIND WORDS, QUIETLY SHARED"
            title="A feeling worth passing on."
            description="A little glimpse of the experience we hope to create."
            id="testimonial-heading"
          />
          <div className="testimonial-note">
            <BadgeHelp aria-hidden="true" />
            <span>Illustrative testimonials, not verified customer reviews.</span>
          </div>
        </div>
        <motion.div
          className="testimonial-grid"
          variants={cardStagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-45px' }}
        >
          {testimonials.map((testimonial) => (
            <motion.article
              className="testimonial-card"
              variants={cardReveal}
              key={testimonial.name}
              whileHover={prefersReducedMotion ? undefined : { y: -4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            >
              <div className="testimonial-card-top">
                <div className="testimonial-stars" aria-label="5 out of 5 stars">
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star key={index} aria-hidden="true" fill="currentColor" />
                  ))}
                </div>
                <span className="testimonial-verification">
                  <Check aria-hidden="true" />
                  Verified · preview
                </span>
              </div>
              <span className="testimonial-quote-mark" aria-hidden="true">
                “
              </span>
              <blockquote>{testimonial.quote}</blockquote>
              <div className="testimonial-customer">
                <span
                  className={`testimonial-avatar testimonial-avatar--${testimonial.tone}`}
                  aria-hidden="true"
                >
                  {testimonial.initials}
                </span>
                <span>
                  <strong>{testimonial.name}</strong>
                  <small>{testimonial.location} · sample profile</small>
                </span>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </section>

      <section className="brand-campaign" aria-labelledby="brand-campaign-heading">
        <span className="brand-campaign-orbit brand-campaign-orbit--one" aria-hidden="true" />
        <span className="brand-campaign-orbit brand-campaign-orbit--two" aria-hidden="true" />
        <span className="brand-campaign-sun" aria-hidden="true" />
        <span className="brand-campaign-arch" aria-hidden="true" />
        <div className="brand-campaign-copy">
          <p className="brand-campaign-eyebrow">
            <Sparkles aria-hidden="true" />A MORE CONSIDERED KIND OF EVERYDAY
          </p>
          <h2 id="brand-campaign-heading">
            Make room for
            <br />
            <em>what matters.</em>
          </h2>
          <p>
            Find thoughtful pieces for the rituals, corners, and little moments that make a place
            yours.
          </p>
          <a className="brand-campaign-link" href="#featured-products">
            Find your next favourite
            <span aria-hidden="true">
              <ArrowRight />
            </span>
          </a>
        </div>
        <div className="brand-campaign-seal" aria-hidden="true">
          <Leaf />
          <span>AL SERA</span>
          <small>LIVE WITH INTENTION</small>
        </div>
        <span className="brand-campaign-footnote">GOOD FORM, FOR REAL LIFE</span>
      </section>

      <section className="social-proof-section" aria-labelledby="social-proof-heading">
        <div className="social-proof-heading">
          <p className="brand-section-eyebrow">
            <span>08</span>A COMMUNITY IN THE MAKING
          </p>
          <h2 id="social-proof-heading">Good things travel.</h2>
          <p>Illustrative counters for design preview—not verified business metrics.</p>
        </div>
        <div className="social-proof-grid">
          {socialMetrics.map((metric) => (
            <AnimatedMetric metric={metric} key={metric.label} />
          ))}
        </div>
      </section>

      <section className="faq-section" id="faq-preview" aria-labelledby="faq-heading">
        <div className="faq-intro">
          <p className="brand-section-eyebrow">
            <span>09</span>
            THE LITTLE DETAILS
          </p>
          <h2 id="faq-heading">
            A few things
            <br />
            <em>you might wonder.</em>
          </h2>
          <p>Clear answers are part of a considered experience.</p>
          <a href="#faq-list" className="faq-contact-link">
            Browse the answers <ArrowDownRight aria-hidden="true" />
          </a>
        </div>
        <div className="faq-list" id="faq-list">
          {questions.map((item) => {
            const isOpen = openQuestion === item.id;
            const answerId = `faq-answer-${item.id}`;

            return (
              <article className={`faq-item${isOpen ? ' is-open' : ''}`} key={item.id}>
                <h3>
                  <button
                    className="faq-trigger"
                    id={`faq-trigger-${item.id}`}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={answerId}
                    onClick={() => setOpenQuestion(isOpen ? null : item.id)}
                  >
                    <span>{item.question}</span>
                    <span className="faq-trigger-icon" aria-hidden="true">
                      <ChevronDown />
                    </span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      className="faq-answer"
                      id={answerId}
                      role="region"
                      aria-labelledby={`faq-trigger-${item.id}`}
                      initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={prefersReducedMotion ? undefined : { height: 0, opacity: 0 }}
                      transition={{ duration: prefersReducedMotion ? 0 : 0.28 }}
                    >
                      <p>{item.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
