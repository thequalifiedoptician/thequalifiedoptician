import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/features/auth/types/database';
import type { ShopProduct } from '@/features/catalog/shop/productListingService';

export type ProductRow = Database['public']['Tables']['products']['Row'];
type ProductImageRow = Database['public']['Tables']['product_images']['Row'];
type ProductVariantRow = Database['public']['Tables']['product_variants']['Row'];

export type AvailableProductVariant = ProductVariantRow & {
  inStock: boolean;
};

export type ProductDetails = {
  product: ProductRow;
  images: ProductImageRow[];
  variants: AvailableProductVariant[];
  categoryName: string | null;
  brandName: string | null;
  inStock: boolean;
};

function throwOnError(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

export async function loadProductDetails(
  client: SupabaseClient<Database>,
  slug: string,
): Promise<ProductDetails | null> {
  const productResult = await client
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle();

  throwOnError(productResult.error);
  if (!productResult.data) {
    return null;
  }

  const product = productResult.data;
  const [images, categoryName, brandName, inStock, variants] = await Promise.all([
    loadProductImages(client, product.id),
    loadCategoryName(client, product.category_id),
    loadBrandName(client, product.brand_id),
    loadProductAvailability(client, product.id),
    loadProductVariants(client, product.id),
  ]);

  return { product, images, variants, categoryName, brandName, inStock };
}

async function loadProductVariants(
  client: SupabaseClient<Database>,
  productId: string,
): Promise<AvailableProductVariant[]> {
  const result = await client
    .from('product_variants')
    .select('*')
    .eq('product_id', productId)
    .eq('is_active', true)
    .order('sku');

  throwOnError(result.error);
  if (!result.data) {
    throw new Error('Product variants could not be loaded.');
  }
  if (result.data.length === 0) {
    return [];
  }

  const availabilityResult = await client.rpc('get_public_variant_availability', {
    p_variant_ids: result.data.map((variant) => variant.id),
  });
  throwOnError(availabilityResult.error);
  if (!availabilityResult.data) {
    throw new Error('Variant availability could not be loaded.');
  }

  const availabilityById = new Map(
    availabilityResult.data.map((availability) => [availability.variant_id, availability.in_stock]),
  );
  return result.data.map((variant) => ({
    ...variant,
    inStock: availabilityById.get(variant.id) ?? false,
  }));
}

async function loadProductImages(
  client: SupabaseClient<Database>,
  productId: string,
): Promise<ProductImageRow[]> {
  const result = await client
    .from('product_images')
    .select('*')
    .eq('product_id', productId)
    .order('is_primary', { ascending: false })
    .order('display_order')
    .order('id');

  throwOnError(result.error);
  if (!result.data) {
    throw new Error('Product images could not be loaded.');
  }

  return result.data;
}

async function loadCategoryName(
  client: SupabaseClient<Database>,
  categoryId: string | null,
): Promise<string | null> {
  if (!categoryId) {
    return null;
  }

  const result = await client
    .from('categories')
    .select('name')
    .eq('id', categoryId)
    .eq('is_active', true)
    .maybeSingle();

  throwOnError(result.error);
  return result.data?.name ?? null;
}

async function loadBrandName(
  client: SupabaseClient<Database>,
  brandId: string | null,
): Promise<string | null> {
  if (!brandId) {
    return null;
  }

  const result = await client
    .from('brands')
    .select('name')
    .eq('id', brandId)
    .eq('is_active', true)
    .maybeSingle();

  throwOnError(result.error);
  return result.data?.name ?? null;
}

async function loadProductAvailability(
  client: SupabaseClient<Database>,
  productId: string,
): Promise<boolean> {
  const result = await client.rpc('get_public_product_availability', {
    p_product_ids: [productId],
  });

  throwOnError(result.error);
  const availability = result.data?.find((item) => item.product_id === productId);
  if (!availability) {
    throw new Error('Product availability could not be loaded.');
  }

  return availability.in_stock;
}

export async function loadRelatedProducts(
  client: SupabaseClient<Database>,
  product: ProductRow,
): Promise<ShopProduct[]> {
  const categoryProducts = product.category_id
    ? await client
        .from('products')
        .select('*')
        .eq('status', 'active')
        .eq('category_id', product.category_id)
        .neq('id', product.id)
        .order('created_at', { ascending: false })
        .limit(8)
    : null;
  if (categoryProducts) {
    throwOnError(categoryProducts.error);
  }

  const brandProducts = product.brand_id
    ? await client
        .from('products')
        .select('*')
        .eq('status', 'active')
        .eq('brand_id', product.brand_id)
        .neq('id', product.id)
        .order('created_at', { ascending: false })
        .limit(8)
    : null;
  if (brandProducts) {
    throwOnError(brandProducts.error);
  }

  const relatedById = new Map<string, ProductRow>();
  for (const related of categoryProducts?.data ?? []) {
    relatedById.set(related.id, related);
  }
  for (const related of brandProducts?.data ?? []) {
    if (relatedById.size >= 8) {
      break;
    }
    relatedById.set(related.id, related);
  }

  const relatedRows = [...relatedById.values()].slice(0, 8);
  if (relatedRows.length === 0) {
    return [];
  }

  const relatedIds = relatedRows.map((related) => related.id);
  const categoryIds = [
    ...new Set(
      relatedRows.flatMap((related) => (related.category_id ? [related.category_id] : [])),
    ),
  ];
  const brandIds = [
    ...new Set(relatedRows.flatMap((related) => (related.brand_id ? [related.brand_id] : []))),
  ];
  const [imagesResult, availabilityResult, categories, brands, variantsResult] = await Promise.all([
    client
      .from('product_images')
      .select('product_id, image_url, alt_text, is_primary, display_order')
      .in('product_id', relatedIds)
      .order('is_primary', { ascending: false })
      .order('display_order')
      .order('id'),
    client.rpc('get_public_product_availability', { p_product_ids: relatedIds }),
    loadCategoryNames(client, categoryIds),
    loadBrandNames(client, brandIds),
    client
      .from('product_variants')
      .select('product_id')
      .in('product_id', relatedIds)
      .eq('is_active', true),
  ]);
  throwOnError(imagesResult.error);
  throwOnError(availabilityResult.error);
  throwOnError(variantsResult.error);

  if (!imagesResult.data || !availabilityResult.data || !variantsResult.data) {
    throw new Error('Related product information could not be loaded.');
  }

  const imageByProduct = new Map<
    string,
    { image_url: string; alt_text: string; is_primary: boolean; display_order: number }
  >();
  for (const image of imagesResult.data) {
    if (!imageByProduct.has(image.product_id)) {
      imageByProduct.set(image.product_id, image);
    }
  }
  const inStockByProduct = new Map(
    availabilityResult.data.map((availability) => [availability.product_id, availability.in_stock]),
  );
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
  const brandNameById = new Map(brands.map((brand) => [brand.id, brand.name]));
  const variantProductIds = new Set(variantsResult.data.map((variant) => variant.product_id));

  return relatedRows.map((related) => {
    const image = imageByProduct.get(related.id);
    return {
      ...related,
      imageUrl: image?.image_url ?? related.thumbnail_url,
      imageAlt: image?.alt_text || related.name,
      categoryName: related.category_id
        ? (categoryNameById.get(related.category_id) ?? null)
        : null,
      brandName: related.brand_id ? (brandNameById.get(related.brand_id) ?? null) : null,
      inStock: inStockByProduct.get(related.id) ?? false,
      hasVariants: variantProductIds.has(related.id),
    };
  });
}

async function loadCategoryNames(
  client: SupabaseClient<Database>,
  categoryIds: string[],
): Promise<Array<{ id: string; name: string }>> {
  if (categoryIds.length === 0) {
    return [];
  }
  const result = await client
    .from('categories')
    .select('id, name')
    .eq('is_active', true)
    .in('id', categoryIds);
  throwOnError(result.error);
  if (!result.data) {
    throw new Error('Related product categories could not be loaded.');
  }
  return result.data;
}

async function loadBrandNames(
  client: SupabaseClient<Database>,
  brandIds: string[],
): Promise<Array<{ id: string; name: string }>> {
  if (brandIds.length === 0) {
    return [];
  }
  const result = await client
    .from('brands')
    .select('id, name')
    .eq('is_active', true)
    .in('id', brandIds);
  throwOnError(result.error);
  if (!result.data) {
    throw new Error('Related product brands could not be loaded.');
  }
  return result.data;
}
