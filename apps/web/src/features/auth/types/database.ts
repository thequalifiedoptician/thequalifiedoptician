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

type PaymentAccountRow = {
  id: number;
  easypaisa_holder_name: string;
  easypaisa_mobile_number: string;
  easypaisa_qr_path: string | null;
  enable_easypaisa: boolean;
  jazzcash_holder_name: string;
  jazzcash_mobile_number: string;
  jazzcash_qr_path: string | null;
  enable_jazzcash: boolean;
  bank_name: string;
  bank_account_holder: string;
  bank_iban: string;
  bank_account_number: string;
  bank_qr_path: string | null;
  enable_bank_transfer: boolean;
  updated_at: string;
};

type DealRow = {
  id: string;
  title: string;
  badge: string;
  description: string;
  image_path: string;
  image_url: string;
  image_alt: string;
  action_label: string;
  action_href: string;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type ManualPaymentProofRow = {
  id: string;
  order_id: string;
  customer_id: string;
  payment_id: string;
  payment_method: 'easypaisa' | 'jazzcash';
  account_used: Json;
  transaction_reference: string | null;
  payment_screenshot_url: string | null;
  uploaded_at: string | null;
  verification_status:
    | 'awaiting_payment'
    | 'pending_verification'
    | 'approved'
    | 'rejected'
    | 'reupload_requested';
  verified_by: string | null;
  verified_at: string | null;
  admin_note: string | null;
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
      about_page_content: Table<
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
      deals: Table<
        DealRow,
        Omit<DealRow, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        },
        Partial<DealRow>
      >;
      brand_settings: Table<
        {
          id: string;
          is_active: boolean;
          brand_name: string;
          brand_tagline: string;
          browser_title: string;
          logo_url: string | null;
          favicon_url: string | null;
          company_name: string;
          company_email: string;
          company_phone: string;
          company_address: string;
          company_city: string;
          company_country: string;
          postal_code: string;
          google_maps_url: string;
          support_email: string;
          footer_copyright: string;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          is_active?: boolean;
          brand_name: string;
          brand_tagline?: string;
          browser_title: string;
          logo_url?: string | null;
          favicon_url?: string | null;
          company_name?: string;
          company_email?: string;
          company_phone?: string;
          company_address?: string;
          company_city?: string;
          company_country?: string;
          postal_code?: string;
          google_maps_url?: string;
          support_email?: string;
          footer_copyright?: string;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          is_active?: boolean;
          brand_name?: string;
          brand_tagline?: string;
          browser_title?: string;
          logo_url?: string | null;
          favicon_url?: string | null;
          company_name?: string;
          company_email?: string;
          company_phone?: string;
          company_address?: string;
          company_city?: string;
          company_country?: string;
          postal_code?: string;
          google_maps_url?: string;
          support_email?: string;
          footer_copyright?: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
      social_settings: Table<
        {
          id: number;
          whatsapp_number: string;
          whatsapp_message: string;
          facebook_url: string;
          instagram_url: string;
          tiktok_url: string;
          linkedin_url: string;
          youtube_url: string;
          twitter_url: string;
          pinterest_url: string;
          email: string;
          support_phone: string;
          enable_whatsapp: boolean;
          enable_facebook: boolean;
          enable_instagram: boolean;
          enable_tiktok: boolean;
          enable_linkedin: boolean;
          enable_youtube: boolean;
          enable_twitter: boolean;
          enable_pinterest: boolean;
          enable_email: boolean;
          updated_at: string;
        },
        {
          id?: number;
          whatsapp_number?: string;
          whatsapp_message?: string;
          facebook_url?: string;
          instagram_url?: string;
          tiktok_url?: string;
          linkedin_url?: string;
          youtube_url?: string;
          twitter_url?: string;
          pinterest_url?: string;
          email?: string;
          support_phone?: string;
          enable_whatsapp?: boolean;
          enable_facebook?: boolean;
          enable_instagram?: boolean;
          enable_tiktok?: boolean;
          enable_linkedin?: boolean;
          enable_youtube?: boolean;
          enable_twitter?: boolean;
          enable_pinterest?: boolean;
          enable_email?: boolean;
          updated_at?: string;
        },
        {
          id?: number;
          whatsapp_number?: string;
          whatsapp_message?: string;
          facebook_url?: string;
          instagram_url?: string;
          tiktok_url?: string;
          linkedin_url?: string;
          youtube_url?: string;
          twitter_url?: string;
          pinterest_url?: string;
          email?: string;
          support_phone?: string;
          enable_whatsapp?: boolean;
          enable_facebook?: boolean;
          enable_instagram?: boolean;
          enable_tiktok?: boolean;
          enable_linkedin?: boolean;
          enable_youtube?: boolean;
          enable_twitter?: boolean;
          enable_pinterest?: boolean;
          enable_email?: boolean;
          updated_at?: string;
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
      payment_accounts: Table<
        PaymentAccountRow,
        Omit<PaymentAccountRow, 'id' | 'updated_at'> & {
          id?: number;
          updated_at?: string;
        },
        Partial<PaymentAccountRow>
      >;
      manual_payment_proofs: Table<
        ManualPaymentProofRow,
        Omit<ManualPaymentProofRow, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        },
        Partial<ManualPaymentProofRow>
      >;
    };
    Views: {
      published_homepage_content: {
        Row: { content: Json };
        Relationships: [];
      };
      published_about_page_content: {
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
      save_about_page_content: {
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
      prepare_manual_payment: {
        Args: {
          p_order_id: string;
          p_payment_method: string;
        };
        Returns: string;
      };
      submit_manual_payment_proof: {
        Args: {
          p_proof_id: string;
          p_storage_path: string;
          p_transaction_reference?: string | null;
        };
        Returns: string;
      };
      record_cash_on_delivery: {
        Args: {
          p_order_id: string;
        };
        Returns: string;
      };
      verify_manual_payment_proof: {
        Args: {
          p_proof_id: string;
          p_action: string;
          p_admin_note?: string | null;
        };
        Returns: string;
      };
      get_manual_payment_dashboard_metrics: {
        Args: Record<PropertyKey, never>;
        Returns: {
          pending_count: number;
          approved_today: number;
          rejected_count: number;
          total_manual_payments: number;
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
