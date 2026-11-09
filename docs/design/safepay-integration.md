# Phases 7.1–7.2: Safepay checkout and webhook verification

The checkout payment step now offers Safepay only. After server-side order
creation, the web app requests a payment session from the API and redirects to
Safepay's hosted checkout. Payment credentials and order totals are never
accepted from the browser as authoritative values.

## API

- `POST /api/v1/payments/safepay/create-session` — bearer-authenticated; accepts
  only `{ "orderId": "<uuid>" }`. The API authenticates the Supabase access
  token, reads the order using the server-only service key, verifies ownership,
  active reservation, pending status, positive amount, supported currency, and
  no existing paid payment. It returns a Safepay checkout URL and internal
  payment ID.
- `GET /api/v1/payments/:paymentId/status` — bearer-authenticated and
  owner-scoped. It returns only the status currently stored in `payments`.
- `POST /api/v1/payments/safepay/webhook` — public provider callback. It
  verifies `X-SFPY-SIGNATURE` against the exact raw body, persists verified
  events idempotently, then processes the event transactionally in the Vercel
  Function before acknowledging it. Transient processing errors return a
  retryable response to Safepay.
- `GET /api/health` — Vercel Function health check.

Both routes use the existing `/api/v1` API prefix and the server's CORS and
Helmet configuration. Responses do not include provider tokens or database
metadata.

## Provider flow and safety boundaries

- The Safepay strategy follows the official Node SDK hosted checkout shape:
  `POST /order/v1/init` with `amount`, `client`, `currency`, and `environment`;
  then redirect to `/checkout/pay` with the returned `beacon`, merchant
  `order_id`, and fixed same-origin confirmation/cancel URL.
- The Safepay Node SDK does not document amount units in its accessible types or
  examples. The integration sends the persisted order amount without a
  conversion. Confirm amount units and run currency-specific sandbox tests with
  Safepay before accepting live payments.
- `SAFEPAY_PUBLIC_KEY` maps to the SDK's `client` request value. The SDK's
  hosted payment-token request does not use a secret header. `SAFEPAY_SECRET_KEY`
  is loaded and kept server-side for future provider capabilities; it is not
  sent in this hosted-session request.
- `SAFEPAY_API_BASE_URL` is restricted to the official API origin matching the
  selected environment. The browser independently permits redirects only to the
  official sandbox or production checkout origin and path.
- Payment rows use a deterministic per-order idempotency key and keep the
  Safepay tracker in `provider_reference`, the provider token in the
  non-customer-readable `provider_token_reference`, and the hosted URL in
  `checkout_url`. Each session tracker is also retained in
  `payment_transactions` so delayed webhooks from a replaced session remain
  attributable without exposing the tracker to customers. A still-pending
  session is reused on retry. Failure or authorization events from an older
  session cannot overwrite the latest attempt; a successful capture is still
  recorded and reconciled against the order state.
- `webhooks=true` is included in the hosted checkout URL; event delivery must be
  configured in Safepay's Developer dashboard. Returning from Safepay is not
  proof of payment.
- `payment.succeeded` is the captured-payment event. A matching tracker,
  amount, and currency are required before the payment is marked paid. The
  database transaction then checks and deducts inventory and advances the
  order through `confirmed` to `processing`. Authorization events do not
  trigger fulfillment, and refund events are recorded as ignored.
- Each verified event is stored in `payment_events` before business processing.
  In Vercel, the webhook request then invokes a service-role-only database
  function that locks the event and applies payment, order, inventory, and
  transaction-log changes atomically. Transient errors are persisted and return
  a non-success response so Safepay can retry. Unique provider/event IDs and
  row locks prevent duplicate deliveries from applying inventory changes
  twice. Safepay does not document a signed timestamp in the webhook contract,
  so retry-safe event-ID idempotency is used instead of rejecting delayed
  legitimate deliveries. Local API development retains the queue worker.
- If an order is inactive or its inventory is no longer available when a
  successful payment arrives, the payment is recorded as paid, inventory is
  not overdrawn, and the event is left for manual reconciliation.
- `SAFEPAY_WEBHOOK_SECRET` is the endpoint-specific HMAC shared secret from
  Safepay's Developer dashboard. It is distinct from `SAFEPAY_SECRET_KEY`.
- If Safepay times out after it may have created a token, the local payment is
  kept in `processing` for one minute to prevent an immediate duplicate
  session. After that lease expires, a retry can request a new token. This
  recovery behavior must be confirmed against Safepay before live launch.

## Environment

Configure these in the Vercel project's Environment Variables. The root
`.env.vercel.example` contains both frontend and server-only names for import;
only `VITE_*` values are bundled into the browser:

- `SAFEPAY_PUBLIC_KEY`
- `SAFEPAY_SECRET_KEY`
- `SAFEPAY_WEBHOOK_SECRET`
- `SAFEPAY_ENVIRONMENT` (`sandbox` or `production`)
- `SAFEPAY_API_BASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WEB_APP_URL`

Never put the service-role or Safepay secret key in a `VITE_` variable.
Vercel serves the API and frontend on the same origin; set
`VITE_API_BASE_URL=/api/v1`, `WEB_APP_URL` and `CORS_ORIGIN` to the production
Vercel domain, and configure the Safepay webhook URL as
`https://<your-vercel-domain>/api/v1/payments/safepay/webhook`.

## Database

Apply `supabase/migrations/20261107130000_add_safepay_checkout_url.sql` after
the existing payment architecture migration. It adds a nullable checkout URL
column constrained to Safepay's HTTPS hosted-checkout endpoints. Existing
payment rows are unchanged. Existing customer column grants do not expose this
new column.

Apply `supabase/migrations/20261108140000_add_safepay_webhook_processing.sql`
after the checkout URL migration. It adds durable provider event records,
service-role-only RPCs for event claiming and atomic payment/order/inventory
updates, and allows `confirmed` and `processing` order states. Customer roles
cannot read or write webhook events.

Apply `supabase/migrations/20261109110000_add_safepay_inline_webhook_processing.sql`
after the webhook-processing migration. It adds the locked, transactional
webhook processing RPC used by Vercel Functions.

## Manual testing checklist

1. Import the completed Vercel environment file and verify malformed or missing credentials fail
   with a sanitized configuration response; confirm no secret appears in web
   assets or API responses.
2. Apply migrations in a test Supabase project. Verify unauthenticated requests
   fail, a customer cannot create a session for another user's order, and
   cancelled, expired, zero-total, unsupported-currency, or paid orders are
   rejected.
3. Use a Safepay sandbox account to create a hosted session. Confirm the request
   amount and currency against Safepay's sandbox dashboard and written
   documentation before any production rollout.
4. Confirm the browser is redirected only to the expected Safepay checkout
   origin and the fixed confirmation/cancel route.
5. Retry session creation and confirm an existing pending checkout URL is
   reused; test concurrent requests and a simulated provider timeout.
6. Confirm the local payment row records Safepay provider/method, tracker,
   checkout URL, amount, currency, idempotency key, and pending/processing state.
7. Verify `GET /api/v1/payments/:paymentId/status` only returns the owning
   customer's payment status and never returns token or checkout URL.
8. Configure the public HTTPS webhook URL in Safepay's Developer dashboard and
   subscribe to relevant version 2.0.0 payment events. Set the endpoint shared
   secret as `SAFEPAY_WEBHOOK_SECRET`.
9. Send a test webhook, verify invalid signatures and malformed payloads are
   rejected, and confirm valid events are persisted and processed before
   acknowledgement.
10. Replay the same signed event and confirm it is acknowledged as a duplicate
    without a second inventory deduction.
11. Test `payment.succeeded`, `payment.failed`, `authorization.succeeded`, and
    `authorization.reversed`; verify order changes and inventory deduction only
    happen for captured payments.
12. Replace a hosted session, then deliver delayed failure and success events
    for the older tracker. Confirm stale failures do not override the current
    attempt and a second capture is flagged for reconciliation without another
    inventory deduction.
13. Simulate a missing payment, mismatched amount/currency, stock shortfall,
    database error, worker restart, and exhausted retries; verify events remain
    available for retry or manual reconciliation.
14. Return/cancel from hosted checkout. Confirm the UI does not claim payment
    success until the stored status is verified by the webhook flow.
15. Test mobile and desktop, keyboard access, loading/error/retry states, and
    refresh/deep links to the order confirmation.

## Authoritative SDK references

- Safepay Node SDK payment token request:
  <https://github.com/getsafepay/safepay-node/blob/a2146e728daa1e1256b6276f1080f48cd9d7b185/src/resources/payments.ts>
- Safepay Node SDK hosted checkout URL builder:
  <https://github.com/getsafepay/safepay-node/blob/a2146e728daa1e1256b6276f1080f48cd9d7b185/src/resources/checkout.ts>
- Safepay Node SDK environment endpoint constants:
  <https://github.com/getsafepay/safepay-node/blob/a2146e728daa1e1256b6276f1080f48cd9d7b185/src/utils/constants.ts>

The checkout session implementation is based on the Safepay Node SDK repository
snapshot dated July 2024. Confirm checkout endpoints and amount semantics with
Safepay before live deployment.

Webhook references:

- Safepay API webhooks overview:
  <https://safepay-docs.netlify.app/developers/webhooks/overview/>
- Safepay HMAC signature verification:
  <https://safepay-docs.netlify.app/developers/webhooks/verify-hmac-signatures/>
- Safepay webhook event payloads:
  <https://safepay-docs.netlify.app/developers/webhooks/webhook-types/>
