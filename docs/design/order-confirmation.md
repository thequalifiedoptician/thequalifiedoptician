# Phase 6.5: Premium order confirmation

After the Phase 6.3 order RPC succeeds, checkout navigates to a customer-owned
confirmation URL. The page reloads the order and item snapshots from Supabase,
then presents order status, pending payment, customer/shipping details, totals,
timeline preview, and next actions. RLS and an explicit authenticated user
filter keep the lookup scoped to the signed-in customer.

## Updated file tree

```text
apps/web/src/features/checkout/orderConfirmation/
  OrderConfirmationComponents.tsx
  OrderConfirmationPage.tsx
  orderConfirmationService.ts
  useOrderConfirmation.ts
apps/web/src/features/checkout/
  CheckoutPage.tsx
  checkout.css
apps/web/src/routes/router.tsx
apps/web/src/features/checkout/payment/PaymentStatusPanel.tsx
docs/design/order-confirmation.md
```

## Architecture

- `CheckoutPage.tsx` navigates to `/checkout/confirmation/:orderId` after the
  order-creation RPC succeeds. The existing payment selection remains a
  checkout-only preview and is not stored or represented as a selected method
  on the confirmation page.
- `orderConfirmationService.ts` loads the order and immutable item rows using
  the authenticated Supabase client, explicit owner filter, and existing RLS.
  An order not owned by the current user is presented as not found.
- `useOrderConfirmation.ts` manages loading, retry, error, and stale-request
  cleanup when a user or order route parameter changes.
- `OrderConfirmationPage.tsx` owns authentication redirect, success/inactive
  states, focus management, page composition, and customer actions.
- `OrderConfirmationComponents.tsx` contains reusable order status badges,
  order timeline, order summary, customer information, shipping address,
  payment summary, error and loading states, and action controls.
- Existing `CheckoutFrame`, design tokens, cart currency formatter, and
  `PaymentStatusPanel` are reused.

## Design and data decisions

- A saved order with `pending_payment` is shown as **order received** with
  **payment pending**. It is not described as paid or payment-authorized.
- No payment method is displayed as selected: Phase 6.4 deliberately does not
  persist the preview selection. The payment card clearly states that no method
  or credentials were stored and no charge was made.
- Order items, address, customer contact, subtotal, shipping, tax, currency,
  total, order number, creation date, and reservation deadline use persisted
  order snapshots.
- Discount is displayed as zero because the order schema and current order
  creation flow do not persist or apply discounts. Shipping and tax are marked
  as placeholders, and the total matches the created order.
- The timeline marks order received as current and labels future fulfillment
  milestones as a preview. Cancelled or expired orders have an inactive
  failure/update presentation.
- “View order details” expands reference/date/reservation details. Invoice
  download is disabled and clearly marked unavailable; no PDF is generated.
  Contact support opens an in-page message because no support contact details
  or contact route exist yet.
- The confirmation page is customer-authenticated and can be reopened from its
  URL while the user is signed in. It creates no route that exposes another
  customer's data.

## Manual testing checklist

1. Sign in, place an order, and verify navigation to
   `/checkout/confirmation/<order-id>` immediately after order creation.
2. Verify order number/date, item names/options/SKUs, quantities, line prices,
   subtotal, shipping, tax, zero discount, total, customer contact, and shipping
   snapshot match the saved rows.
3. Confirm the page says order received/payment pending; it does not claim
   payment success, display a saved payment method, or make a gateway request.
4. Reload the confirmation URL and confirm the order remains available while
   signed in and the cart state does not affect the displayed snapshot.
5. Try a malformed ID, missing ID, and another customer's order ID. Confirm
   each is presented as not found without leaking order details.
6. Simulate an expired/cancelled order and verify the inactive/failure state
   and cancelled timeline. Confirm a transient query failure can be retried.
7. Expand/collapse View order details, open/close Contact support, and confirm
   invoice is visibly disabled and does not download anything.
8. Use keyboard-only navigation and a screen reader to verify skip navigation,
   focus on the confirmation heading, status announcements, labels, and action
   names.
9. Test mobile, tablet, laptop, and desktop breakpoints, reduced motion,
   skeleton loading, and empty-item fallback.

## Remaining for Phase 6.6 and later

- Persist and display actual fulfillment status, shipment/carrier/tracking
  information, and milestone timestamps once an order-fulfillment workflow is
  defined.
- Persist an actual selected payment method/session only from trusted server
  payment setup; update payment state from verified provider events in the
  dedicated future payment integration phase.
- Define real shipping, tax, discount, and currency calculations before
  replacing the current clearly labelled placeholders.
- Add server-generated invoice downloads and configured customer-support
  contact details when those capabilities are in scope.
