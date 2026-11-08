import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  LoaderCircle,
  MapPin,
  PackageCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AUTH_ROUTES } from '@/features/auth/constants/auth';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getAuthRedirectState } from '@/features/auth/utils/authNavigation';
import ShippingAddressBook from './ShippingAddressBook';
import type { ShippingAddress } from './shippingAddressService';
import { useShippingAddresses } from './useShippingAddresses';
import type { CheckoutStepId } from './CheckoutDesignSystem';
import {
  CheckoutButton,
  CheckoutCard,
  CheckoutEmptyState,
  CheckoutErrorState,
  CheckoutFrame,
  CheckoutLoadingState,
  CheckoutNotice,
  CheckoutSection,
  CheckoutStepper,
  CheckoutTrustBadges,
} from './CheckoutDesignSystem';
import CheckoutOrderSummary from './CheckoutOrderSummary';
import { useOrderCreation } from './useOrderCreation';
import PaymentMethodSelector from './payment/PaymentMethodSelector';
import PaymentStatusPanel from './payment/PaymentStatusPanel';
import { usePayment } from './payment/usePayment';
import { useSafepayCheckout } from './payment/useSafepayCheckout';
import { useCart } from '@/features/cart/useCart';
import './checkout.css';

export default function CheckoutPage() {
  const { isAuthenticated, isLoading: isAuthLoading, session, user } = useAuth();
  const { items, isLoading, error, refreshCart } = useCart();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const orderCreation = useOrderCreation(user?.id, refreshCart);
  const payment = usePayment();
  const {
    startCheckout: startSafepayCheckout,
    isLoading: isSafepayLoading,
    error: safepayError,
  } = useSafepayCheckout(session?.access_token);
  const {
    addresses,
    isLoading: areAddressesLoading,
    error: addressError,
    refresh: refreshAddresses,
    save: saveAddress,
    remove: removeAddress,
    makeDefault: makeAddressDefault,
  } = useShippingAddresses(user?.id);
  const location = useLocation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState<CheckoutStepId>('delivery');
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showReviewNotice, setShowReviewNotice] = useState(false);
  const selectedAddress: ShippingAddress | null =
    addresses.find((address) => address.id === selectedAddressId) ??
    addresses.find((address) => address.is_default) ??
    addresses[0] ??
    null;

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      navigate(AUTH_ROUTES.login, { replace: true, state: getAuthRedirectState(location) });
    }
  }, [isAuthLoading, isAuthenticated, location, navigate]);

  useEffect(() => {
    if (orderCreation.order && isAuthenticated) {
      void startSafepayCheckout(orderCreation.order.id);
    }
  }, [isAuthenticated, orderCreation.order, startSafepayCheckout]);

  const continueFromDelivery = () => {
    setStep('payment');
  };

  const continueFromPayment = () => {
    if (!selectedAddress) {
      setStep('delivery');
      return;
    }
    if (payment.selectedMethod.disabled) return;
    setShowReviewNotice(false);
    setStep('review');
  };

  const updateStep = (nextStep: CheckoutStepId) => {
    const currentIndex = ['delivery', 'payment', 'review'].indexOf(step);
    const nextIndex = ['delivery', 'payment', 'review'].indexOf(nextStep);
    if (nextIndex <= currentIndex) {
      setStep(nextStep);
      setShowReviewNotice(false);
    }
  };

  const pageTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const };

  if (isAuthLoading || !isAuthenticated || isLoading) {
    return (
      <CheckoutFrame>
        <main className="checkout-content" id="checkout-content">
          <CheckoutLoadingState />
        </main>
      </CheckoutFrame>
    );
  }

  if (error) {
    return (
      <CheckoutFrame>
        <main className="checkout-content" id="checkout-content">
          <CheckoutErrorState message={error} onRetry={refreshCart} />
        </main>
      </CheckoutFrame>
    );
  }

  if (items.length === 0) {
    return (
      <CheckoutFrame>
        <main className="checkout-content" id="checkout-content">
          <CheckoutEmptyState />
        </main>
      </CheckoutFrame>
    );
  }

  const availableItems = items.filter((item) => item.inStock);

  return (
    <CheckoutFrame>
      <main className="checkout-content" id="checkout-content">
        <div className="checkout-intro">
          <div>
            <p className="checkout-eyebrow">
              <PackageCheck size={14} aria-hidden="true" />
              ONE LAST THOUGHTFUL STEP
            </p>
            <h1>Let’s make it yours.</h1>
            <p>Share where to send your selection. You’ll review everything before it’s final.</p>
          </div>
          <Link className="checkout-return-link" to="/cart">
            <ArrowLeft size={15} aria-hidden="true" />
            Return to bag
          </Link>
        </div>

        <CheckoutNotice tone="info" title="Safepay hosted checkout">
          After review, your order is created and you’ll continue to Safepay to complete payment.
          Payment status is not verified when you return; available stock is reserved for 15
          minutes.
        </CheckoutNotice>

        <CheckoutStepper currentStep={step} onStepSelect={updateStep} />

        <div className="checkout-layout">
          <div className="checkout-main-column">
            {!availableItems.length && (
              <CheckoutNotice tone="warning" title="Your items need another look">
                None of the items in your bag are currently available. You can review or remove them
                from your bag before continuing.
              </CheckoutNotice>
            )}
            {availableItems.length > 0 && items.some((item) => !item.inStock) && (
              <CheckoutNotice tone="warning" title="One item is unavailable">
                It remains in your bag and cannot be ordered. Remove it or resolve availability
                before creating an order.
              </CheckoutNotice>
            )}

            <AnimatePresence mode="wait" initial={false}>
              {step === 'delivery' && (
                <motion.div
                  className="checkout-step-panel"
                  key="delivery"
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                  transition={pageTransition}
                >
                  <CheckoutSection
                    number="01"
                    eyebrow="DELIVERY ADDRESS"
                    title="A place to arrive."
                    description="Choose a saved address or add a new one for this delivery."
                    icon={<MapPin size={19} />}
                  >
                    <ShippingAddressBook
                      addresses={addresses}
                      selectedAddress={selectedAddress}
                      emailFallback={user?.email ?? ''}
                      isLoading={areAddressesLoading}
                      error={addressError}
                      onRetry={refreshAddresses}
                      onSelect={setSelectedAddressId}
                      onSave={saveAddress}
                      onDelete={removeAddress}
                      onMakeDefault={makeAddressDefault}
                    />
                  </CheckoutSection>

                  <div className="checkout-actions">
                    <Link className="checkout-back-to-bag" to="/cart">
                      <ArrowLeft size={15} aria-hidden="true" /> Back to bag
                    </Link>
                    <CheckoutButton
                      disabled={!availableItems.length || !selectedAddress || areAddressesLoading}
                      onClick={continueFromDelivery}
                    >
                      Continue to payment <ArrowRight size={16} aria-hidden="true" />
                    </CheckoutButton>
                  </div>
                </motion.div>
              )}

              {step === 'payment' && (
                <motion.div
                  className="checkout-step-panel"
                  key="payment"
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                  transition={pageTransition}
                >
                  <CheckoutSection
                    number="02"
                    eyebrow="PAYMENT"
                    title="A considered way to pay."
                    description="Choose Safepay. Hosted checkout opens after you create your order."
                    icon={<CreditCard size={19} />}
                  >
                    <PaymentMethodSelector
                      methods={payment.methods}
                      selectedMethodId={payment.selectedMethodId}
                      onSelect={payment.selectMethod}
                    />
                    <PaymentStatusPanel status={payment.status} />
                    <CheckoutNotice tone="info" title="No payment details requested">
                      This selection is kept only for this checkout session. No card numbers,
                      credentials, secure tokens, or payment requests are handled.
                    </CheckoutNotice>
                  </CheckoutSection>

                  <CheckoutSection
                    number="03"
                    eyebrow="DELIVERY"
                    title="Your delivery details."
                    icon={<MapPin size={19} />}
                  >
                    <CheckoutCard className="checkout-address-review">
                      <div>
                        {selectedAddress ? (
                          <>
                            <strong>{selectedAddress.full_name}</strong>
                            <p>
                              {selectedAddress.street_address}
                              {selectedAddress.apartment ? `, ${selectedAddress.apartment}` : ''}
                            </p>
                            <p>
                              {selectedAddress.city}, {selectedAddress.region}{' '}
                              {selectedAddress.postal_code}
                            </p>
                            <p>{selectedAddress.country}</p>
                            <p>
                              {selectedAddress.email} · {selectedAddress.phone}
                            </p>
                            {selectedAddress.delivery_notes && (
                              <p>Delivery note: {selectedAddress.delivery_notes}</p>
                            )}
                          </>
                        ) : (
                          <p>No delivery address selected.</p>
                        )}
                      </div>
                      <button
                        type="button"
                        className="checkout-text-action"
                        onClick={() => updateStep('delivery')}
                      >
                        Edit
                      </button>
                    </CheckoutCard>
                  </CheckoutSection>

                  <div className="checkout-actions">
                    <CheckoutButton variant="secondary" onClick={() => updateStep('delivery')}>
                      <ArrowLeft size={15} aria-hidden="true" /> Back to delivery
                    </CheckoutButton>
                    <CheckoutButton
                      disabled={!payment.selectedMethod || payment.selectedMethod.disabled}
                      onClick={continueFromPayment}
                    >
                      Continue to review <ArrowRight size={16} aria-hidden="true" />
                    </CheckoutButton>
                  </div>
                </motion.div>
              )}

              {step === 'review' && (
                <motion.div
                  className="checkout-step-panel"
                  key="review"
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                  transition={pageTransition}
                >
                  <CheckoutSection
                    number="04"
                    eyebrow="FINAL DETAILS"
                    title="Everything in its place."
                    description="Take a moment to review your delivery details and selection."
                    icon={<Check size={19} />}
                  >
                    <CheckoutCard className="checkout-review-card">
                      <div className="checkout-review-block">
                        <div>
                          <span className="checkout-review-icon">
                            <MapPin size={16} />
                          </span>
                          <strong>Delivering to</strong>
                        </div>
                        <button
                          type="button"
                          className="checkout-text-action"
                          onClick={() => updateStep('delivery')}
                        >
                          Edit
                        </button>
                        <p>
                          {selectedAddress?.full_name}
                          <br />
                          {selectedAddress?.street_address}
                          {selectedAddress?.apartment ? `, ${selectedAddress.apartment}` : ''}
                          <br />
                          {selectedAddress?.city}, {selectedAddress?.region}{' '}
                          {selectedAddress?.postal_code}
                          <br />
                          {selectedAddress?.country}
                          <br />
                          {selectedAddress?.email} · {selectedAddress?.phone}
                          {selectedAddress?.delivery_notes && (
                            <>
                              <br />
                              Delivery note: {selectedAddress.delivery_notes}
                            </>
                          )}
                        </p>
                      </div>
                      <div className="checkout-review-block">
                        <div>
                          <span className="checkout-review-icon">
                            <CreditCard size={16} />
                          </span>
                          <strong>Payment</strong>
                        </div>
                        <button
                          type="button"
                          className="checkout-text-action"
                          onClick={() => updateStep('payment')}
                        >
                          Review
                        </button>
                        <p>
                          {payment.selectedMethod.title} · hosted checkout opens after order
                          creation.
                        </p>
                      </div>
                    </CheckoutCard>
                  </CheckoutSection>

                  <CheckoutNotice tone="warning" title="Review the order total">
                    Safepay will receive the saved order total. Shipping and tax currently use
                    placeholders, and the order remains pending until payment status verification is
                    added.
                  </CheckoutNotice>
                  {showReviewNotice && (
                    <CheckoutNotice tone="info">
                      Review the delivery address and bag before creating your order.
                    </CheckoutNotice>
                  )}
                  {orderCreation.error && (
                    <CheckoutNotice tone="error" title="Order not created">
                      {orderCreation.error}
                    </CheckoutNotice>
                  )}
                  {safepayError && (
                    <CheckoutNotice tone="error" title="Safepay checkout could not start">
                      {safepayError}
                    </CheckoutNotice>
                  )}
                  <div
                    className="checkout-actions"
                    aria-busy={orderCreation.isProcessing || isSafepayLoading}
                  >
                    <CheckoutButton variant="secondary" onClick={() => updateStep('payment')}>
                      <ArrowLeft size={15} aria-hidden="true" /> Back to payment
                    </CheckoutButton>
                    <CheckoutButton
                      disabled={
                        orderCreation.isProcessing ||
                        isSafepayLoading ||
                        !selectedAddress ||
                        items.some((item) => !item.inStock)
                      }
                      onClick={() => {
                        setShowReviewNotice(false);
                        if (orderCreation.order) {
                          void startSafepayCheckout(orderCreation.order.id);
                        } else {
                          void orderCreation.submit(
                            selectedAddress?.id ?? null,
                            items,
                            idempotencyKey,
                          );
                        }
                      }}
                    >
                      {orderCreation.isProcessing || isSafepayLoading ? (
                        <>
                          <LoaderCircle
                            className="checkout-processing-icon"
                            size={16}
                            aria-hidden="true"
                          />
                          {orderCreation.isProcessing ? 'Creating order…' : 'Opening Safepay…'}
                        </>
                      ) : (
                        <>
                          {orderCreation.order
                            ? 'Retry Safepay checkout'
                            : 'Create order & continue to Safepay'}{' '}
                          <Check size={16} aria-hidden="true" />
                        </>
                      )}
                    </CheckoutButton>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <CheckoutTrustBadges />
          </div>

          <CheckoutOrderSummary items={items} selectedAddress={selectedAddress} />
        </div>
      </main>
    </CheckoutFrame>
  );
}
