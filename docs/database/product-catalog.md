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

## Manual migration and policy checks

1. Apply `20261105140000_create_profiles_on_auth_signup.sql` if it has not
   already been applied, then apply the product catalog migration using the
   Supabase SQL Editor or the project's migration workflow.
2. Confirm all six tables exist and have Row Level Security enabled.
3. As `anon`, confirm active catalog records are readable, inactive records
   are not, and inserts/updates/deletes are denied.
4. As an authenticated non-admin, confirm catalog reads follow the same
   visibility rules and catalog writes and inventory reads are denied.
5. Using a trusted test admin JWT with `app_metadata.role = "admin"`, confirm
   catalog CRUD and inventory reads/writes work.
6. Confirm deleting a category or brand clears the product reference, deleting
   a product cascades to its images, variants, and inventory, and a variant
   cannot be attached to a different product's inventory row.
7. Confirm duplicate case-insensitive slugs/SKUs, multiple primary images,
   negative stock, and reserved quantities greater than on-hand are rejected.
