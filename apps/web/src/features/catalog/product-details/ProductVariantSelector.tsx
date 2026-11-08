import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { AvailableProductVariant } from './productDetailsService';

type VariantDimension = 'color' | 'size' | 'material';

type ProductVariantSelectorProps = {
  variants: AvailableProductVariant[];
  selectedVariant: AvailableProductVariant | null;
  onSelect: (variantId: string) => void;
};

const dimensions: Array<{ key: VariantDimension; label: string }> = [
  { key: 'color', label: 'Color' },
  { key: 'size', label: 'Size' },
  { key: 'material', label: 'Material' },
];

export default function ProductVariantSelector({
  variants,
  selectedVariant,
  onSelect,
}: ProductVariantSelectorProps) {
  const reduceMotion = useReducedMotion();
  if (variants.length === 0) {
    return null;
  }

  const selected = selectedVariant ?? variants[0];
  const visibleDimensions = dimensions.filter(({ key }) =>
    variants.some((variant) => variant[key] !== null),
  );

  if (visibleDimensions.length === 0) {
    return (
      <p className="product-variant-sku">
        Option <span>{selected.sku}</span>
      </p>
    );
  }

  const isOptionAvailable = (dimension: VariantDimension, value: string) =>
    variants.some((variant) => variant.inStock && variant[dimension] === value);

  const selectOption = (dimension: VariantDimension, value: string) => {
    const option =
      variants.find(
        (variant) =>
          variant.inStock &&
          variant[dimension] === value &&
          dimensions.every(({ key }) => key === dimension || variant[key] === selected[key]),
      ) ?? variants.find((variant) => variant.inStock && variant[dimension] === value);
    if (option) {
      onSelect(option.id);
    }
  };

  return (
    <div className="product-variant-selector" aria-label="Product options">
      {visibleDimensions.map(({ key, label }) => {
        const values = [
          ...new Set(variants.flatMap((variant) => (variant[key] ? [variant[key]] : []))),
        ];
        const selectedValue = selected[key];

        return (
          <fieldset className="product-variant-group" key={key}>
            <legend>
              {label}
              {selectedValue && <span>{selectedValue}</span>}
            </legend>
            <div className="product-variant-options" role="group" aria-label={`Choose ${label}`}>
              {values.map((value) => {
                const isSelected = selectedValue === value;
                const available = isOptionAvailable(key, value);

                return (
                  <motion.button
                    key={value}
                    className={`product-variant-option${isSelected ? ' is-selected' : ''}`}
                    type="button"
                    aria-pressed={isSelected}
                    disabled={!available}
                    aria-label={`${label} ${value}${available ? '' : ', out of stock'}`}
                    onClick={() => selectOption(key, value)}
                    whileTap={reduceMotion || !available ? undefined : { scale: 0.96 }}
                  >
                    {isSelected && (
                      <motion.span
                        className="product-variant-selection-indicator"
                        layoutId={`variant-selection-${key}`}
                        transition={{ duration: reduceMotion ? 0 : 0.18 }}
                        aria-hidden="true"
                      />
                    )}
                    <span>{value}</span>
                  </motion.button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={selected.id}
          className={`product-variant-availability${selected.inStock ? '' : ' is-sold-out'}`}
          role="status"
          initial={reduceMotion ? false : { opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: reduceMotion ? 1 : 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.16 }}
        >
          {selected.inStock ? 'Selected option is in stock' : 'Selected option is sold out'}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
