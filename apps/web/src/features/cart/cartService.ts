import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/features/auth/types/database';
import type { CartDisplayItem, CartItemRow } from './cartTypes';
import { MAX_CART_QUANTITY } from './cartUtils';

function throwOnError(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

export async function loadCartItems(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<CartDisplayItem[]> {
  const cartRows: CartItemRow[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const result = await client
      .from('cart_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);
    throwOnError(result.error);
    if (!result.data) {
      throw new Error('Your cart could not be loaded.');
    }
    cartRows.push(...result.data);
    if (result.data.length < pageSize) {
      break;
    }
  }
  if (cartRows.length === 0) {
    return [];
  }

  const productIds = [...new Set(cartRows.map(({ product_id }) => product_id))];
  const variantIds = [
    ...new Set(cartRows.flatMap(({ variant_id }) => (variant_id ? [variant_id] : []))),
  ];
  const baseProductIds = [
    ...new Set(cartRows.flatMap(({ variant_id, product_id }) => (variant_id ? [] : [product_id]))),
  ];
  const [productsResult, variantsResult, baseVariantsResult, imagesResult] = await Promise.all([
    client.from('products').select('*').in('id', productIds).eq('status', 'active'),
    variantIds.length
      ? client
          .from('product_variants')
          .select('id, sku, color, size, material, price, product_id')
          .in('id', variantIds)
          .eq('is_active', true)
      : Promise.resolve({ data: [], error: null }),
    baseProductIds.length
      ? client
          .from('product_variants')
          .select('product_id')
          .in('product_id', baseProductIds)
          .eq('is_active', true)
      : Promise.resolve({ data: [], error: null }),
    client
      .from('product_images')
      .select('product_id, image_url, alt_text, is_primary, display_order')
      .in('product_id', productIds)
      .order('display_order'),
  ]);
  throwOnError(productsResult.error);
  throwOnError(variantsResult.error);
  throwOnError(baseVariantsResult.error);
  throwOnError(imagesResult.error);
  if (
    !productsResult.data ||
    !variantsResult.data ||
    !baseVariantsResult.data ||
    !imagesResult.data
  ) {
    throw new Error('Your cart returned incomplete product information.');
  }

  const products = productsResult.data;
  const categoryIds = [...new Set(products.flatMap(({ category_id }) => category_id ?? []))];
  const brandIds = [...new Set(products.flatMap(({ brand_id }) => brand_id ?? []))];
  const activeProductIds = products.map(({ id }) => id);
  const activeVariantIds = variantsResult.data.map(({ id }) => id);
  const [categoriesResult, brandsResult, productAvailabilityResult, variantAvailabilityResult] =
    await Promise.all([
      categoryIds.length
        ? client.from('categories').select('id, name').in('id', categoryIds).eq('is_active', true)
        : Promise.resolve({ data: [], error: null }),
      brandIds.length
        ? client.from('brands').select('id, name').in('id', brandIds).eq('is_active', true)
        : Promise.resolve({ data: [], error: null }),
      activeProductIds.length
        ? client.rpc('get_public_product_availability', { p_product_ids: activeProductIds })
        : Promise.resolve({ data: [], error: null }),
      activeVariantIds.length
        ? client.rpc('get_public_variant_availability', { p_variant_ids: activeVariantIds })
        : Promise.resolve({ data: [], error: null }),
    ]);
  throwOnError(categoriesResult.error);
  throwOnError(brandsResult.error);
  throwOnError(productAvailabilityResult.error);
  throwOnError(variantAvailabilityResult.error);

  const categoryById = new Map(
    (categoriesResult.data ?? []).map((category) => [category.id, category.name]),
  );
  const brandById = new Map((brandsResult.data ?? []).map((brand) => [brand.id, brand.name]));
  const variantProductIds = new Set(baseVariantsResult.data.map((variant) => variant.product_id));
  const imageByProductId = new Map<
    string,
    { image_url: string; alt_text: string; is_primary: boolean; display_order: number }
  >();
  for (const image of imagesResult.data) {
    const current = imageByProductId.get(image.product_id);
    if (
      !current ||
      (image.is_primary && !current.is_primary) ||
      (image.is_primary === current.is_primary && image.display_order < current.display_order)
    ) {
      imageByProductId.set(image.product_id, image);
    }
  }
  const productAvailability = new Map(
    (productAvailabilityResult.data ?? []).map(({ product_id, in_stock }) => [
      product_id,
      in_stock,
    ]),
  );
  const variantAvailability = new Map(
    (variantAvailabilityResult.data ?? []).map(({ variant_id, in_stock }) => [
      variant_id,
      in_stock,
    ]),
  );
  const productsById = new Map(
    products.map((product) => {
      const image = imageByProductId.get(product.id);
      return [
        product.id,
        {
          ...product,
          imageUrl: image?.image_url ?? product.thumbnail_url,
          imageAlt: image?.alt_text || product.name,
          categoryName: product.category_id
            ? (categoryById.get(product.category_id) ?? null)
            : null,
          brandName: product.brand_id ? (brandById.get(product.brand_id) ?? null) : null,
          inStock: productAvailability.get(product.id) ?? false,
          hasVariants: variantProductIds.has(product.id),
        },
      ];
    }),
  );
  const variantsById = new Map(variantsResult.data.map((variant) => [variant.id, variant]));

  return cartRows.map((row) => {
    const product = productsById.get(row.product_id) ?? null;
    const variantRecord = row.variant_id ? (variantsById.get(row.variant_id) ?? null) : null;
    const variant =
      variantRecord && variantRecord.product_id === row.product_id
        ? {
            id: variantRecord.id,
            sku: variantRecord.sku,
            color: variantRecord.color,
            size: variantRecord.size,
            material: variantRecord.material,
            price: variantRecord.price,
          }
        : null;
    return {
      ...row,
      product,
      variant,
      inStock:
        product !== null &&
        (row.variant_id
          ? variant !== null && variantAvailability.get(row.variant_id) === true
          : !product.hasVariants && product.inStock),
    };
  });
}

export async function addItemToCart(
  client: SupabaseClient<Database>,
  productId: string,
  variantId: string | null,
  quantity: number,
): Promise<CartItemRow> {
  const normalizedQuantity = Math.max(1, Math.min(MAX_CART_QUANTITY, Math.floor(quantity)));
  const { data, error } = await client.rpc('add_cart_item', {
    p_product_id: productId,
    p_variant_id: variantId,
    p_quantity: normalizedQuantity,
  });
  throwOnError(error);
  const item = data?.[0];
  if (!item) {
    throw new Error('The product could not be added to your cart.');
  }
  return item;
}

export async function updateCartItemQuantity(
  client: SupabaseClient<Database>,
  userId: string,
  itemId: string,
  quantity: number,
): Promise<CartItemRow> {
  const normalizedQuantity = Math.max(1, Math.min(MAX_CART_QUANTITY, Math.floor(quantity)));
  const { data, error } = await client
    .from('cart_items')
    .update({ quantity: normalizedQuantity })
    .eq('user_id', userId)
    .eq('id', itemId)
    .select('*')
    .single();
  throwOnError(error);
  if (!data) {
    throw new Error('The cart quantity could not be updated.');
  }
  return data;
}

export async function removeCartItem(
  client: SupabaseClient<Database>,
  userId: string,
  itemId: string,
): Promise<void> {
  const { error } = await client.from('cart_items').delete().eq('user_id', userId).eq('id', itemId);
  throwOnError(error);
}
