# Product catalog database

Phase 5.1 adds the catalog foundation in
[`20261105150000_create_product_catalog.sql`](../../supabase/migrations/20261105150000_create_product_catalog.sql).
Apply it after the profile migration in `supabase/migrations`.

## Tables and relationships

- `categories` supports a nullable self-reference for nested categories.
- `brands` stores reusable brand records.
- `products` optionally references a category and brand. Deleting either parent
  leaves the product intact and clears the corresponding reference.
- `product_images` and `product_variants` belong to a product and are deleted
  with it.
- `product_inventory` belongs to a product and optionally to one of its
  variants. A product without variants has one inventory row with a null
  `variant_id`; a variant-backed product has one row per variant.

All primary keys are UUIDs. Slugs and SKUs are unique without regard to case.
Products have a constrained `draft`, `active`, or `archived` status. Variant
prices are optional overrides of the product price; stock is kept in inventory
instead of duplicated on products or variants. `available_quantity` is
generated from on-hand minus reserved stock.

## Access and integrity

- Anonymous and authenticated users can read active categories and brands,
  active products, and images and active variants belonging to active products.
- Inventory is never granted to anonymous users and is readable only by
  catalog admins.
- Authenticated catalog writes require the trusted Supabase JWT claim
  `app_metadata.role = "admin"`. Do not authorize using user-editable
  `user_metadata`; assign this claim only through a trusted administrative
  process.
- Row Level Security is enabled on all six tables. The migration grants
  clients only the table operations needed by these policies.
- Foreign keys, non-negative quantity/price/order checks, SKU/slug uniqueness,
  and a one-primary-image-per-product index enforce key invariants.
- `updated_at` is maintained by a shared trigger function on mutable records.

## Customer product details

The public product details page is available at `/shop/:slug`. It reads only an
active product and its public images, and retrieves availability through
`get_public_product_availability` so exact inventory quantities remain private.
Apply `20261105180000_add_public_variant_availability.sql` after the product
availability migration for the details page's per-variant availability.
Recently viewed items are held in memory while navigating the storefront and
are not persisted. Ratings and reviews remain informational only.

## Wishlist

Apply `20261105190000_create_wishlist_items.sql` after the catalog migrations.
It creates `wishlist_items`, with one row per user/product pair, cascading
deletes for removed users or products, and an index for each user's saved-item
lookup. Row Level Security restricts reads and deletes to the owner and permits
inserts only for the authenticated owner and an active product.

The storefront shares wishlist IDs through `WishlistProvider`; heart actions
update the local state optimistically and roll back with an accessible error if
the Supabase write fails. The `/wishlist` page requires authentication and uses
the existing active catalog loader to display saved product details.

## Shopping cart

Apply `20261105200000_create_cart_items.sql` after the catalog and both public
availability migrations. It creates one owner-scoped cart line per
user/product/variant combination, including a distinct line for a product with
no variant. The migration enforces quantity bounds, active-product and
in-stock checks, owner-only row access, and cascades deleted users, products,
or variants from the cart. The `add_cart_item` RPC increments an existing
line atomically; clients may update only its quantity directly.

The shared `CartProvider` caches cart lines for the authenticated session and
optimistically handles add, quantity update, and removal with rollback and
visible errors. The shop cards, product details purchase panel, header badge,
and `/cart` page all use this state. Product and variant availability is read
only through the boolean availability RPCs; exact inventory is never exposed.
Cards for products with active variants route customers to choose an option
before adding it, and an out-of-stock or variantless cart line is rejected.
Shipping and tax are explicitly estimates/placeholders, and the cart does not
reserve inventory or place orders.

## Manual migration and policy checks

1. Apply `20261105140000_create_profiles_on_auth_signup.sql` if it has not
   already been applied, then apply the product catalog migration using the
   Supabase SQL Editor or the project's migration workflow.
2. Apply `20261105160000_configure_product_image_storage.sql` for admin image
   uploads, then `20261105170000_add_public_product_availability.sql` to expose
   product in-stock status without granting access to exact inventory counts.
   Apply `20261105180000_add_public_variant_availability.sql` for the same
   boolean-only status per active variant.
3. Confirm all six tables exist and have Row Level Security enabled.
4. As `anon`, confirm active catalog records are readable, inactive records
   are not, and inserts/updates/deletes are denied.
5. As an authenticated non-admin, confirm catalog reads follow the same
   visibility rules and catalog writes and inventory reads are denied.
6. Using a trusted test admin JWT with `app_metadata.role = "admin"`, confirm
   catalog CRUD and inventory reads/writes work.
7. Confirm deleting a category or brand clears the product reference, deleting
   a product cascades to its images, variants, and inventory, and a variant
   cannot be attached to a different product's inventory row.
8. Confirm duplicate case-insensitive slugs/SKUs, multiple primary images,
   negative stock, and reserved quantities greater than on-hand are rejected.
9. Confirm `get_public_variant_availability` returns stock booleans only for
   active variants of active products and does not grant public access to
   `product_inventory`.
10. Apply `20261105190000_create_wishlist_items.sql`; verify anonymous users
    cannot read or modify wishlist rows, and authenticated users can only read,
    add active products to, or remove items from their own wishlist.
11. Confirm duplicate user/product rows are rejected, and deleting the user or
    product cascades to its wishlist item.
12. Apply `20261105200000_create_cart_items.sql`; verify anonymous users cannot
    read or modify cart rows and authenticated users can only access their own.
13. Confirm duplicate user/product/variant rows increment through
    `add_cart_item`, the quantity remains between 1 and 99, and out-of-stock,
    inactive, or mismatched variants are rejected.
14. Confirm authenticated users can update only cart quantity, remove their
    own lines, and cannot change the user, product, or variant on an existing
    line. Verify deleting a user, product, or variant cascades to cart rows.
15. In the storefront, test add/quantity/remove synchronization between shop,
    product details, the header count, and `/cart`; verify unavailable items
    can be removed and are excluded from the estimate. Confirm an empty cart,
    loading/error states, keyboard controls, responsive layout, and login
    redirect behavior.
