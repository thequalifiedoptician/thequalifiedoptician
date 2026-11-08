# Phase 6.4: Payment architecture foundation

The existing checkout now has a reusable payment selection and provider
architecture. Payment methods are preview selections only: no provider session,
payment attempt, authorization, capture, or refund is initiated by the web app.
Order creation remains the Phase 6.3 operation and leaves orders in
`pending_payment`.

## Updated file tree

```text
apps/web/src/features/checkout/payment/
  PaymentMethodSelector.tsx
  PaymentStatusPanel.tsx
  paymentService.ts
  paymentTypes.ts
  usePayment.ts
apps/web/src/features/checkout/
  CheckoutPage.tsx
  checkout.css
apps/api/src/features/payments/
  paymentService.ts
  paymentTypes.ts
apps/web/src/features/auth/types/database.ts
supabase/migrations/20261106150000_create_payment_architecture.sql
docs/design/payment-architecture.md
```

## Architecture

- `paymentTypes.ts` defines payment providers, method metadata, provider
  metadata, and the payment lifecycle:
  `pending`, `processing`, `authorized`, `paid`, `failed`, `cancelled`, and
  `refunded`.
- The API's `PaymentProviderStrategy` defines the future provider adapter
  contract in server-only code. It covers session creation and signed webhook
  verification/parsing without implementing a gateway.
- The API `PaymentProviderRegistry` rejects duplicate registrations and
  explicitly errors if a provider is not configured. No real adapters are
  registered in this phase.
- API `PaymentService` validates session inputs and webhook signatures before
  accepting a parsed event. No routes call it yet, and no gateway adapter exists.
- `paymentService.ts` lists supported UI options and resolves a method by ID.
  `usePayment.ts` manages the selected preview preference for the current
  checkout session; it performs no network or payment operations.
- `PaymentMethodSelector.tsx` provides keyboard-accessible radio cards, a
  recommended badge, selected and disabled visual states, and provider
  readiness labels.
- `PaymentStatusPanel.tsx` renders all typed lifecycle states with motion,
  reduced-motion support, accessible live regions, and processing/error
  presentation. The current checkout displays only `pending`.
- The existing Review step shows the selected preference and creates the
  Phase 6.3 order without sending payment information. The choice is not
  persisted or attached to the order in this preview.

## Supported UI options

- Credit/debit card through a future Stripe adapter.
- PayPal, Apple Pay, and Google Pay.
- Bank transfer and cash on delivery.
- A custom-provider extension slot.
- Stripe-hosted checkout as a separate provider option.

All options are explicitly labelled as provider setup required and selection
preview only until a server-side provider implementation is added. No method is
presented as successfully configured simply because it can be selected.

## Database schema and security

- `payments` stores a UUID, order reference, provider and method identifiers,
  payment status, amount/currency, provider reference, optional secure-token
  reference, idempotency key, metadata, and timestamps.
- `payment_transactions` stores append-oriented provider transaction status,
  amount/currency, provider event and transaction references, metadata, and
  creation time. Unique provider event IDs provide a foundation for webhook
  replay deduplication.
- Both tables have row-level security. Authenticated users can read records
  belonging to their own orders; they cannot insert, update, or delete them
  directly. The `service_role` is granted future server-side write access.
- The provider token-reference column is excluded from authenticated column
  grants and is available only to trusted server code.
- The database stores only token references, never PAN/CVV, wallet credentials,
  provider secrets, webhook signatures, or raw payment tokens. Metadata must
  not contain payment credentials or unnecessary personal data.
- Provider credentials, payment session creation, webhook signature
  verification, idempotency enforcement, and payment-state transitions must be
  implemented in trusted server code in a later phase. Do not register an
  adapter with secrets in the browser bundle. The API strategy contract and
  service are server-only; no payment-provider credentials are configured.
- The migration does not insert payment rows or change Phase 6.3 order status.

## Design decisions

- Keep method selection in checkout-session state until a server-side payment
  session exists. A method selection alone is not consent to charge and is not
  written to the order.
- Keep order creation and payment state transitions separate. An order remains
  `pending_payment` until a future trusted payment event updates it.
- Keep provider-neutral lifecycle/status contracts and appendable transaction
  records with request/event idempotency keys so multiple attempts and
  providers can be supported without changing the order item schema.

## Setup

Apply `supabase/migrations/20261106150000_create_payment_architecture.sql`
after the orders migration. No real gateway credentials or provider settings
are required or used.

## Manual testing checklist

1. Apply the migration and confirm `payments` and `payment_transactions` exist
   with all seven lifecycle statuses.
2. Visit `/checkout`, continue to Payment, and verify all provider options are
   shown, the card option is selected/recommended, and each unregistered
   provider is marked as not connected.
3. Use mouse, keyboard, radio arrows, and Tab to change the selected option.
   Verify focus, selected-card treatment, and reduced-motion behavior.
4. Confirm disabled options are visibly disabled and cannot be selected when a
   method definition is configured as disabled.
5. Continue to Review and confirm the selected preference is shown. Create an
   order and verify the preference is labelled as not processed or saved, the
   order remains `pending_payment`, and no payment row/session is created.
6. Confirm no card or account credentials are requested or stored and no
   provider network requests occur.
7. Verify the status panel's pending, processing, authorized, paid, failed,
   cancelled, and refunded visual states using controlled component state.
8. As an authenticated user, confirm only payments/transactions associated with
   that user's orders can be read. Confirm anonymous users cannot read them and
   authenticated clients cannot directly write or update them.
9. Test mobile/tablet/desktop layouts, screen-reader announcements, keyboard
   focus indicators, processing animation, and error state contrast.
