import type { Json } from '@/features/auth/types/database';

export type AboutPageContent = {
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    imagePath: string;
    imageUrl: string;
    imageAlt: string;
  };
  story: {
    eyebrow: string;
    title: string;
    body: string;
    imagePath: string;
    imageUrl: string;
    imageAlt: string;
  };
  values: { title: string; description: string }[];
  closing: { title: string; description: string };
};

export const defaultAboutPageContent: AboutPageContent = {
  hero: {
    eyebrow: 'A point of view, thoughtfully considered',
    title: 'Good things make a home.',
    description:
      'We believe the everyday deserves a little more thought. Our collection brings together well-made pieces that feel right to live with, return to, and make your own.',
    imagePath: '',
    imageUrl: '',
    imageAlt: 'A thoughtful collection of everyday pieces',
  },
  story: {
    eyebrow: 'OUR STORY',
    title: 'A more considered way to choose.',
    body: 'It began with a simple idea: the things around us should earn their place. We look for useful design, lasting quality, and small details that make everyday moments feel better.\n\nOur collection brings together pieces for home, style, technology, and the rituals in between. Each one is chosen with care, so finding something meaningful can feel simple.',
    imagePath: '',
    imageUrl: '',
    imageAlt: 'A calm, considered everyday setting',
  },
  values: [
    {
      title: 'Chosen with care',
      description: 'We look beyond what is new to find what is useful, well made, and worth keeping.',
    },
    {
      title: 'Made for real life',
      description: 'Thoughtful details matter most when they make everyday routines a little easier.',
    },
    {
      title: 'Room to be yourself',
      description: 'A good collection leaves space for your own taste, rituals, and way of living.',
    },
  ],
  closing: {
    title: 'Make room for what matters.',
    description: 'Find a few good things for the everyday moments that make a place feel like yours.',
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseCopy(value: unknown): { title: string; description: string } | null {
  if (!isRecord(value) || typeof value.title !== 'string' || typeof value.description !== 'string') {
    return null;
  }
  return { title: value.title, description: value.description };
}

function parseImageSection(
  value: unknown,
  fields: readonly string[],
): Record<string, string> | null {
  if (!isRecord(value) || !fields.every((field) => typeof value[field] === 'string')) {
    return null;
  }
  return Object.fromEntries(fields.map((field) => [field, value[field]])) as Record<string, string>;
}

export function parseAboutPageContent(value: unknown): AboutPageContent | null {
  if (!isRecord(value)) return null;
  const hero = parseImageSection(value.hero, [
    'eyebrow',
    'title',
    'description',
    'imagePath',
    'imageUrl',
    'imageAlt',
  ]);
  const story = parseImageSection(value.story, [
    'eyebrow',
    'title',
    'body',
    'imagePath',
    'imageUrl',
    'imageAlt',
  ]);
  const closing = parseCopy(value.closing);
  if (!hero || !story || !closing || !Array.isArray(value.values) || value.values.length !== 3) {
    return null;
  }
  const values = value.values.map(parseCopy);
  if (values.some((item) => item === null)) return null;

  return {
    hero: {
      eyebrow: hero.eyebrow,
      title: hero.title,
      description: hero.description,
      imagePath: hero.imagePath,
      imageUrl: hero.imageUrl,
      imageAlt: hero.imageAlt,
    },
    story: {
      eyebrow: story.eyebrow,
      title: story.title,
      body: story.body,
      imagePath: story.imagePath,
      imageUrl: story.imageUrl,
      imageAlt: story.imageAlt,
    },
    values: values as { title: string; description: string }[],
    closing,
  };
}

export function aboutPageContentToJson(content: AboutPageContent): Json {
  return JSON.parse(JSON.stringify(content)) as Json;
}

function isSafeImageUrl(value: string): boolean {
  if (!value) return true;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateAboutPageContent(content: AboutPageContent): string | null {
  if (!content.hero.title.trim()) return 'Add a heading to the About page hero.';
  if (!content.hero.description.trim()) return 'Add an introduction to the About page.';
  if (!content.story.title.trim() || !content.story.body.trim()) {
    return 'Add a heading and story text to the About page.';
  }
  if (content.values.some((value) => !value.title.trim() || !value.description.trim())) {
    return 'Add a title and description to each values card.';
  }
  if (!content.closing.title.trim() || !content.closing.description.trim()) {
    return 'Add a heading and description to the closing section.';
  }
  for (const [label, imageUrl, imageAlt] of [
    ['Hero', content.hero.imageUrl, content.hero.imageAlt],
    ['Story', content.story.imageUrl, content.story.imageAlt],
  ]) {
    if (!isSafeImageUrl(imageUrl)) return `${label} image must use a site path or HTTPS URL.`;
    if (imageUrl && !imageAlt.trim()) return `Add alternative text for the ${label.toLowerCase()} image.`;
  }
  return null;
}
