export default function PaymentBrandMark({
  brand,
  large = false,
}: {
  brand: 'easypaisa' | 'jazzcash';
  large?: boolean;
}) {
  return (
    <span
      className={`payment-brand-mark payment-brand-mark--${brand}${large ? ' is-large' : ''}`}
      aria-label={brand === 'easypaisa' ? 'EasyPaisa' : 'JazzCash'}
    >
      {brand === 'easypaisa' ? (
        <><span>easy</span>paisa</>
      ) : (
        <><span>Jazz</span>Cash</>
      )}
    </span>
  );
}
