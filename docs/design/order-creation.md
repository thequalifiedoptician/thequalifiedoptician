# Phase 6.3: Order creation and inventory validation

The checkout review step now creates a pending order through a single
authenticated database operation. The operation rechecks the signed-in user,
saved shipping address, cart, product and variant state, price, quantity, and
stock before it writes order snapshots and clears the cart. It does not collect
payment or deduct on-hand inventory.

## Architecture

- `CheckoutPage.tsx` submits from the existing Review step, presents processing
  and error states, and shows the creation result in place. No confirmation
  route or payment UI was added.
- `orderValidation.ts` validates the client checkout state and builds the
  expected cart-price list. It is an early-feedback layer, not a security
  boundary.
- `orderService.ts` invokes the typed `create_order` RPC and maps database
  error codes to reusable user-facing `OrderCreationError` values.
- `useOrderCreation.ts` coordinates submission, exposes loading/error/success
  state, and refreshes the cart after success. The checkout disables its submit
  control while processing; the RPC also makes retries idempotent.
- `orderTypes.ts` defines order results and shared order errors.
- `20261106140000_create_orders.sql` creates owner-only order tables and an
  atomic, idempotent order-creation function. The function owns all authoritative
  validation and price calculation.

## Updated file tree

```text
apps/web/src/features/checkout/
  CheckoutDesignSystem.tsx
  CheckoutPage.tsx
  checkout.css
  orderService.ts
  orderTypes.ts
  orderValidation.ts
  useOrderCreation.ts
apps/web/src/features/auth/types/database.ts
supabase/migrations/20261106140000_create_orders.sql
docs/design/order-creation.md
```

## Database schema

- `orders` stores the UUID, unique order number, authenticated owner, unique
  per-user idempotency key, status, USD currency, subtotal, shipping and tax
  placeholders, total, delivery-address snapshot, reservation expiry, and
  timestamps.
- `order_items` stores the order foreign key, product/variant references where
  available, stable inventory lookup keys, and immutable product, SKU, option,
  quantity, unit-price, and line-total snapshots.
- Row-level security lets authenticated users read only their own orders and
  items. Direct client inserts, updates, and deletes are not granted; creation
  is only through the authenticated RPC.
- Shipping and tax are currently zero placeholders. Currency is USD to match
  the existing cart price formatter.

## Validation and inventory decisions

- The database RPC rechecks authentication, address ownership, a non-empty
  unchanged cart, active products and variants, variant association, current
  prices, quantity bounds, inventory rows, and available stock.
- Product and variant prices are compared with the checkout's expected prices;
  database prices are always used to compute totals.
- Cart rows and product/variant records are locked in a stable order. Inventory
  rows are locked while current available quantity and active order holds are
  checked, preventing concurrent order submissions from overselling the same
  stock.
- Each created order temporarily holds its line quantities for 15 minutes.
  Active holds are counted against stock by the existing public availability
  RPCs. `quantity_on_hand` and the manually managed `quantity_reserved` values
  are not changed; expired holds stop counting automatically.
- Order creation is idempotent per user and request key. A retry returns the
  original order rather than creating duplicate items.
- The order and its item/address/price snapshots, plus cart removal, commit in
  one transaction. Validation failures leave the cart untouched.
- A successfully created order has `pending_payment` status. No payment,
  payment status transition, email, order confirmation route, or permanent
  inventory deduction is included in this phase.

## Setup

Apply `supabase/migrations/20261106140000_create_orders.sql` after the product
catalog, cart, and shipping-address migrations. It replaces the public
availability functions to account for active order holds. The migration has
not been applied to the configured Supabase project as part of this change.

## Manual testing checklist

1. Apply the migration and sign in with a user who has a cart and saved address.
2. Create an order. Confirm one `orders` row and matching `order_items` rows,
   an order number, correct server-calculated totals, a shipping snapshot, a
   15-minute expiry, and an empty cart.
3. Confirm the checkout remains on `/checkout`, displays the order number and
   total, announces success to assistive technology, and does not request or
   collect payment details.
4. Retry the same RPC request with the same idempotency key. Confirm it returns
   the original order and does not duplicate items.
5. Try with no authentication, an empty cart, another user's address, a
   disabled/deleted product, an invalid/deactivated variant, a changed price,
   and invalid quantities. Confirm each operation fails and does not clear the
   cart.
6. Attempt orders with insufficient stock and with two users ordering the last
   unit concurrently. Confirm only stock-available orders succeed and inventory
   `quantity_on_hand` is unchanged.
7. Confirm a live order hold reduces product and variant availability for
   other users, then availability returns after `reservation_expires_at`.
8. Confirm each user can read only their own order and items; anonymous users
   and authenticated clients cannot directly write order rows.
9. Test mobile/desktop layouts, keyboard operation, validation/error feedback,
   success focus handling, and reduced-motion behavior.
