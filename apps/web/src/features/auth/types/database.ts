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

type OrderRow = {
  id: string;
  user_id: string;
  order_number: string;
  idempotency_key: string;
  status: 'pending_payment' | 'confirmed' | 'processing' | 'cancelled' | 'expired';
  currency: string;
  subtotal: number;
  shipping_amount: number;
  tax_amount: number;
  total: number;
  shipping_address_snapshot: Json;
  reservation_expires_at: string;
  created_at: string;
  updated_at: string;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  inventory_product_id: string;
  inventory_variant_id: string | null;
  product_name: string;
  sku: string;
  variant_label: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  created_at: string;
};

type PaymentRow = {
  id: string;
  order_id: string;
  provider_id: string;
  method_id: string;
  status: 'pending' | 'processing' | 'authorized' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  amount: number;
  currency: string;
  provider_reference: string | null;
  provider_token_reference: string | null;
  idempotency_key: string;
  checkout_url: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

type PaymentTransactionRow = {
  id: string;
  payment_id: string;
  provider_id: string;
  status: 'pending' | 'processing' | 'authorized' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  amount: number;
  currency: string;
  provider_event_id: string | null;
  transaction_reference: string | null;
  metadata: Json;
  created_at: string;
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
      wishlist_items: Table<
        {
          id: string;
          user_id: string;
          product_id: string;
          created_at: string;
        },
        {
          id?: string;
          user_id: string;
          product_id: string;
          created_at?: string;
        },
        {
          id?: string;
          user_id?: string;
          product_id?: string;
          created_at?: string;
        }
      >;
      cart_items: Table<
        {
          id: string;
          user_id: string;
          product_id: string;
          variant_id: string | null;
          quantity: number;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          product_id: string;
          variant_id?: string | null;
          quantity?: number;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          user_id?: string;
          product_id?: string;
          variant_id?: string | null;
          quantity?: number;
          created_at?: string;
          updated_at?: string;
        }
      >;
      shipping_addresses: Table<
        {
          id: string;
          user_id: string;
          full_name: string;
          phone: string;
          email: string;
          country: string;
          region: string;
          city: string;
          postal_code: string;
          street_address: string;
          apartment: string | null;
          delivery_notes: string | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          full_name: string;
          phone: string;
          email: string;
          country: string;
          region: string;
          city: string;
          postal_code: string;
          street_address: string;
          apartment?: string | null;
          delivery_notes?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          user_id?: string;
          full_name?: string;
          phone?: string;
          email?: string;
          country?: string;
          region?: string;
          city?: string;
          postal_code?: string;
          street_address?: string;
          apartment?: string | null;
          delivery_notes?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;
      homepage_content: Table<
        {
          id: number;
          draft_content: Json;
          published_content: Json | null;
          updated_at: string;
          published_at: string | null;
        },
        {
          id?: number;
          draft_content: Json;
          published_content?: Json | null;
          updated_at?: string;
          published_at?: string | null;
        },
        {
          id?: number;
          draft_content?: Json;
          published_content?: Json | null;
          updated_at?: string;
          published_at?: string | null;
        }
      >;
      orders: Table<
        OrderRow,
        Omit<OrderRow, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        },
        Partial<OrderRow>
      >;
      order_items: Table<
        OrderItemRow,
        Omit<OrderItemRow, 'id' | 'created_at'> & { id?: string; created_at?: string },
        Partial<OrderItemRow>
      >;
      payments: Table<
        PaymentRow,
        Omit<
          PaymentRow,
          | 'id'
          | 'status'
          | 'currency'
          | 'provider_reference'
          | 'provider_token_reference'
          | 'checkout_url'
          | 'metadata'
          | 'created_at'
          | 'updated_at'
        > & {
          id?: string;
          status?: PaymentRow['status'];
          currency?: string;
          provider_reference?: string | null;
          provider_token_reference?: string | null;
          checkout_url?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        },
        Partial<PaymentRow>
      >;
      payment_transactions: Table<
        PaymentTransactionRow,
        Omit<
          PaymentTransactionRow,
          'id' | 'provider_event_id' | 'transaction_reference' | 'metadata' | 'created_at'
        > & {
          id?: string;
          provider_event_id?: string | null;
          transaction_reference?: string | null;
          metadata?: Json;
          created_at?: string;
        },
        Partial<PaymentTransactionRow>
      >;
    };
    Views: {
      published_homepage_content: {
        Row: { content: Json };
        Relationships: [];
      };
    };
    Functions: {
      is_catalog_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      get_admin_order_summary: {
        Args: {
          p_start_at?: string | null;
          p_end_at?: string | null;
        };
        Returns: {
          order_count: number;
          pending_count: number;
          inactive_count: number;
          pending_order_value: number;
        }[];
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
      get_public_product_availability: {
        Args: {
          p_product_ids: string[];
        };
        Returns: {
          product_id: string;
          in_stock: boolean;
        }[];
      };
      get_public_variant_availability: {
        Args: {
          p_variant_ids: string[];
        };
        Returns: {
          variant_id: string;
          in_stock: boolean;
        }[];
      };
      add_cart_item: {
        Args: {
          p_product_id: string;
          p_variant_id: string | null;
          p_quantity: number;
        };
        Returns: {
          id: string;
          user_id: string;
          product_id: string;
          variant_id: string | null;
          quantity: number;
          created_at: string;
          updated_at: string;
        }[];
      };
      save_homepage_content: {
        Args: {
          p_content: Json;
          p_publish?: boolean;
        };
        Returns: undefined;
      };
      set_default_shipping_address: {
        Args: {
          p_address_id: string;
        };
        Returns: undefined;
      };
      save_shipping_address: {
        Args: {
          p_address_id: string | null;
          p_full_name: string;
          p_phone: string;
          p_email: string;
          p_country: string;
          p_region: string;
          p_city: string;
          p_postal_code: string;
          p_street_address: string;
          p_apartment: string | null;
          p_delivery_notes: string | null;
          p_is_default: boolean;
        };
        Returns: string;
      };
      delete_shipping_address: {
        Args: {
          p_address_id: string;
        };
        Returns: undefined;
      };
      create_order: {
        Args: {
          p_shipping_address_id: string;
          p_idempotency_key: string;
          p_expected_cart: Json;
        };
        Returns: {
          id: string;
          order_number: string;
          status: string;
          currency: string;
          subtotal: number;
          shipping_amount: number;
          tax_amount: number;
          total: number;
          reservation_expires_at: string;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
  __InternalSupabase: {
    PostgrestVersion: '12';
  };
};
