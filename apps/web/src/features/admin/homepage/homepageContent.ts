import type { Json } from '@/features/auth/types/database';

export type HomepageSectionKind =
  | 'categories'
  | 'collections'
  | 'products'
  | 'benefits'
  | 'brands'
  | 'testimonials'
  | 'stats'
  | 'faq'
  | 'campaign';

export type HomepageCard = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  productId: string;
  badge: string;
  actionLabel: string;
  actionHref: string;
  price: string;
  detail: string;
};

export type HomepageSection = {
  id: string;
  kind: HomepageSectionKind;
  enabled: boolean;
  eyebrow: string;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  imageUrl: string;
  imageAlt: string;
  cards: HomepageCard[];
};

export type HomepageContent = {
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    signature: string;
    imageUrl: string;
    imageAlt: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
  };
  shopHero: {
    imageUrl: string;
    imageAlt: string;
  };
  sections: HomepageSection[];
};

function card(
  id: string,
  title: string,
  description = '',
  options: Partial<HomepageCard> = {},
): HomepageCard {
  return {
    id,
    eyebrow: '',
    title,
    description,
    imageUrl: '',
    imageAlt: '',
    productId: '',
    badge: '',
    actionLabel: '',
    actionHref: '',
    price: '',
    detail: '',
    ...options,
  };
}

function section(
  id: string,
  kind: HomepageSectionKind,
  eyebrow: string,
  title: string,
  description: string,
  cards: HomepageCard[],
  options: Partial<HomepageSection> = {},
): HomepageSection {
  return {
    id,
    kind,
    enabled: true,
    eyebrow,
    title,
    description,
    actionLabel: '',
    actionHref: '',
    imageUrl: '',
    imageAlt: '',
    cards,
    ...options,
  };
}

export const defaultHomepageContent: HomepageContent = {
  hero: {
    eyebrow: 'The art of living, considered',
    title: 'A softer kind of everyday.',
    description:
      'Thoughtful objects and everyday essentials, brought together for the moments that make life feel like yours.',
    signature: 'Make room for what matters.',
    imageUrl: '/images/alsera-hero-still-life.svg',
    imageAlt: 'Sculptural ceramic vessels and a leafy branch arranged in warm afternoon light',
    primaryLabel: 'Explore the edit',
    primaryHref: '/shop',
    secondaryLabel: 'Our point of view',
    secondaryHref: '/about',
  },
  shopHero: {
    imageUrl: '',
    imageAlt: '',
  },
  sections: [
    section(
      'categories',
      'categories',
      'A WORLD, WELL CONSIDERED',
      'Find your kind of everyday.',
      'A few good places to begin. Each one shaped around the things we reach for, return to, and make our own.',
      [
        card('electronics', 'Electronics', 'Technology, made more thoughtful', {
          detail: '24 objects',
        }),
        card('fashion', 'Fashion', 'Considered pieces, worn often', { detail: '32 objects' }),
        card('home-living', 'Home living', 'Make a little room to exhale', {
          detail: '28 objects',
        }),
        card('beauty', 'Beauty', 'Small rituals, lasting feeling', { detail: '19 objects' }),
        card('gaming', 'Gaming', 'A new way to switch off', { detail: '16 objects' }),
        card('smart-devices', 'Smart devices', 'Quietly clever by design', {
          detail: '21 objects',
        }),
        card('kitchen', 'Kitchen', 'For the pleasure of gathering', { detail: '26 objects' }),
        card('accessories', 'Accessories', 'The details that feel like you', {
          detail: '34 objects',
        }),
      ],
    ),
    section(
      'collections',
      'collections',
      'GATHERED WITH A POINT OF VIEW',
      'The AlSera edit.',
      'A changing collection of things worth noticing. Selected for how they look, feel, and live with you.',
      [
        card(
          'new-familiar',
          'The new familiar',
          'Fresh perspectives for the rituals you already love.',
          {
            eyebrow: 'JUST ARRIVED',
            imageUrl: '/images/collection-new-familiar.svg',
            imageAlt: 'Sculpted ceramic forms and a leafy branch against a pale apricot wall',
            actionLabel: 'Explore new arrivals',
            actionHref: '/shop?new=1',
          },
        ),
        card('intention', 'Objects with intention', 'Quietly considered, endlessly lived with.', {
          eyebrow: 'THE AL SERA EDIT',
          imageUrl: '/images/collection-intention.svg',
          imageAlt: 'A sculptural lounge chair, side table and branch in a sunlit room',
          actionLabel: "Explore the editor's edit",
          actionHref: '/shop',
        }),
        card(
          'limited-form',
          'A little less ordinary',
          'Special pieces, made to find their place.',
          {
            eyebrow: 'A STUDY IN FORM',
            imageUrl: '/images/collection-limited-form.svg',
            imageAlt: 'A handmade clay vessel and folded textile in soft evening light',
            actionLabel: 'Explore limited edition',
            actionHref: '/shop?featured=1',
          },
        ),
      ],
    ),
    section(
      'featured-products',
      'products',
      'THE AL SERA SELECTION',
      'Objects worth keeping.',
      'Well-made things, chosen for the way they feel as much as the way they look.',
      [
        card('form-study-lamp', 'Form Study Lamp', 'Soft light, sculptural form.', {
          eyebrow: 'Home living',
          imageUrl: '/images/products/form-study-lamp.svg',
          imageAlt: 'Sculptural ceramic table lamp in warm ivory',
          badge: 'A new favourite',
          price: 'PKR 148',
          detail: '4.9 · 128 reviews',
        }),
        card('studio-one-headphones', 'Studio One Headphones', 'A quieter world, well heard.', {
          eyebrow: 'Electronics',
          imageUrl: '/images/products/studio-one-headphones.svg',
          imageAlt: 'Over-ear headphones in a deep forest green finish',
          badge: 'Bestseller',
          price: 'PKR 219',
          detail: '4.8 · 96 reviews',
        }),
        card('soft-form-throw', 'Soft Form Linen Throw', 'Naturally textured, endlessly useful.', {
          eyebrow: 'Home living',
          imageUrl: '/images/products/soft-form-throw.svg',
          imageAlt: 'Folded natural linen throw with soft woven texture',
          badge: 'Small batch',
          price: 'PKR 96',
          detail: '4.9 · 74 reviews',
        }),
        card('daily-ritual-pour-over', 'Daily Ritual Pour-over', 'A slower start, by design.', {
          eyebrow: 'Kitchen',
          imageUrl: '/images/products/daily-ritual-pour-over.svg',
          imageAlt: 'Hand-finished stoneware pour-over set and cup',
          badge: 'Just arrived',
          price: 'PKR 68',
          detail: '4.7 · 58 reviews',
        }),
      ],
      { actionLabel: 'View all objects', actionHref: '/shop' },
    ),
    section(
      'new-arrivals',
      'products',
      'JUST FOUND THEIR WAY HERE',
      'A fresh point of view.',
      'New pieces with the feeling of something you have always known.',
      [
        card('daily-ritual-pour-over-new', 'Daily Ritual Pour-over', 'A slower start, by design.', {
          eyebrow: 'Kitchen',
          imageUrl: '/images/products/daily-ritual-pour-over.svg',
          imageAlt: 'Hand-finished stoneware pour-over set and cup',
          badge: 'Just arrived',
          price: 'PKR 68',
          detail: '4.7 · 58 reviews',
        }),
        card('field-notes-speaker', 'Field Notes Speaker', 'Your soundtrack, wherever you land.', {
          eyebrow: 'Electronics',
          imageUrl: '/images/products/field-notes-speaker.svg',
          imageAlt: 'Compact portable speaker wrapped in woven olive fabric',
          badge: 'Just arrived',
          price: 'PKR 132',
          detail: '4.7 · 61 reviews',
        }),
        card('form-study-lamp-new', 'Form Study Lamp', 'Soft light, sculptural form.', {
          eyebrow: 'Home living',
          imageUrl: '/images/products/form-study-lamp.svg',
          imageAlt: 'Sculptural ceramic table lamp in warm ivory',
          badge: 'A new favourite',
          price: 'PKR 148',
          detail: '4.9 · 128 reviews',
        }),
        card('cedar-no-four', 'Cedar No. 04', 'Warm woods, softened by light.', {
          eyebrow: 'Beauty',
          imageUrl: '/images/products/cedar-no-four.svg',
          imageAlt: 'Amber glass fragrance bottle with a brushed brass cap',
          badge: 'Small batch',
          price: 'PKR 112',
          detail: '4.9 · 83 reviews',
        }),
      ],
      { actionLabel: 'Discover new arrivals', actionHref: '/shop?new=1' },
    ),
    section(
      'popular-finds',
      'products',
      'A GOOD PLACE TO BEGIN',
      'Loved for a reason.',
      'A few things people come back to—and make part of their own.',
      [
        card('popular-throw', 'Soft Form Linen Throw', 'Naturally textured, endlessly useful.', {
          eyebrow: 'Home living',
          imageUrl: '/images/products/soft-form-throw.svg',
          imageAlt: 'Folded natural linen throw with soft woven texture',
          badge: 'Small batch',
          price: 'PKR 96',
          detail: '4.9 · 74 reviews',
        }),
        card('everyday-carry-tote', 'Everyday Carry Tote', 'Room for the little in-betweens.', {
          eyebrow: 'Accessories',
          imageUrl: '/images/products/everyday-carry-tote.svg',
          imageAlt: 'Structured canvas tote with long leather handles',
          badge: 'Bestseller',
          price: 'PKR 84',
          detail: '4.8 · 112 reviews',
        }),
        card('popular-headphones', 'Studio One Headphones', 'A quieter world, well heard.', {
          eyebrow: 'Electronics',
          imageUrl: '/images/products/studio-one-headphones.svg',
          imageAlt: 'Over-ear headphones in a deep forest green finish',
          badge: 'Bestseller',
          price: 'PKR 219',
          detail: '4.8 · 96 reviews',
        }),
        card('stack-stoneware-set', 'Stack Stoneware Set', 'Made for everyday gatherings.', {
          eyebrow: 'Kitchen',
          imageUrl: '/images/products/stack-stoneware-set.svg',
          imageAlt: 'Stacked hand-glazed plates and a matching serving bowl',
          badge: 'A new favourite',
          price: 'PKR 124',
          detail: '4.8 · 47 reviews',
        }),
      ],
      { actionLabel: 'Explore the collection', actionHref: '/shop' },
    ),
    section(
      'best-sellers',
      'products',
      'THE OFTEN-CHOSEN EDIT',
      'Good things, repeated.',
      'Considered essentials that have already found a place in everyday life.',
      [
        card('best-headphones', 'Studio One Headphones', 'A quieter world, well heard.', {
          eyebrow: 'Electronics',
          imageUrl: '/images/products/studio-one-headphones.svg',
          imageAlt: 'Over-ear headphones in a deep forest green finish',
          badge: 'Bestseller',
          price: 'PKR 219',
          detail: '4.8 · 96 reviews',
        }),
        card('best-cedar', 'Cedar No. 04', 'Warm woods, softened by light.', {
          eyebrow: 'Beauty',
          imageUrl: '/images/products/cedar-no-four.svg',
          imageAlt: 'Amber glass fragrance bottle with a brushed brass cap',
          badge: 'Small batch',
          price: 'PKR 112',
          detail: '4.9 · 83 reviews',
        }),
        card('best-tote', 'Everyday Carry Tote', 'Room for the little in-betweens.', {
          eyebrow: 'Accessories',
          imageUrl: '/images/products/everyday-carry-tote.svg',
          imageAlt: 'Structured canvas tote with long leather handles',
          badge: 'Bestseller',
          price: 'PKR 84',
          detail: '4.8 · 112 reviews',
        }),
        card('best-lamp', 'Form Study Lamp', 'Soft light, sculptural form.', {
          eyebrow: 'Home living',
          imageUrl: '/images/products/form-study-lamp.svg',
          imageAlt: 'Sculptural ceramic table lamp in warm ivory',
          badge: 'A new favourite',
          price: 'PKR 148',
          detail: '4.9 · 128 reviews',
        }),
      ],
      { actionLabel: 'Shop best sellers', actionHref: '/shop?featured=1' },
    ),
    section(
      'trending',
      'products',
      'A MOMENT IN GOOD FORM',
      'Worth a closer look.',
      'Thoughtful forms and familiar rituals, seen in a new light.',
      [
        card('trending-speaker', 'Field Notes Speaker', 'Your soundtrack, wherever you land.', {
          eyebrow: 'Electronics',
          imageUrl: '/images/products/field-notes-speaker.svg',
          imageAlt: 'Compact portable speaker wrapped in woven olive fabric',
          badge: 'Just arrived',
          price: 'PKR 132',
          detail: '4.7 · 61 reviews',
        }),
        card('trending-pour-over', 'Daily Ritual Pour-over', 'A slower start, by design.', {
          eyebrow: 'Kitchen',
          imageUrl: '/images/products/daily-ritual-pour-over.svg',
          imageAlt: 'Hand-finished stoneware pour-over set and cup',
          badge: 'Just arrived',
          price: 'PKR 68',
          detail: '4.7 · 58 reviews',
        }),
        card('trending-stoneware', 'Stack Stoneware Set', 'Made for everyday gatherings.', {
          eyebrow: 'Kitchen',
          imageUrl: '/images/products/stack-stoneware-set.svg',
          imageAlt: 'Stacked hand-glazed plates and a matching serving bowl',
          badge: 'A new favourite',
          price: 'PKR 124',
          detail: '4.8 · 47 reviews',
        }),
        card('trending-throw', 'Soft Form Linen Throw', 'Naturally textured, endlessly useful.', {
          eyebrow: 'Home living',
          imageUrl: '/images/products/soft-form-throw.svg',
          imageAlt: 'Folded natural linen throw with soft woven texture',
          badge: 'Small batch',
          price: 'PKR 96',
          detail: '4.9 · 74 reviews',
        }),
      ],
      { actionLabel: 'Explore what is trending', actionHref: '/shop' },
    ),
    section(
      'campaign',
      'campaign',
      'A NOTE ON LIVING WELL',
      'Less, but better.',
      'Good design doesn’t ask for attention. It earns a place in your everyday—and stays.',
      [],
      {
        actionLabel: 'Get to know AlSera',
        actionHref: '/about',
      },
    ),
    section(
      'benefits',
      'benefits',
      'THE EVERYDAY, ELEVATED',
      'Small details. Better days.',
      'Shopping should leave room for the good part: finding something that feels just right.',
      [
        card('fast-delivery', 'Fast delivery', 'A clear journey from checkout through arrival.'),
        card('easy-checkout', 'Easy checkout', 'A straightforward path from basket to checkout.'),
        card(
          'verified-products',
          'Verified products',
          'Helpful details to choose with a little more confidence.',
        ),
        card('best-prices', 'Best prices', 'Clear pricing, presented without surprises.'),
        card(
          'customer-satisfaction',
          'Customer satisfaction',
          'A calmer shopping experience, shaped around people.',
        ),
        card(
          'responsive-support',
          'Responsive support',
          'Helpful guidance, whenever a question comes up.',
        ),
      ],
    ),
    section(
      'brands',
      'brands',
      'GOOD COMPANY',
      'A few names we admire.',
      'Brand marks shown as visual placeholders.',
      [
        card('form-field', 'FORM & FIELD'),
        card('north-still', 'NORTH / STILL'),
        card('morrow', 'morrow'),
        card('common-objects', 'COMMON OBJECTS'),
        card('atelier-08', 'ATELIER 08'),
        card('goodform', 'GOODFORM'),
      ],
    ),
    section(
      'testimonials',
      'testimonials',
      'KIND WORDS, QUIETLY SHARED',
      'A feeling worth passing on.',
      'A little glimpse of the experience we hope to create.',
      [
        card(
          'avery-review',
          'Avery R.',
          'The details feel considered without trying too hard. It made choosing something for our home feel genuinely enjoyable.',
          { eyebrow: 'Portland, OR', detail: 'AR' },
        ),
        card(
          'morgan-review',
          'Morgan L.',
          'A lovely edit of pieces I would not have found in the usual places. The whole experience feels calm and personal.',
          { eyebrow: 'Brooklyn, NY', detail: 'ML' },
        ),
        card(
          'jordan-review',
          'Jordan P.',
          'I came for one small thing and left with a new favourite daily ritual. Thoughtful design really does make a difference.',
          { eyebrow: 'Austin, TX', detail: 'JP' },
        ),
      ],
    ),
    section(
      'brand-campaign',
      'campaign',
      'A MORE CONSIDERED KIND OF EVERYDAY',
      'Make room for what matters.',
      'Find thoughtful pieces for the rituals, corners, and little moments that make a place yours.',
      [],
      {
        actionLabel: 'Find your next favourite',
        actionHref: '/shop',
      },
    ),
    section(
      'social-proof',
      'stats',
      'A COMMUNITY IN THE MAKING',
      'Good things travel.',
      'Illustrative counters for design preview—not verified business metrics.',
      [
        card('community', 'A growing community', '', { detail: '12k+' }),
        card('thoughtful-finds', 'Thoughtful finds', '', { detail: '240+' }),
        card('good-reviews', 'Kind words shared', '', { detail: '4.9/5' }),
      ],
    ),
    section(
      'faq',
      'faq',
      'A FEW HELPFUL DETAILS',
      'Good to know.',
      'Answers to common questions about shopping with AlSera.',
      [
        card(
          'delivery',
          'How does delivery work?',
          'Delivery options and timing are shown with each order.',
        ),
        card(
          'returns',
          'Can I return an item?',
          'Return eligibility and timeframes depend on the final store policy.',
        ),
        card(
          'payments',
          'Which payment methods are accepted?',
          'Available payment methods are shown securely at checkout.',
        ),
      ],
    ),
  ],
};

export function parseHomepageContent(value: unknown): HomepageContent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const document = value as Partial<HomepageContent>;
  if (!document.hero || typeof document.hero !== 'object' || !Array.isArray(document.sections)) {
    return null;
  }
  const requiredHeroFields: (keyof HomepageContent['hero'])[] = [
    'eyebrow',
    'title',
    'description',
    'signature',
    'imageUrl',
    'imageAlt',
    'primaryLabel',
    'primaryHref',
    'secondaryLabel',
    'secondaryHref',
  ];
  if (!requiredHeroFields.every((field) => typeof document.hero?.[field] === 'string')) {
    return null;
  }
  const shopHero = document.shopHero;
  if (
    shopHero !== undefined &&
    (!shopHero ||
      typeof shopHero !== 'object' ||
      typeof shopHero.imageUrl !== 'string' ||
      typeof shopHero.imageAlt !== 'string')
  ) {
    return null;
  }
  const validKinds: HomepageSectionKind[] = [
    'categories',
    'collections',
    'products',
    'benefits',
    'brands',
    'testimonials',
    'stats',
    'faq',
    'campaign',
  ];
  for (const section of document.sections) {
    if (
      !section ||
      typeof section !== 'object' ||
      typeof section.id !== 'string' ||
      !validKinds.includes(section.kind) ||
      typeof section.enabled !== 'boolean' ||
      typeof section.title !== 'string' ||
      typeof section.eyebrow !== 'string' ||
      typeof section.description !== 'string' ||
      typeof section.imageUrl !== 'string' ||
      typeof section.imageAlt !== 'string' ||
      typeof section.actionLabel !== 'string' ||
      typeof section.actionHref !== 'string' ||
      !Array.isArray(section.cards) ||
      !section.cards.every(
        (item) =>
          item &&
          typeof item.id === 'string' &&
          typeof item.eyebrow === 'string' &&
          typeof item.title === 'string' &&
          typeof item.description === 'string' &&
          typeof item.imageUrl === 'string' &&
          typeof item.imageAlt === 'string' &&
          (item.productId === undefined || typeof item.productId === 'string') &&
          typeof item.badge === 'string' &&
          typeof item.actionLabel === 'string' &&
          typeof item.actionHref === 'string' &&
          typeof item.price === 'string' &&
          typeof item.detail === 'string',
      )
    ) {
      return null;
    }
  }
  return {
    ...document,
    shopHero: shopHero ?? structuredClone(defaultHomepageContent.shopHero),
  } as HomepageContent;
}

export function homepageContentToJson(content: HomepageContent): Json {
  return JSON.parse(JSON.stringify(content)) as Json;
}

export function validateHomepageContent(content: HomepageContent): string | null {
  const isValidHref = (href: string) => {
    if (!href) return true;
    if (href.startsWith('/') && !href.startsWith('//')) return true;
    try {
      return new URL(href).protocol === 'https:';
    } catch {
      return false;
    }
  };
  const validateAction = (label: string, href: string, location: string) => {
    if (Boolean(label) !== Boolean(href)) {
      return `${location} needs both a button label and a link, or neither.`;
    }
    if (!isValidHref(href)) {
      return `${location} link must be a site path or a secure HTTPS URL.`;
    }
    return null;
  };

  if (!content.hero.title.trim()) {
    return 'Add a heading to the hero before publishing.';
  }
  if (content.hero.imageUrl && !isValidHref(content.hero.imageUrl)) {
    return 'The hero image must use a site path or a secure HTTPS URL.';
  }
  if (content.hero.imageUrl && !content.hero.imageAlt.trim()) {
    return 'Add alternative text for the hero image before publishing.';
  }
  if (content.shopHero.imageUrl && !isValidHref(content.shopHero.imageUrl)) {
    return 'The shop banner image must use a site path or a secure HTTPS URL.';
  }
  if (content.shopHero.imageUrl && !content.shopHero.imageAlt.trim()) {
    return 'Add alternative text for the shop banner image before publishing.';
  }
  for (const [label, href, location] of [
    [content.hero.primaryLabel, content.hero.primaryHref, 'The hero primary button'],
    [content.hero.secondaryLabel, content.hero.secondaryHref, 'The hero secondary button'],
  ]) {
    const error = validateAction(label, href, location);
    if (error) return error;
  }

  const sectionIds = new Set<string>();
  for (const section of content.sections) {
    if (sectionIds.has(section.id)) {
      return `The section identifier "${section.id}" is used more than once.`;
    }
    sectionIds.add(section.id);
    if (!section.enabled) continue;
    if (!section.title.trim()) {
      return 'Every visible section needs a heading before publishing.';
    }
    if (section.imageUrl && !section.imageAlt.trim()) {
      return `Add alternative text for the "${section.title}" banner image.`;
    }
    if (section.imageUrl && !isValidHref(section.imageUrl)) {
      return `The banner image for "${section.title}" must use a site path or a secure HTTPS URL.`;
    }
    const actionError = validateAction(
      section.actionLabel,
      section.actionHref,
      `The "${section.title}" section button`,
    );
    if (actionError) return actionError;

    const cardIds = new Set<string>();
    for (const card of section.cards) {
      if (cardIds.has(card.id)) {
        return `The card identifier "${card.id}" is used more than once in "${section.title}".`;
      }
      cardIds.add(card.id);
      if (!card.title.trim()) {
        return `Every card in "${section.title}" needs a title.`;
      }
      if (card.imageUrl && !card.imageAlt.trim() && !card.productId) {
        return `Add alternative text for the "${card.title}" image.`;
      }
      if (card.imageUrl && !isValidHref(card.imageUrl)) {
        return `The image for "${card.title}" must use a site path or a secure HTTPS URL.`;
      }
      const cardActionError = validateAction(
        card.actionLabel,
        card.actionHref,
        `The "${card.title}" card button`,
      );
      if (cardActionError) return cardActionError;
    }
  }
  return null;
}
