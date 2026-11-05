import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/features/auth/types/database';

export type CatalogProduct = Database['public']['Tables']['products']['Row'];
export type CatalogCategory = Database['public']['Tables']['categories']['Row'];
export type CatalogBrand = Database['public']['Tables']['brands']['Row'];
export type CatalogImage = Database['public']['Tables']['product_images']['Row'];
export type CatalogVariant = Database['public']['Tables']['product_variants']['Row'];
export type CatalogInventory = Database['public']['Tables']['product_inventory']['Row'];

export type ProductImageInput = {
  id: string;
  imageUrl: string;
  storagePath: string | null;
  altText: string;
  file: File | null;
};

export type ProductVariantInput = {
  id: string;
  sku: string;
  color: string;
  size: string;
  material: string;
  price: string;
  quantityOnHand: string;
  quantityReserved: string;
};

export type ProductEditorInput = {
  id: string | null;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  brandId: string;
  sku: string;
  price: string;
  comparePrice: string;
  status: CatalogProduct['status'];
  featured: boolean;
  quantityOnHand: string;
  quantityReserved: string;
  images: ProductImageInput[];
  variants: ProductVariantInput[];
};

export type ProductDetails = {
  product: CatalogProduct;
  images: CatalogImage[];
  variants: CatalogVariant[];
  inventory: CatalogInventory[];
};

export type ProductSaveResult = {
  productId: string;
  warning: string | null;
};

export type ProductListItem = CatalogProduct & {
  availableQuantity: number;
};

const PRODUCT_IMAGE_BUCKET = 'product-images';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

function throwOnError(error: { message: string } | null): void {
  if (!error) {
    return;
  }

  if (error.message.includes('products_sku_lower_unique')) {
    throw new Error('That SKU is already assigned to another product.');
  }
  if (error.message.includes('products_slug_lower_unique')) {
    throw new Error('That slug is already in use. Choose a unique slug.');
  }
  if (error.message.includes('product_variants_sku_lower_unique')) {
    throw new Error('Each variant must have a unique SKU.');
  }

  throw new Error(error.message);
}

function requireData<T>(data: T | null, message: string): T {
  if (data === null) {
    throw new Error(message);
  }
  return data;
}

function inventoryPath(client: SupabaseClient<Database>) {
  return client.from('product_inventory');
}

export async function loadProductDashboard(client: SupabaseClient<Database>): Promise<{
  products: ProductListItem[];
  categories: CatalogCategory[];
  brands: CatalogBrand[];
}> {
  const [productsResult, categoriesResult, brandsResult, inventoryResult] = await Promise.all([
    client.from('products').select('*').order('created_at', { ascending: false }),
    client.from('categories').select('*').order('sort_order').order('name'),
    client.from('brands').select('*').order('name'),
    inventoryPath(client).select('product_id, available_quantity'),
  ]);

  throwOnError(productsResult.error);
  throwOnError(categoriesResult.error);
  throwOnError(brandsResult.error);
  throwOnError(inventoryResult.error);

  const products = requireData(productsResult.data, 'Products could not be loaded.');
  const categories = requireData(categoriesResult.data, 'Categories could not be loaded.');
  const brands = requireData(brandsResult.data, 'Brands could not be loaded.');
  const inventoryRows = requireData(inventoryResult.data, 'Inventory could not be loaded.');

  const availableByProduct = new Map<string, number>();
  for (const inventory of inventoryRows) {
    availableByProduct.set(
      inventory.product_id,
      (availableByProduct.get(inventory.product_id) ?? 0) + inventory.available_quantity,
    );
  }

  return {
    products: products.map((product) => ({
      ...product,
      availableQuantity: availableByProduct.get(product.id) ?? 0,
    })),
    categories,
    brands,
  };
}

export async function loadProductDetails(
  client: SupabaseClient<Database>,
  productId: string,
): Promise<ProductDetails> {
  const [productResult, imagesResult, variantsResult, inventoryResult] = await Promise.all([
    client.from('products').select('*').eq('id', productId).single(),
    client.from('product_images').select('*').eq('product_id', productId).order('display_order'),
    client.from('product_variants').select('*').eq('product_id', productId).order('created_at'),
    inventoryPath(client).select('*').eq('product_id', productId),
  ]);

  throwOnError(productResult.error);
  throwOnError(imagesResult.error);
  throwOnError(variantsResult.error);
  throwOnError(inventoryResult.error);

  return {
    product: requireData(productResult.data, 'The requested product was not found.'),
    images: requireData(imagesResult.data, 'Product images could not be loaded.'),
    variants: requireData(variantsResult.data, 'Product variants could not be loaded.'),
    inventory: requireData(inventoryResult.data, 'Product inventory could not be loaded.'),
  };
}

export async function saveProduct(
  client: SupabaseClient<Database>,
  input: ProductEditorInput,
): Promise<ProductSaveResult> {
  const productId = input.id ?? crypto.randomUUID();
  const sku = input.sku.trim();
  const slug = input.slug.trim().toLowerCase();
  const productPayload = {
    id: productId,
    category_id: input.categoryId || null,
    brand_id: input.brandId || null,
    name: input.name.trim(),
    slug,
    short_description: input.shortDescription.trim() || null,
    description: input.description.trim() || null,
    sku,
    price: Number(input.price),
    compare_price: input.comparePrice ? Number(input.comparePrice) : null,
    status: input.status,
    featured: input.featured,
    thumbnail_url: null as string | null,
  };

  const duplicateResult = await client.from('products').select('id, slug, sku');
  throwOnError(duplicateResult.error);
  const existingProducts = requireData(
    duplicateResult.data,
    'Product uniqueness could not be checked.',
  );
  const duplicate = existingProducts.find(
    (product) =>
      product.id !== input.id &&
      (product.slug.toLowerCase() === slug || product.sku.toLowerCase() === sku.toLowerCase()),
  );
  if (duplicate) {
    throw new Error(
      duplicate.slug.toLowerCase() === slug
        ? 'That slug is already in use. Choose a unique slug.'
        : 'That SKU is already assigned to another product.',
    );
  }

  const newlyUploadedPaths: string[] = [];
  let databaseSaved = false;
  let warning: string | null = null;
  try {
    const savedImages: Array<{
      image_url: string;
      storage_path: string | null;
      alt_text: string;
      display_order: number;
      is_primary: boolean;
    }> = [];

    const previousImagesResult = await client
      .from('product_images')
      .select('storage_path')
      .eq('product_id', productId);
    throwOnError(previousImagesResult.error);
    const previousImages = requireData(
      previousImagesResult.data,
      'Current product images could not be loaded.',
    );

    for (const [index, image] of input.images.entries()) {
      let imageUrl = image.imageUrl;
      let storagePath = image.storagePath;

      if (image.file) {
        validateImageFile(image.file);
        const safeName = image.file.name.replace(/[^a-zA-Z0-9._-]/gu, '-');
        storagePath = `${productId}/${crypto.randomUUID()}-${safeName}`;
        const uploadResult = await client.storage
          .from(PRODUCT_IMAGE_BUCKET)
          .upload(storagePath, image.file, { contentType: image.file.type, upsert: false });
        throwOnError(uploadResult.error);
        newlyUploadedPaths.push(storagePath);
        imageUrl = client.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(storagePath)
          .data.publicUrl;
      }

      savedImages.push({
        image_url: imageUrl,
        storage_path: storagePath,
        alt_text: image.altText.trim(),
        display_order: index,
        is_primary: index === 0,
      });
    }

    const variants = input.variants.filter((variant) => variant.sku.trim());
    const variantPayloads = variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku.trim(),
      color: variant.color.trim() || null,
      size: variant.size.trim() || null,
      material: variant.material.trim() || null,
      price: variant.price ? Number(variant.price) : null,
    }));

    const inventoryRows =
      variantPayloads.length > 0
        ? variants.map((variant) => ({
            variant_id: variant.id,
            quantity_on_hand: Number(variant.quantityOnHand || 0),
            quantity_reserved: Number(variant.quantityReserved || 0),
          }))
        : [
            {
              variant_id: null,
              quantity_on_hand: Number(input.quantityOnHand || 0),
              quantity_reserved: Number(input.quantityReserved || 0),
            },
          ];

    productPayload.thumbnail_url = savedImages[0]?.image_url ?? null;
    const saveResult = await client.rpc('save_catalog_product', {
      p_product: productPayload,
      p_images: savedImages,
      p_variants: variantPayloads,
      p_inventory: inventoryRows,
    });
    throwOnError(saveResult.error);
    databaseSaved = true;

    const retainedPaths = new Set(savedImages.map((image) => image.storage_path).filter(Boolean));
    const removedPaths = previousImages
      .map((image) => image.storage_path)
      .filter((path): path is string => Boolean(path) && !retainedPaths.has(path));
    if (removedPaths.length > 0) {
      const removeResult = await client.storage.from(PRODUCT_IMAGE_BUCKET).remove(removedPaths);
      throwOnError(removeResult.error);
    }
  } catch (error) {
    if (!databaseSaved && newlyUploadedPaths.length > 0) {
      const cleanupResult = await client.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .remove(newlyUploadedPaths);
      if (cleanupResult.error) {
        throw new Error(
          `${getErrorMessage(error)} New image cleanup failed: ${cleanupResult.error.message}`,
        );
      }
    }
    if (databaseSaved) {
      warning = `Product saved, but old image cleanup failed: ${getErrorMessage(error)}`;
    } else {
      throw error;
    }
  }

  return { productId, warning };
}

export async function deleteProduct(
  client: SupabaseClient<Database>,
  productId: string,
): Promise<string | null> {
  const imagesResult = await client
    .from('product_images')
    .select('storage_path')
    .eq('product_id', productId);
  throwOnError(imagesResult.error);
  const images = requireData(
    imagesResult.data,
    'Product images could not be loaded before deletion.',
  );

  const deleteResult = await client.from('products').delete().eq('id', productId);
  throwOnError(deleteResult.error);

  const paths = images
    .map((image) => image.storage_path)
    .filter((path): path is string => Boolean(path));
  if (paths.length > 0) {
    const storageResult = await client.storage.from(PRODUCT_IMAGE_BUCKET).remove(paths);
    if (storageResult.error) {
      return `Product deleted, but its stored images could not be removed: ${storageResult.error.message}`;
    }
  }
  return null;
}

function validateImageFile(file: File): void {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Use a JPG, PNG, WebP, or AVIF image.');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Each image must be 10 MB or smaller.');
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'An unexpected product management error occurred.';
}
