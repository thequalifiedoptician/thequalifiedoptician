import { getSupabaseClient } from '@/lib/supabase';
import {
  defaultHomepageContent,
  homepageContentToJson,
  parseHomepageContent,
  type HomepageContent,
} from './homepageContent';

export type HomepageProductOption = {
  id: string;
  name: string;
  slug: string;
  status: 'draft' | 'active' | 'archived';
  short_description: string | null;
  price: number;
  thumbnail_url: string | null;
};

export async function loadHomepageDraft(): Promise<HomepageContent> {
  const client = await getSupabaseClient();
  const { data, error } = await client
    .from('homepage_content')
    .select('draft_content')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    throw new Error(`Homepage draft could not be loaded: ${error.message}`);
  }
  if (!data) {
    return structuredClone(defaultHomepageContent);
  }

  const parsedContent = parseHomepageContent(data.draft_content);
  if (!parsedContent) {
    throw new Error('The saved homepage draft has an invalid format. Contact your administrator.');
  }
  return parsedContent;
}

export async function loadHomepageProductOptions(): Promise<HomepageProductOption[]> {
  const client = await getSupabaseClient();
  const { data, error } = await client
    .from('products')
    .select('id, name, slug, status, short_description, price, thumbnail_url')
    .order('name');

  if (error) {
    throw new Error(`Catalog products could not be loaded: ${error.message}`);
  }
  return data;
}

export async function saveHomepageDraft(content: HomepageContent, publish: boolean): Promise<void> {
  const client = await getSupabaseClient();
  const { error } = await client.rpc('save_homepage_content', {
    p_content: homepageContentToJson(content),
    p_publish: publish,
  });

  if (error) {
    throw new Error(
      `Homepage content could not be ${publish ? 'published' : 'saved'}: ${error.message}`,
    );
  }
}

export async function loadPublishedHomepage(): Promise<HomepageContent> {
  const client = await getSupabaseClient();
  const { data, error } = await client
    .from('published_homepage_content')
    .select('content')
    .maybeSingle();

  if (error) {
    throw new Error(`Homepage content could not be loaded: ${error.message}`);
  }

  if (!data) {
    return defaultHomepageContent;
  }

  const parsedContent = parseHomepageContent(data.content);
  if (!parsedContent) {
    throw new Error('Published homepage content is invalid. Contact the store administrator.');
  }

  const productIds = [
    ...new Set(
      parsedContent.sections
        .flatMap((section) => section.cards)
        .map((card) => card.productId)
        .filter(Boolean),
    ),
  ];
  if (!productIds.length) {
    return parsedContent;
  }

  const { data: products, error: productsError } = await client
    .from('products')
    .select('id, name, slug, short_description, price, thumbnail_url')
    .in('id', productIds)
    .eq('status', 'active');
  if (productsError) {
    throw new Error(`Homepage products could not be loaded: ${productsError.message}`);
  }

  const productsById = new Map(products.map((product) => [product.id, product]));
  return {
    ...parsedContent,
    sections: parsedContent.sections
      .map((section) => ({
        ...section,
        cards: section.cards.flatMap((card) => {
          if (!card.productId) {
            return [card];
          }
          const product = productsById.get(card.productId);
          if (!product) {
            return [];
          }
          return [
            {
              ...card,
              title: product.name,
              description: product.short_description ?? card.description,
              imageUrl: product.thumbnail_url ?? card.imageUrl,
              imageAlt: product.name,
              price: `$${Number(product.price).toFixed(2)}`,
              actionLabel: card.actionLabel || 'View product',
              actionHref: `/shop/${encodeURIComponent(product.slug)}`,
            },
          ];
        }),
      }))
      .filter((section) => section.kind !== 'products' || section.cards.length > 0),
  };
}

export async function uploadShopHeroImage(file: File): Promise<string> {
  const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
  if (!allowedTypes.has(file.type)) {
    throw new Error('Choose a JPG, PNG, WebP, or AVIF image.');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('The shop banner image must be 10 MB or smaller.');
  }

  const client = await getSupabaseClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/gu, '-');
  const path = `homepage/shop-hero/${crypto.randomUUID()}-${safeName}`;
  const { error } = await client.storage
    .from('product-images')
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    throw new Error(`Shop banner image could not be uploaded: ${error.message}`);
  }
  return client.storage.from('product-images').getPublicUrl(path).data.publicUrl;
}

export async function loadPublishedShopHero(): Promise<HomepageContent['shopHero']> {
  const client = await getSupabaseClient();
  const { data, error } = await client
    .from('published_homepage_content')
    .select('content')
    .maybeSingle();

  if (error) {
    throw new Error(`Shop banner could not be loaded: ${error.message}`);
  }
  if (!data) {
    return defaultHomepageContent.shopHero;
  }

  const parsedContent = parseHomepageContent(data.content);
  if (!parsedContent) {
    throw new Error('Published shop banner content is invalid. Contact the store administrator.');
  }
  return parsedContent.shopHero;
}
