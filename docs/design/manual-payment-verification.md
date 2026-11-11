# Manual payment verification

The manual-payment flow is additive to the existing order and Safepay paths. It uses the existing
`create_order` RPC to create an order and does not change the Safepay routes or webhook processing.

## Database and storage

Apply `20261112140000_create_manual_payment_verification.sql` after the existing order and payment
migrations. It creates:

- `payment_accounts`, a singleton public-read/admin-write settings row for EasyPaisa, JazzCash, and
  future bank-transfer details.
- `manual_payment_proofs`, with customer/admin read policies and review states
  (`awaiting_payment`, `pending_verification`, `approved`, `rejected`, and `reupload_requested`).
- `payment-account-qr`, a public bucket for payment-account QR codes.
- `manual-payment-proofs`, a private bucket limited to PNG, JPEG, and WEBP files up to 5 MB.

Customers upload only beneath their own user/order path. Screenshot access uses short-lived signed
URLs; admins can read the queue and verify proofs only through authenticated admin policies and RPCs.

`prepare_manual_payment` snapshots the enabled account details and extends the order reservation to
at most 24 hours after order creation. `submit_manual_payment_proof` validates ownership, order
state, storage path, and transaction-reference length. `verify_manual_payment_proof` approves,
rejects, or requests a replacement; approval deducts inventory and advances the order to processing.
Cash on Delivery records a pending payment and advances the order/inventory when the order is placed.

## Email configuration

Configure these on the API server only; do not expose them as `VITE_*` variables:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (a verified Resend sender)
- `MANUAL_PAYMENT_ADMIN_EMAIL`
- Existing `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `WEB_APP_URL`

The API sends the admin and customer proof-received emails and sends a customer replacement-request
email after an admin rejection or re-upload request. Resend requests use idempotency keys per proof
submission/review. Email delivery failures are reported without undoing a successfully saved proof or
review.

## Admin routes

- `/admin/settings/payment-accounts` manages account names, numbers, QR codes, and enable toggles.
- `/admin/payments/pending` reviews screenshots, references, orders, and customer details.
