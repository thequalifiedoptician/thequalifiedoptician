import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import CartAddButton from '@/features/cart/CartAddButton';
import WishlistButton from '@/features/wishlist/WishlistButton';
import type { AvailableProductVariant, ProductRow } from './productDetailsService';

type PurchaseInformationPanelProps = {
  product: ProductRow;
  variant: AvailableProductVariant | null;
  inStock: boolean;
};

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(price);
}

export default function PurchaseInformationPanel({
  product,
  variant,
  inStock,
}: PurchaseInformationPanelProps) {
  const [quantity, setQuantity] = useState(1);
  const price = variant?.price ?? product.price;
  const comparePrice =
    product.compare_price !== null && product.compare_price > price ? product.compare_price : null;
  const discountPercentage =
    comparePrice === null ? null : Math.round(((comparePrice - price) / comparePrice) * 100);

  return (
    <section className="product-purchase-panel" aria-label="Purchase information">
      <p className="product-details-sku">SKU: {variant?.sku ?? product.sku}</p>
      <div className="product-details-price-row" aria-live="polite">
        <span className="product-details-price">{formatPrice(price)}</span>
        {comparePrice !== null && (
          <>
            <span className="product-details-compare-price">{formatPrice(comparePrice)}</span>
            <span className="product-details-discount">{discountPercentage}% off</span>
          </>
        )}
      </div>

      <p className={`product-details-stock${inStock ? '' : ' is-sold-out'}`} role="status">
        <span aria-hidden="true" />
        {inStock ? 'In stock' : 'Currently sold out'}
      </p>

      <div className="product-quantity-row">
        <span id="product-quantity-label">Quantity</span>
        <div
          className="product-quantity-control"
          role="group"
          aria-labelledby="product-quantity-label"
        >
          <button
            type="button"
            aria-label="Decrease quantity"
            disabled={!inStock || quantity <= 1}
            onClick={() => setQuantity((current) => Math.max(1, current - 1))}
          >
            <Minus size={14} aria-hidden="true" />
          </button>
          <output aria-live="polite" aria-label={`Quantity ${quantity}`}>
            {quantity}
          </output>
          <button
            type="button"
            aria-label="Increase quantity"
            disabled={!inStock || quantity >= 99}
            onClick={() => setQuantity((current) => Math.min(99, current + 1))}
          >
            <Plus size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      <CartAddButton
        className="product-add-to-cart"
        productId={product.id}
        productName={product.name}
        variantId={variant?.id ?? null}
        quantity={quantity}
        disabled={!inStock}
      />

      <div className="product-wishlist-action">
        <WishlistButton
          productId={product.id}
          productName={product.name}
          className="product-wishlist-toggle"
        />
        <span>Save this piece for later</span>
      </div>

      <div className="product-purchase-policies">
        <p>
          <strong>Delivery</strong>
          Delivery options are shared before checkout.
        </p>
        <p>
          <strong>Returns</strong>
          Return eligibility is subject to the published policy.
        </p>
      </div>
    </section>
  );
}
