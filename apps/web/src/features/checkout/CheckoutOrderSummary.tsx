import { ArrowRight, MapPin, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CartDisplayItem } from '@/features/cart/cartTypes';
import { formatCartPrice, getCartItemSavings, getCartLineTotal } from '@/features/cart/cartUtils';
import type { ShippingAddress } from './shippingAddressService';

export default function CheckoutOrderSummary({
  items,
  selectedAddress,
}: {
  items: CartDisplayItem[];
  selectedAddress: ShippingAddress | null;
}) {
  const availableItems = items.filter((item) => item.inStock);
  const subtotal = availableItems.reduce((sum, item) => sum + getCartLineTotal(item), 0);
  const savings = availableItems.reduce((sum, item) => sum + getCartItemSavings(item), 0);
  const itemCount = availableItems.reduce((count, item) => count + item.quantity, 0);

  return (
    <aside className="checkout-summary" aria-labelledby="checkout-summary-title">
      <div className="checkout-summary-heading">
        <div>
          <p className="checkout-eyebrow">YOUR SELECTION</p>
          <h2 id="checkout-summary-title">Order summary</h2>
        </div>
        <Link to="/cart" aria-label="Edit your bag">
          Edit <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      <div className="checkout-summary-items">
        {items.map((item) => {
          const product = item.product;
          const name = product?.name ?? 'Unavailable product';
          const variantLabel = item.variant
            ? [item.variant.color, item.variant.size, item.variant.material]
                .filter(Boolean)
                .join(' · ')
            : null;
          return (
            <div
              className={`checkout-summary-item${item.inStock ? '' : ' is-unavailable'}`}
              key={item.id}
            >
              <span className="checkout-summary-image">
                {product?.imageUrl ? (
                  <img src={product.imageUrl} alt={product.imageAlt} />
                ) : (
                  <Tag size={18} aria-hidden="true" />
                )}
                <span>{item.quantity}</span>
              </span>
              <span className="checkout-summary-copy">
                <strong>{name}</strong>
                {variantLabel && <small>{variantLabel}</small>}
                {!item.inStock && <small className="checkout-unavailable">Unavailable</small>}
              </span>
              <span className="checkout-summary-line-price">
                {item.inStock ? formatCartPrice(getCartLineTotal(item)) : '—'}
              </span>
            </div>
          );
        })}
      </div>

      <dl className="checkout-totals">
        <div>
          <dt>
            Subtotal{' '}
            <span>
              ({itemCount} {itemCount === 1 ? 'piece' : 'pieces'})
            </span>
          </dt>
          <dd>{formatCartPrice(subtotal)}</dd>
        </div>
        {savings > 0 && (
          <div className="checkout-savings">
            <dt>Thoughtful savings</dt>
            <dd>−{formatCartPrice(savings)}</dd>
          </div>
        )}
        <div>
          <dt>Delivery</dt>
          <dd className="checkout-total-note">Next step</dd>
        </div>
        <div>
          <dt>Estimated tax</dt>
          <dd className="checkout-total-note">Next step</dd>
        </div>
        <div className="checkout-grand-total">
          <dt>Estimated total</dt>
          <dd>{formatCartPrice(subtotal)}</dd>
        </div>
      </dl>

      <div className="checkout-summary-delivery" aria-live="polite">
        <span>
          <MapPin size={15} aria-hidden="true" />
        </span>
        <p>
          <strong>
            {selectedAddress
              ? `Delivering to ${selectedAddress.full_name}`
              : 'Choose a delivery address'}
          </strong>
          {selectedAddress
            ? `${selectedAddress.city}, ${selectedAddress.region} ${selectedAddress.postal_code}`
            : 'Your selected address will appear here.'}
        </p>
      </div>

      <p className="checkout-summary-footnote">
        Delivery and tax are currently placeholders and are not calculated in this estimate.
      </p>
      <div className="checkout-summary-assurance">
        <span aria-hidden="true">
          <Tag size={15} />
        </span>
        <p>
          <strong>A little more considered.</strong>
          Your savings are reflected in the estimate.
        </p>
      </div>
    </aside>
  );
}
