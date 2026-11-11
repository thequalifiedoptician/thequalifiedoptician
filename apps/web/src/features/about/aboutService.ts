import { getSupabaseClient } from '@/lib/supabase';
import type { Json } from '@/features/auth/types/database';
import {
  aboutPageContentToJson,
  defaultAboutPageContent,
  parseAboutPageContent,
  type AboutPageContent,
} from './aboutContent';

const ABOUT_IMAGE_BUCKET = 'about-assets';
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

async function loadAboutContent(column: 'draft_content' | 'content'): Promise<AboutPageContent> {
  const client = await getSupabaseClient();
  let savedContent: Json | null = null;
  if (column === 'draft_content') {
    const { data, error } = await client
      .from('about_page_content')
      .select('draft_content')
      .eq('id', 1)
      .maybeSingle();
    if (error) {
      throw new Error(`About page draft could not be loaded: ${error.message}`);
    }
    savedContent = data?.draft_content ?? null;
  } else {
    const { data, error } = await client
      .from('published_about_page_content')
      .select('content')
      .maybeSingle();
    if (error) {
      throw new Error(`About page content could not be loaded: ${error.message}`);
    }
    savedContent = data?.content ?? null;
  }
  if (!savedContent) return structuredClone(defaultAboutPageContent);

  const content = parseAboutPageContent(savedContent);
  if (!content) {
    throw new Error('Saved About page content has an invalid format. Contact your administrator.');
  }
  return content;
}

export function loadAboutPageDraft(): Promise<AboutPageContent> {
  return loadAboutContent('draft_content');
}

export function loadPublishedAboutPage(): Promise<AboutPageContent> {
  return loadAboutContent('content');
}

export async function saveAboutPageDraft(
  content: AboutPageContent,
  publish: boolean,
): Promise<void> {
  const client = await getSupabaseClient();
  const { error } = await client.rpc('save_about_page_content', {
    p_content: aboutPageContentToJson(content),
    p_publish: publish,
  });
  if (error) {
    throw new Error(`About page could not be ${publish ? 'published' : 'saved'}: ${error.message}`);
  }
}

export async function uploadAboutImage(file: File): Promise<{ path: string; url: string }> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type) || file.size === 0 || file.size > MAX_IMAGE_SIZE) {
    throw new Error('Choose a JPG, PNG, WebP, or AVIF image up to 10 MB.');
  }

  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
  const path = `about/${crypto.randomUUID()}.${extension}`;
  const client = await getSupabaseClient();
  const { error } = await client.storage.from(ABOUT_IMAGE_BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw new Error(`About page image could not be uploaded: ${error.message}`);
  }

  const url = client.storage.from(ABOUT_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  return { path, url };
}
