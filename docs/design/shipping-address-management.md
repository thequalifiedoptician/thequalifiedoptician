# Phase 6.2: Shipping address management

The checkout Delivery step now uses a saved address book. Customers can add
multiple addresses, select an address for the current checkout, edit and delete
saved addresses, and choose a default. The selected address is shown in the
order summary and in the later review step.

## Architecture

- `ShippingAddressBook.tsx` owns address selection, card actions, empty/loading
  states, and delete confirmation.
- `ShippingAddressForm.tsx` is the reusable add/edit form. It provides
  accessible inline validation, autocomplete hints, optional apartment and
  delivery notes, and default-address selection.
- `shippingAddressValidation.ts` provides shared field length, required,
  email, phone, and postal-code validation.
- `shippingAddressService.ts` provides typed address CRUD and default-address
  operations through the user's authenticated Supabase client.
- `useShippingAddresses.ts` loads and refreshes the current user's address
  book and exposes its async operations to checkout.
- `CheckoutPage.tsx` integrates saved address selection with payment/review
  navigation. `CheckoutOrderSummary.tsx` displays the current destination.
- `20261106130000_create_shipping_addresses.sql` creates the private address
  table, constraints, owner-only RLS policies, updated-at trigger, one-default
  index, and a serialized default-selection RPC.
- `20261107120000_enforce_shipping_contact_formats.sql` adds database
  validation for email and phone values. The checks are `NOT VALID` to avoid
  blocking deployment on legacy records; existing records should be reviewed
  and corrected before the constraints are validated.

## Design decisions

- Reuse Phase 6.1 checkout fields, cards, buttons, notices, loading patterns,
  step transitions, responsive layout, and reduced-motion behavior.
- Keep saved addresses private with row-level security scoped to `auth.uid()`.
- Serialize default changes per user and enforce one default address in the
  database, not just in the UI.
- When a default address is deleted, promote another saved address before
  removal. Deleting the only address leaves the address book empty.
- The selected checkout destination may differ from the saved default; choosing
  an address for this visit does not silently change the customer's default.
- Address changes persist immediately, but the checkout preview still does not
  create orders or process payments.

## Setup

Apply `supabase/migrations/20261106130000_create_shipping_addresses.sql` after
the existing catalog and checkout migrations. The address book cannot persist
until the migration has been applied to the configured Supabase project.
Also apply `supabase/migrations/20261107120000_enforce_shipping_contact_formats.sql`
to enforce contact formats for newly saved or modified addresses.

## Manual testing checklist

1. Sign in and open `/checkout` with a populated bag. Confirm the address book
   displays its loading state and then either saved addresses or the empty
   state.
2. Add the first address; verify it becomes the default and is selected for
   checkout. Check each required field and its inline error.
3. Test invalid email, too-short/too-long phone, invalid postal code, empty
   required fields, and maximum input lengths. Confirm focus moves to the first
   invalid field.
4. Add a second address without making it default. Select it and confirm the
   order-summary destination updates while the default badge stays unchanged.
5. Edit an address and verify the saved values, optional apartment, and
   delivery notes persist after refresh.
6. Make another address the default. Confirm the badge moves and only one
   address is default after reload.
7. Delete a non-default address. Delete the default when another address
   exists and confirm the next saved address becomes default. Delete the only
   remaining address and confirm checkout cannot continue until a new one is
   saved.
8. Continue to payment and review. Confirm the selected address and delivery
   notes are shown in the checkout summary/review and return navigation keeps
   the selected address during the current visit.
9. Test mobile, tablet, laptop, and desktop widths; keyboard-only selection,
   form operation, and delete confirmation; and reduced-motion preference.
10. With anon and another authenticated account, verify address reads and
    writes are denied by RLS. Confirm failed loads, saves, default changes,
    and deletes have visible retry/error states.
