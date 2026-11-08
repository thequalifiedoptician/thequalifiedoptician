# Phase 6.7: Order tracking

The customer-only `/account/orders/:orderId/tracking` route reloads an order
using the existing owner-scoped order query and RLS, then displays order,
payment, product, address, and total summaries. The order-confirmation page links
to tracking after order creation.

Customers can also open `/account/orders` from **My orders** in the signed-in
desktop account menu or mobile navigation drawer. This authenticated history
lists the signed-in customer's latest orders, saved item details, total, status,
and links to order details and tracking. History is paginated in batches of 10.

## Updated file tree

```text
apps/web/src/features/checkout/orderTracking/
  OrderTrackingPage.tsx
  OrderTrackingComponents.tsx
  orderTrackingService.ts
  useOrderTracking.ts
  order-tracking.css
apps/web/src/features/checkout/orderHistory/
  OrderHistoryPage.tsx
  orderHistoryService.ts
  order-history.css
apps/web/src/features/checkout/orderConfirmation/
  OrderConfirmationPage.tsx
apps/web/src/routes/router.tsx
apps/web/src/components/shared/SiteHeader.tsx
apps/web/src/styles.css
docs/design/order-tracking.md
```

## Architecture

- `orderTrackingService.ts` reuses the existing customer-scoped confirmation
  loader, loads only the latest payment status for the owned order, and loads
  available catalog images for ordered products.
- `useOrderTracking.ts` handles loading, retry, stale-request cancellation, and
  errors as order or user identity changes.
- `OrderTrackingPage.tsx` provides the authenticated route, focus management,
  order header, action panel, and composition.
- `OrderTrackingComponents.tsx` provides the milestone timeline, shipment
  placeholder, payment summary, product/total summary, shipping address, and
  loading skeleton.
- Existing `CheckoutFrame`, order error/details/invoice components, currency
  formatter, and motion wrapper are reused.
- The order-history service scopes the query to the authenticated user and
  pages the results; line items are fetched only for the displayed orders.
- The `/account/orders` route is protected and uses the existing storefront
  layout. Desktop and mobile account menus both expose **My orders**.

## Design and data decisions

- Order placed uses the persisted order creation timestamp. Payment confirmed
  is marked only when the latest payment record is `paid`; an authorization is
  shown as authorized and is not described as collected.
- The current order schema has no fulfillment events, carrier, tracking number,
  or estimated delivery date. These fields are explicitly shown as unavailable
  placeholders. No shipment status or delivery date is inferred.
- Cancellation and reservation expiry use the persisted order state and
  `updated_at`; the page does not claim that a cancelled or expired order is in
  transit.
- Product pictures use the currently available catalog image, not an immutable
  image snapshot. If the product image is unavailable, a neutral placeholder is
  shown.
- Discount is zero because the current order creation flow does not apply or
  persist discounts. Tax and shipping use the saved order totals.
- Carrier integrations, live location, invoice generation, and real customer
  support contact details are not introduced in this phase.

## Manual testing checklist

1. Sign in, place an order, and follow **Track your order** from confirmation.
2. Verify another account cannot load the order by its UUID; malformed and
   missing order IDs show the not-found state.
3. Confirm order number/date, current payment status, product images or
   placeholders, variants, quantities, prices, address, tax, shipping, zero
   discount, and total match saved order data.
4. Confirm carrier, tracking number, and estimated delivery remain explicitly
   unavailable; no courier request is made.
5. Test `pending`, `authorized`, `paid`, `failed`, `cancelled`, and `refunded`
   payment states if test payment rows are available. Only `paid` is labelled
   payment confirmed.
6. Test cancelled and expired orders and confirm the timeline shows no
   shipment progress.
7. Test loading skeleton, transient query error/retry, focus placement, keyboard
   navigation, screen-reader labels, reduced motion, and mobile/tablet/desktop
   layouts.
8. Confirm invoice is disabled, support contact is presented as unavailable,
   and continue-shopping/order-details actions work.
9. From desktop and mobile navigation, open **My orders**; verify the page
   requires sign-in, shows only the current customer's orders, and pagination,
   empty, loading, error/retry, detail, and tracking states work.

## Remaining work for Phase 6.8

- Define and persist fulfillment events and permitted status transitions.
- Add carrier, tracking number, estimated delivery, and verified delivery
  timestamps from a trusted fulfillment integration.
- Add immutable ordered-product image snapshots if order history must always
  preserve the original catalog artwork.
- Add real support routing and invoice generation only when those capabilities
  are in scope.
