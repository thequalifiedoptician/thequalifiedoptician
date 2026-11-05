export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type CategoryRow = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type BrandRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ProductRow = {
  id: string;
  category_id: string | null;
  brand_id: string | null;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  sku: string;
  price: number;
  compare_price: number | null;
  featured: boolean;
  status: 'draft' | 'active' | 'archived';
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
};

type ProductImageRow = {
  id: string;
  product_id: string;
  image_url: string;
  storage_path: string | null;
  alt_text: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
};

type ProductVariantRow = {
  id: string;
  product_id: string;
  sku: string;
  color: string | null;
  size: string | null;
  material: string | null;
  price: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ProductInventoryRow = {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity_on_hand: number;
  quantity_reserved: number;
  available_quantity: number;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      categories: Table<
        CategoryRow,
        Omit<CategoryRow, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        },
        Partial<CategoryRow>
      >;
      brands: Table<
        BrandRow,
        Omit<BrandRow, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        },
        Partial<BrandRow>
      >;
      products: Table<
        ProductRow,
        Omit<ProductRow, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        },
        Partial<ProductRow>
      >;
      product_images: Table<
        ProductImageRow,
        Omit<ProductImageRow, 'id' | 'created_at'> & { id?: string; created_at?: string },
        Partial<ProductImageRow>
      >;
      product_variants: Table<
        ProductVariantRow,
        Omit<ProductVariantRow, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        },
        Partial<ProductVariantRow>
      >;
      product_inventory: Table<
        ProductInventoryRow,
        Omit<ProductInventoryRow, 'id' | 'available_quantity' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        },
        Partial<Omit<ProductInventoryRow, 'available_quantity'>>
      >;
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          avatar_url: string | null;
          auth_provider: string;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          auth_provider?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          auth_provider?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_catalog_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      save_catalog_product: {
        Args: {
          p_product: Json;
          p_images: Json;
          p_variants: Json;
          p_inventory: Json;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
  __InternalSupabase: {
    PostgrestVersion: '12';
  };
};
