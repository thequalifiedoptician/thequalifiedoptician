import { ArrowRight, LockKeyhole } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CartDisplayItem } from './cartTypes';
import { formatCartPrice, getCartItemSavings, getCartLineTotal } from './cartUtils';

type CartSummaryProps = {
  items: CartDisplayItem[];
};

export default function CartSummary({ items }: CartSummaryProps) {
  const availableItems = items.filter((item) => item.inStock);
  const subtotal = availableItems.reduce((sum, item) => sum + getCartLineTotal(item), 0);
  const savings = availableItems.reduce((sum, item) => sum + getCartItemSavings(item), 0);

  return (
    <aside className="cart-summary" aria-labelledby="cart-summary-title">
      <h2 id="cart-summary-title">Order summary</h2>
      <dl>
        <div>
          <dt>Subtotal</dt>
          <dd>{formatCartPrice(subtotal)}</dd>
        </div>
        <div>
          <dt>Estimated savings</dt>
          <dd className="cart-savings-value">−{formatCartPrice(savings)}</dd>
        </div>
        <div>
          <dt>Shipping</dt>
          <dd>Calculated later</dd>
        </div>
        <div>
          <dt>Estimated tax</dt>
          <dd>Calculated later</dd>
        </div>
        <div className="cart-summary-total">
          <dt>Estimated total</dt>
          <dd>{formatCartPrice(subtotal)}</dd>
        </div>
      </dl>
      <p className="cart-summary-note">
        Shipping and tax are estimates and will be confirmed before checkout.
      </p>
      <Link className="cart-checkout-button" to="/checkout">
        Continue to checkout
        <ArrowRight aria-hidden="true" />
      </Link>
      <p className="cart-checkout-assurance">
        <LockKeyhole aria-hidden="true" />
        Checkout preview · Review before placing an order
      </p>
      <Link className="cart-continue-link" to="/shop">
        Continue shopping <ArrowRight aria-hidden="true" />
      </Link>
    </aside>
  );
}
