# Checkout design system

Phase 6.1 establishes the shared visual and interaction foundation for the
checkout phases that follow. The `/checkout` route is a design preview: address
details remain in page memory, and payment processing and order placement are
not connected.

## Shared components

`apps/web/src/features/checkout/CheckoutDesignSystem.tsx` provides the branded
checkout frame, progress stepper, section/card patterns, labeled fields,
buttons, notices, trust row, and loading, empty, and error states.
`CheckoutOrderSummary.tsx` provides the reusable responsive order summary.
`checkout.css` defines the checkout tokens and responsive, accessible states.

Build later checkout features from these shared pieces rather than introducing
new page-specific spacing, colors, radii, focus states, or button treatments.
The checkout route intentionally omits the storefront navigation and footer so
the customer can focus on the order.

## Design and interaction standards

- Use the `--checkout-*` tokens for checkout colors, card/control radii, and
  elevation.
- Keep the order summary visible beside the active step on larger screens; put
  it before the form on small screens.
- Use the shared stepper for progress and only enable steps the customer has
  reached.
- Keep labels visible, preserve native form validation, and retain keyboard
  focus indicators.
- Respect reduced-motion preferences for transitions and loading animation.
- Show delivery and tax as estimates until those values are configured. Do not
  imply that a preview has charged a customer or created an order.

## Manual review

1. Open `/checkout` with a signed-in account and a populated bag.
2. Check the delivery, payment-preview, and review steps; verify back/edit
   navigation and required address validation.
3. Confirm product lines, unavailable-item messaging, subtotal, and savings
   match the bag.
4. Open checkout with an empty bag and with a cart-loading error; verify the
   empty and retry states.
5. Test at desktop, tablet, and narrow mobile widths, and with keyboard-only
   navigation and reduced motion.
6. Confirm the preview notice remains visible and the final action cannot
   submit or charge an order.
