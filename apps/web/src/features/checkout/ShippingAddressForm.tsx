import { motion, useReducedMotion } from 'framer-motion';
import { Check, LoaderCircle, MapPin, X } from 'lucide-react';
import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type InputHTMLAttributes,
} from 'react';
import { CheckoutButton, CheckoutCard, CheckoutNotice } from './CheckoutDesignSystem';
import {
  getShippingAddressError,
  getShippingAddressMaxLength,
  validateShippingAddress,
  type ShippingAddressErrors,
} from './shippingAddressValidation';
import type { ShippingAddress, ShippingAddressInput } from './shippingAddressService';

type Props = {
  initialAddress: ShippingAddress | null;
  emailFallback: string;
  makeDefaultInitially: boolean;
  isSaving: boolean;
  error: string | null;
  onSave: (
    addressId: string | null,
    input: ShippingAddressInput,
    makeDefault: boolean,
  ) => Promise<ShippingAddress>;
  onCancel: () => void;
  onSaved: (address: ShippingAddress) => void;
};

function makeInput(address: ShippingAddress | null, emailFallback: string): ShippingAddressInput {
  return {
    full_name: address?.full_name ?? '',
    phone: address?.phone ?? '',
    email: address?.email ?? emailFallback,
    country: address?.country ?? 'United States',
    region: address?.region ?? '',
    city: address?.city ?? '',
    postal_code: address?.postal_code ?? '',
    street_address: address?.street_address ?? '',
    apartment: address?.apartment ?? '',
    delivery_notes: address?.delivery_notes ?? '',
  };
}

const fieldLabels: Record<keyof ShippingAddressInput, string> = {
  full_name: 'Full name',
  phone: 'Phone number',
  email: 'Email address',
  country: 'Country / region',
  region: 'Province / state',
  city: 'City',
  postal_code: 'Postal code',
  street_address: 'Street address',
  apartment: 'Apartment / suite',
  delivery_notes: 'Delivery notes',
};

export default function ShippingAddressForm({
  initialAddress,
  emailFallback,
  makeDefaultInitially,
  isSaving,
  error,
  onSave,
  onCancel,
  onSaved,
}: Props) {
  const [values, setValues] = useState(() => makeInput(initialAddress, emailFallback));
  const [errors, setErrors] = useState<ShippingAddressErrors>({});
  const [touched, setTouched] = useState<Set<keyof ShippingAddressInput>>(() => new Set());
  const [showErrors, setShowErrors] = useState(false);
  const [makeDefault, setMakeDefault] = useState(makeDefaultInitially);
  const formRef = useRef<HTMLFormElement>(null);
  const reduceMotion = useReducedMotion();
  const visibleErrors = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(errors).filter(
          ([field]) => showErrors || touched.has(field as keyof ShippingAddressInput),
        ),
      ) as ShippingAddressErrors,
    [errors, showErrors, touched],
  );

  const updateField = (field: keyof ShippingAddressInput, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleBlur = (field: keyof ShippingAddressInput) => {
    setTouched((current) => new Set(current).add(field));
    const nextErrors = validateShippingAddress(values);
    setErrors((current) => ({
      ...current,
      ...(nextErrors[field] ? { [field]: nextErrors[field] } : {}),
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateShippingAddress(values);
    setErrors(nextErrors);
    setShowErrors(true);
    setTouched(new Set(Object.keys(fieldLabels) as (keyof ShippingAddressInput)[]));
    if (getShippingAddressError(nextErrors)) {
      window.requestAnimationFrame(() => {
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      });
      return;
    }

    try {
      const savedAddress = await onSave(initialAddress?.id ?? null, values, makeDefault);
      onSaved(savedAddress);
    } catch {
      // The address book owns and displays the operation error.
    }
  };

  const fieldError = (field: keyof ShippingAddressInput) => visibleErrors[field];
  const inputProps = (field: keyof ShippingAddressInput, autoComplete?: string) => ({
    id: `shipping-${field}`,
    autoComplete,
    maxLength: getShippingAddressMaxLength(field),
    value: values[field],
    required: !['apartment', 'delivery_notes'].includes(field),
    'aria-invalid': Boolean(fieldError(field)),
    'aria-describedby': fieldError(field) ? `shipping-${field}-error` : undefined,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      updateField(field, event.target.value),
    onBlur: () => handleBlur(field),
  });

  return (
    <motion.section
      className="shipping-address-editor"
      aria-labelledby="shipping-address-form-title"
      initial={reduceMotion ? false : { opacity: 0, y: 12, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -8, height: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="shipping-address-editor-heading">
        <span className="checkout-section-icon" aria-hidden="true">
          <MapPin size={18} />
        </span>
        <div>
          <p className="checkout-eyebrow">{initialAddress ? 'ADDRESS BOOK' : 'NEW ADDRESS'}</p>
          <h3 id="shipping-address-form-title">
            {initialAddress ? 'Edit address' : 'Add a delivery address'}
          </h3>
          <p>Every detail helps us get your order to just the right place.</p>
        </div>
        <button
          className="shipping-address-close"
          type="button"
          aria-label="Close address form"
          onClick={onCancel}
          disabled={isSaving}
        >
          <X size={17} aria-hidden="true" />
        </button>
      </div>

      <form ref={formRef} noValidate onSubmit={(event) => void handleSubmit(event)}>
        {error && (
          <CheckoutNotice tone="error" title="Address not saved">
            {error}
          </CheckoutNotice>
        )}
        {showErrors && getShippingAddressError(visibleErrors) && (
          <CheckoutNotice tone="error" title="A few details need your attention">
            Check the highlighted fields below.
          </CheckoutNotice>
        )}

        <CheckoutCard className="shipping-address-form-card">
          <div className="checkout-form-grid">
            <FormInput
              field="full_name"
              label={fieldLabels.full_name}
              placeholder="First and last name"
              props={inputProps('full_name', 'name')}
              error={fieldError('full_name')}
              className="is-wide"
              type="text"
              autoFocus
            />
            <FormInput
              field="email"
              label={fieldLabels.email}
              placeholder="you@example.com"
              props={inputProps('email', 'email')}
              error={fieldError('email')}
              className="is-wide"
              type="email"
            />
            <FormInput
              field="phone"
              label={fieldLabels.phone}
              placeholder="+1 (555) 000-0000"
              props={inputProps('phone', 'tel')}
              error={fieldError('phone')}
              hint="Use 7–15 digits. We’ll only contact you about delivery."
              className="is-wide"
              type="tel"
            />
            <FormInput
              field="country"
              label={fieldLabels.country}
              placeholder="Country or region"
              props={inputProps('country', 'country-name')}
              error={fieldError('country')}
              type="text"
            />
            <FormInput
              field="region"
              label={fieldLabels.region}
              placeholder="State or province"
              props={inputProps('region', 'address-level1')}
              error={fieldError('region')}
              type="text"
            />
            <FormInput
              field="city"
              label={fieldLabels.city}
              placeholder="City"
              props={inputProps('city', 'address-level2')}
              error={fieldError('city')}
              type="text"
            />
            <FormInput
              field="postal_code"
              label={fieldLabels.postal_code}
              placeholder="ZIP or postal code"
              props={inputProps('postal_code', 'postal-code')}
              error={fieldError('postal_code')}
              type="text"
            />
            <FormInput
              field="street_address"
              label={fieldLabels.street_address}
              placeholder="House number and street"
              props={inputProps('street_address', 'address-line1')}
              error={fieldError('street_address')}
              className="is-wide"
              type="text"
            />
            <FormInput
              field="apartment"
              label={fieldLabels.apartment}
              placeholder="Apartment, suite, unit (optional)"
              props={inputProps('apartment', 'address-line2')}
              error={fieldError('apartment')}
              hint="Optional"
              className="is-wide"
              type="text"
            />
            <div
              className={`checkout-field is-wide${fieldError('delivery_notes') ? ' has-error' : ''}`}
            >
              <label htmlFor="shipping-delivery_notes">{fieldLabels.delivery_notes}</label>
              <textarea
                {...inputProps('delivery_notes')}
                rows={3}
                placeholder="Gate code or helpful delivery instructions (optional)"
              />
              {fieldError('delivery_notes') ? (
                <small className="shipping-field-error" id="shipping-delivery_notes-error">
                  {fieldError('delivery_notes')}
                </small>
              ) : (
                <small>Optional · Up to 500 characters</small>
              )}
            </div>
          </div>

          <label className="shipping-default-toggle">
            <input
              type="checkbox"
              checked={makeDefault}
              onChange={(event) => setMakeDefault(event.target.checked)}
            />
            <span className="shipping-default-check">
              <Check size={12} aria-hidden="true" />
            </span>
            <span>
              <strong>Make this my default address</strong>
              <small>Use it first for future visits.</small>
            </span>
          </label>

          <div className="shipping-form-actions">
            <button
              type="button"
              className="checkout-button checkout-button--secondary"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancel
            </button>
            <CheckoutButton type="submit" disabled={isSaving}>
              {isSaving ? (
                <LoaderCircle className="shipping-spinner" size={16} aria-hidden="true" />
              ) : (
                <Check size={16} aria-hidden="true" />
              )}
              {isSaving ? 'Saving address…' : 'Save address'}
            </CheckoutButton>
          </div>
        </CheckoutCard>
      </form>
    </motion.section>
  );
}

function FormInput({
  field,
  label,
  placeholder,
  props,
  error,
  hint,
  className,
  type,
  autoFocus = false,
}: {
  field: keyof ShippingAddressInput;
  label: string;
  placeholder: string;
  props: InputHTMLAttributes<HTMLInputElement>;
  error?: string;
  hint?: string;
  className?: string;
  type: string;
  autoFocus?: boolean;
}) {
  return (
    <div
      className={`checkout-field${className ? ` ${className}` : ''}${error ? ' has-error' : ''}`}
    >
      <label htmlFor={`shipping-${field}`}>{label}</label>
      <input {...props} type={type} placeholder={placeholder} autoFocus={autoFocus} />
      {error ? (
        <small className="shipping-field-error" id={`shipping-${field}-error`}>
          {error}
        </small>
      ) : (
        hint && <small>{hint}</small>
      )}
    </div>
  );
}
