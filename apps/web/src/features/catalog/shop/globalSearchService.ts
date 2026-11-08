import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/features/auth/types/database';

type SearchProduct = Pick<
  Database['public']['Tables']['products']['Row'],
  'id' | 'name' | 'slug' | 'sku' | 'category_id' | 'brand_id' | 'created_at'
>;

export type GlobalSearchSuggestion = {
  id: string;
  label: string;
  detail: string;
  href: string;
  type: 'product' | 'category' | 'brand';
};

function throwOnError(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

export async function loadGlobalSearchSuggestions(
  client: SupabaseClient<Database>,
  rawQuery: string,
): Promise<GlobalSearchSuggestion[]> {
  const query = rawQuery.trim().slice(0, 80);
  if (query.length < 2) {
    return [];
  }

  const pattern = `%${query.replace(/[\\%_]/gu, '\\$&')}%`;
  const [nameMatches, skuMatches, slugMatches, categoriesResult, brandsResult] = await Promise.all([
    client
      .from('products')
      .select('id, name, slug, sku, category_id, brand_id, created_at')
      .eq('status', 'active')
      .ilike('name', pattern)
      .limit(5),
    client
      .from('products')
      .select('id, name, slug, sku, category_id, brand_id, created_at')
      .eq('status', 'active')
      .ilike('sku', pattern)
      .limit(5),
    client
      .from('products')
      .select('id, name, slug, sku, category_id, brand_id, created_at')
      .eq('status', 'active')
      .ilike('slug', pattern)
      .limit(5),
    client
      .from('categories')
      .select('id, name')
      .eq('is_active', true)
      .ilike('name', pattern)
      .limit(3),
    client.from('brands').select('id, name').eq('is_active', true).ilike('name', pattern).limit(3),
  ]);

  throwOnError(nameMatches.error);
  throwOnError(skuMatches.error);
  throwOnError(slugMatches.error);
  throwOnError(categoriesResult.error);
  throwOnError(brandsResult.error);

  const productsById = new Map<string, SearchProduct>();
  for (const product of [
    ...(nameMatches.data ?? []),
    ...(skuMatches.data ?? []),
    ...(slugMatches.data ?? []),
  ]) {
    productsById.set(product.id, product);
  }

  const matchedCategoryIds = (categoriesResult.data ?? []).map((category) => category.id);
  const matchedBrandIds = (brandsResult.data ?? []).map((brand) => brand.id);
  const [categoryProducts, brandProducts] = await Promise.all([
    matchedCategoryIds.length
      ? client
          .from('products')
          .select('id, name, slug, sku, category_id, brand_id, created_at')
          .eq('status', 'active')
          .in('category_id', matchedCategoryIds)
          .order('created_at', { ascending: false })
          .limit(5)
      : Promise.resolve(null),
    matchedBrandIds.length
      ? client
          .from('products')
          .select('id, name, slug, sku, category_id, brand_id, created_at')
          .eq('status', 'active')
          .in('brand_id', matchedBrandIds)
          .order('created_at', { ascending: false })
          .limit(5)
      : Promise.resolve(null),
  ]);

  if (categoryProducts) {
    throwOnError(categoryProducts.error);
    for (const product of categoryProducts.data ?? []) {
      productsById.set(product.id, product);
    }
  }
  if (brandProducts) {
    throwOnError(brandProducts.error);
    for (const product of brandProducts.data ?? []) {
      productsById.set(product.id, product);
    }
  }

  const productSuggestions: GlobalSearchSuggestion[] = [...productsById.values()]
    .slice(0, 5)
    .map((product) => ({
      id: product.id,
      label: product.name,
      detail: product.sku ?? 'Product',
      href: `/shop/${encodeURIComponent(product.slug)}`,
      type: 'product',
    }));
  const categorySuggestions: GlobalSearchSuggestion[] = (categoriesResult.data ?? []).map(
    (category) => ({
      id: category.id,
      label: category.name,
      detail: 'Category',
      href: `/shop?category=${encodeURIComponent(category.id)}`,
      type: 'category',
    }),
  );
  const brandSuggestions: GlobalSearchSuggestion[] = (brandsResult.data ?? []).map((brand) => ({
    id: brand.id,
    label: brand.name,
    detail: 'Brand',
    href: `/shop?brand=${encodeURIComponent(brand.id)}`,
    type: 'brand',
  }));

  return [...productSuggestions, ...categorySuggestions, ...brandSuggestions].slice(0, 7);
}
