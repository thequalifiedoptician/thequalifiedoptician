import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/features/auth/types/database';

type ProductRow = Database['public']['Tables']['products']['Row'];
type CategoryRow = Database['public']['Tables']['categories']['Row'];
type BrandRow = Database['public']['Tables']['brands']['Row'];

export type ShopProduct = ProductRow & {
  imageUrl: string | null;
  imageAlt: string;
  categoryName: string | null;
  brandName: string | null;
  inStock: boolean;
  hasVariants: boolean;
};

export type ShopCatalog = {
  products: ShopProduct[];
  categories: CategoryRow[];
  brands: BrandRow[];
};

function throwOnError(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

async function loadAllProducts(
  client: SupabaseClient<Database>,
  requestedProductIds?: string[],
): Promise<ProductRow[]> {
  const pageSize = 500;
  const products: ProductRow[] = [];

  if (requestedProductIds) {
    for (let offset = 0; offset < requestedProductIds.length; offset += pageSize) {
      const result = await client
        .from('products')
        .select('*')
        .eq('status', 'active')
        .in('id', requestedProductIds.slice(offset, offset + pageSize))
        .order('created_at', { ascending: false });
      throwOnError(result.error);
      if (!result.data) {
        throw new Error('The product catalog could not be loaded.');
      }
      products.push(...result.data);
    }
    return products;
  }

  for (let offset = 0; ; offset += pageSize) {
    const result = await client
      .from('products')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);
    throwOnError(result.error);

    const page = result.data;
    if (!page) {
      throw new Error('The product catalog could not be loaded.');
    }
    products.push(...page);
    if (page.length < pageSize) {
      return products;
    }
  }
}

export async function loadShopCatalog(
  client: SupabaseClient<Database>,
  requestedProductIds?: string[],
): Promise<ShopCatalog> {
  if (requestedProductIds && requestedProductIds.length === 0) {
    return { products: [], categories: [], brands: [] };
  }
  const products = await loadAllProducts(client, requestedProductIds);
  const categoryIds = [...new Set(products.flatMap(({ category_id }) => category_id ?? []))];
  const brandIds = [...new Set(products.flatMap(({ brand_id }) => brand_id ?? []))];
  const [categoriesResult, brandsResult] = await Promise.all([
    requestedProductIds
      ? categoryIds.length
        ? client.from('categories').select('*').eq('is_active', true).in('id', categoryIds)
        : Promise.resolve({ data: [], error: null })
      : client
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order')
          .order('name'),
    requestedProductIds
      ? brandIds.length
        ? client.from('brands').select('*').eq('is_active', true).in('id', brandIds)
        : Promise.resolve({ data: [], error: null })
      : client.from('brands').select('*').eq('is_active', true).order('name'),
  ]);

  throwOnError(categoriesResult.error);
  throwOnError(brandsResult.error);

  if (!categoriesResult.data || !brandsResult.data) {
    throw new Error('The product catalog returned incomplete data.');
  }

  const productIds = products.map((product) => product.id);
  const [images, availability, variantProductsResult] = await Promise.all([
    loadProductImages(client, productIds),
    loadAvailability(client, productIds),
    loadVariantProductIds(client, productIds),
  ]);
  const categoriesById = new Map<string, CategoryRow>();
  const brandsById = new Map<string, BrandRow>();
  const primaryImageByProduct = new Map<
    string,
    { image_url: string; alt_text: string; is_primary: boolean; display_order: number }
  >();
  const inStockByProduct = new Map(availability.map((item) => [item.product_id, item.in_stock]));
  const variantProductIds = new Set(variantProductsResult);

  for (const category of categoriesResult.data) {
    categoriesById.set(category.id, category);
  }
  for (const brand of brandsResult.data) {
    brandsById.set(brand.id, brand);
  }
  for (const image of images) {
    const current = primaryImageByProduct.get(image.product_id);
    if (
      !current ||
      (image.is_primary && !current.is_primary) ||
      (image.is_primary === current.is_primary && image.display_order < current.display_order)
    ) {
      primaryImageByProduct.set(image.product_id, image);
    }
  }

  return {
    categories: categoriesResult.data,
    brands: brandsResult.data,
    products: products.map((product) => {
      const image = primaryImageByProduct.get(product.id);
      return {
        ...product,
        imageUrl: image?.image_url ?? product.thumbnail_url,
        imageAlt: image?.alt_text || product.name,
        categoryName: product.category_id
          ? (categoriesById.get(product.category_id)?.name ?? null)
          : null,
        brandName: product.brand_id ? (brandsById.get(product.brand_id)?.name ?? null) : null,
        inStock: inStockByProduct.get(product.id) ?? false,
        hasVariants: variantProductIds.has(product.id),
      };
    }),
  };
}

async function loadVariantProductIds(
  client: SupabaseClient<Database>,
  productIds: string[],
): Promise<string[]> {
  const batchSize = 500;
  const pageSize = 500;
  const productIdsWithVariants = new Set<string>();

  for (let productOffset = 0; productOffset < productIds.length; productOffset += batchSize) {
    const batch = productIds.slice(productOffset, productOffset + batchSize);
    for (let offset = 0; ; offset += pageSize) {
      const result = await client
        .from('product_variants')
        .select('product_id')
        .in('product_id', batch)
        .eq('is_active', true)
        .range(offset, offset + pageSize - 1);
      throwOnError(result.error);
      if (!result.data) {
        throw new Error('Product options could not be loaded.');
      }
      for (const variant of result.data) {
        productIdsWithVariants.add(variant.product_id);
      }
      if (result.data.length < pageSize) {
        break;
      }
    }
  }

  return [...productIdsWithVariants];
}

async function loadProductImages(
  client: SupabaseClient<Database>,
  productIds: string[],
): Promise<
  Array<{
    product_id: string;
    image_url: string;
    alt_text: string;
    display_order: number;
    is_primary: boolean;
  }>
> {
  const pageSize = 500;
  const images: Array<{
    product_id: string;
    image_url: string;
    alt_text: string;
    display_order: number;
    is_primary: boolean;
  }> = [];

  for (let productOffset = 0; productOffset < productIds.length; productOffset += pageSize) {
    const batch = productIds.slice(productOffset, productOffset + pageSize);
    for (let offset = 0; ; offset += pageSize) {
      const result = await client
        .from('product_images')
        .select('product_id, image_url, alt_text, display_order, is_primary')
        .in('product_id', batch)
        .order('product_id')
        .order('display_order')
        .range(offset, offset + pageSize - 1);
      throwOnError(result.error);
      if (!result.data) {
        throw new Error('Product images could not be loaded.');
      }
      images.push(...result.data);
      if (result.data.length < pageSize) {
        break;
      }
    }
  }
  return images;
}

async function loadAvailability(
  client: SupabaseClient<Database>,
  productIds: string[],
): Promise<Array<{ product_id: string; in_stock: boolean }>> {
  const batchSize = 500;
  const availability: Array<{ product_id: string; in_stock: boolean }> = [];

  for (let offset = 0; offset < productIds.length; offset += batchSize) {
    const result = await client.rpc('get_public_product_availability', {
      p_product_ids: productIds.slice(offset, offset + batchSize),
    });
    throwOnError(result.error);
    if (!result.data) {
      throw new Error('Product availability could not be loaded.');
    }
    availability.push(...result.data);
  }

  return availability;
}
