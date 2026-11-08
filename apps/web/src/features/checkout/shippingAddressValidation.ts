import type { ShippingAddressInput } from './shippingAddressService';

export type ShippingAddressField = keyof ShippingAddressInput;
export type ShippingAddressErrors = Partial<Record<ShippingAddressField, string>>;

const MAX_LENGTHS: Record<ShippingAddressField, number> = {
  full_name: 120,
  phone: 30,
  email: 254,
  country: 80,
  region: 100,
  city: 100,
  postal_code: 16,
  street_address: 200,
  apartment: 120,
  delivery_notes: 500,
};

const REQUIRED_FIELDS: ShippingAddressField[] = [
  'full_name',
  'phone',
  'email',
  'country',
  'region',
  'city',
  'postal_code',
  'street_address',
];

export function validateShippingAddress(input: ShippingAddressInput): ShippingAddressErrors {
  const errors: ShippingAddressErrors = {};
  for (const field of Object.keys(MAX_LENGTHS) as ShippingAddressField[]) {
    const value = input[field];
    if (value.length > MAX_LENGTHS[field]) {
      errors[field] = `Use ${MAX_LENGTHS[field]} characters or fewer.`;
    }
  }

  for (const field of REQUIRED_FIELDS) {
    if (!input[field].trim() && !errors[field]) {
      errors[field] = 'This field is required.';
    }
  }

  if (input.full_name.trim().length === 1 && !errors.full_name) {
    errors.full_name = 'Enter your first and last name.';
  }
  if (input.country.trim().length === 1 && !errors.country) {
    errors.country = 'Enter a country or region.';
  }
  if (
    input.street_address.trim().length > 0 &&
    input.street_address.trim().length < 3 &&
    !errors.street_address
  ) {
    errors.street_address = 'Enter at least 3 characters.';
  }

  const email = input.email.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email) && !errors.email) {
    errors.email = 'Enter a valid email address.';
  }

  const phone = input.phone.trim();
  const phoneDigits = phone.replace(/\D/gu, '');
  if (
    phone &&
    (!/^\+?[0-9().\-\s]+$/u.test(phone) || phoneDigits.length < 7 || phoneDigits.length > 15) &&
    !errors.phone
  ) {
    errors.phone = 'Enter a valid phone number with 7–15 digits.';
  }

  const postalCode = input.postal_code.trim();
  if (
    postalCode &&
    (!/^[a-z0-9][a-z0-9 -]{1,14}[a-z0-9]$/iu.test(postalCode) || postalCode.length < 3) &&
    !errors.postal_code
  ) {
    errors.postal_code = 'Enter a valid postal or ZIP code.';
  }

  return errors;
}

export function getShippingAddressError(fields: ShippingAddressErrors): string | null {
  return Object.values(fields).find(Boolean) ?? null;
}

export function getShippingAddressMaxLength(field: ShippingAddressField): number {
  return MAX_LENGTHS[field];
}
