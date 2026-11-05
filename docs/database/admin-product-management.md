# Admin product management

Phase 5.2 adds a protected product-management workspace at `/admin/products`.
The route requires a confirmed Supabase user with the trusted
`app_metadata.role = "admin"` claim. It does not create or assign admin roles.

## Database setup

Apply the migrations in order:

1. `20261105140000_create_profiles_on_auth_signup.sql`
2. `20261105150000_create_product_catalog.sql`
3. `20261105160000_configure_product_image_storage.sql`

The final migration creates the public `product-images` storage bucket, its
admin-only upload/update/delete policies, a `storage_path` column for cleanup,
and the `save_catalog_product` RPC. Product records, image metadata, variants,
and inventory are synchronized in one database transaction. Storage uploads
occur before the transaction; newly uploaded files are removed if the save
fails, and replaced/deleted files are removed after the database operation.

Grant `app_metadata.role = "admin"` only using a trusted Supabase administrative
process. Do not grant roles from browser code or user-editable metadata. The
route check is only a usability gate; database RLS and the RPC's explicit
admin-claim check enforce authorization.

## Feature structure

- `features/admin/AdminRoute.tsx`: frontend role gate.
- `features/admin/catalog/AdminProductPage.tsx`: dashboard, search/filter,
  create/edit form, image ordering and upload, variant/inventory editor,
  preview, and delete confirmation.
- `features/admin/catalog/productService.ts`: typed Supabase reads, duplicate
  checks, storage upload/cleanup, and product deletion.
- `features/admin/catalog/admin-products.css`: responsive, scoped admin styles.
- `features/auth/types/database.ts`: generated-style catalog table/RPC types.

## Manual testing checklist

1. Apply the migrations and assign a test user the trusted admin claim; sign in
   again so the JWT includes the updated claim.
2. Visit `/admin/products` as an unauthenticated user, a confirmed non-admin,
   an unconfirmed user, and the admin. Only the confirmed admin should reach
   the product workspace.
3. Create a product with each status, category/brand, price and compare-price
   combinations, and featured state. Confirm required fields and price rules.
4. Upload several supported images, set alt text, reorder by drag/drop and
   arrow buttons, remove an image, save, then edit and confirm order/primary
   image persist.
5. Add variants with color, size, material, SKU, optional price, and stock.
   Confirm available quantity is on-hand less reserved and persists on edit.
6. Try case-insensitive duplicate product SKUs/slugs and duplicate variant
   SKUs. Confirm a friendly error appears and existing data remains unchanged.
7. Try invalid image types, files larger than 10 MB, negative/fractional stock,
   reserved stock greater than on-hand, and compare price below product price.
8. Preview products and verify their images, descriptions, status, variants,
   and inventory. Confirm delete requires explicit confirmation and cascades
   records and uploaded image objects.
9. In Supabase, verify non-admin clients cannot write catalog records or
   upload/delete product images, and anonymous users can only read public
   bucket images and active catalog data.
10. Check the workspace at mobile, tablet, laptop, and desktop sizes and test
    keyboard access for dialogs, form controls, upload, ordering, and actions.

The workspace cannot complete live Supabase tests until the migrations are
applied and credentials, storage, and an admin claim are configured.
