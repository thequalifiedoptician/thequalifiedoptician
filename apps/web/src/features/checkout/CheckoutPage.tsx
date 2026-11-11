import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  LoaderCircle,
  MapPin,
  PackageCheck,
  Upload,
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
import { isManualPaymentMethod, type ManualPaymentMethodId } from './payment/paymentTypes';
import {
  getPaymentAccounts,
  resolvePaymentQrUrl,
  type PaymentAccount,
} from './payment/paymentAccountService';
import {
  prepareManualPayment,
  recordCashOnDelivery,
  uploadManualPaymentProof,
  validateManualPaymentProofFile,
} from './payment/manualPaymentService';
import { apiClient } from '@/lib/api-client';
import { useCart } from '@/features/cart/useCart';
import { getSupabaseClient } from '@/lib/supabase';
import './checkout.css';

function CheckoutManualAccountDetails({
  accounts,
  method,
  proofFile,
  proofFileError,
  transactionReference,
  onProofFileChange,
  onTransactionReferenceChange,
}: {
  accounts: PaymentAccount;
  method: ManualPaymentMethodId;
  proofFile: File | null;
  proofFileError: string | null;
  transactionReference: string;
  onProofFileChange: (file: File | null) => void;
  onTransactionReferenceChange: (value: string) => void;
}) {
  const isEasyPaisa = method === 'easypaisa';
  const title = isEasyPaisa ? 'EasyPaisa' : 'JazzCash';
  const holderName = isEasyPaisa
    ? accounts.easypaisa_holder_name
    : accounts.jazzcash_holder_name;
  const mobileNumber = isEasyPaisa
    ? accounts.easypaisa_mobile_number
    : accounts.jazzcash_mobile_number;
  const qrPath = isEasyPaisa ? accounts.easypaisa_qr_path : accounts.jazzcash_qr_path;
  const [qrResult, setQrResult] = useState<{
    path: string;
    url: string | null;
    error: string | null;
  } | null>(null);
  const currentQrResult = qrPath && qrResult?.path === qrPath ? qrResult : null;

  useEffect(() => {
    let active = true;
    if (!qrPath) return () => {
      active = false;
    };

    void resolvePaymentQrUrl(qrPath).then(
      (url) => {
        if (active) setQrResult({ path: qrPath, url, error: null });
      },
      () => {
        if (active) {
          setQrResult({
            path: qrPath,
            url: null,
            error: 'QR code could not be loaded. You can use the account number instead.',
          });
        }
      },
    );
    return () => {
      active = false;
    };
  }, [qrPath]);

  return (
    <section className="checkout-transfer-account" aria-label={`${title} transfer details`}>
      <header>
        <div>
          <p>TRANSFER ACCOUNT</p>
          <h3>{title}</h3>
        </div>
        <span>Transfer before continuing</span>
      </header>
      <dl>
        <div>
          <dt>Account holder</dt>
          <dd>{holderName}</dd>
        </div>
        <div>
          <dt>Mobile number</dt>
          <dd>{mobileNumber}</dd>
        </div>
      </dl>
      {qrPath ? (
        currentQrResult?.url ? (
          <figure className="checkout-transfer-qr">
            <img src={currentQrResult.url} alt={`${title} account QR code`} />
            <figcaption>Scan to pay the order total before continuing.</figcaption>
          </figure>
        ) : (
          <p className={currentQrResult?.error ? 'checkout-transfer-qr-error' : 'checkout-transfer-qr-loading'}>
            {currentQrResult?.error ?? 'Loading account QR code…'}
          </p>
        )
      ) : (
        <p className="checkout-transfer-qr-loading">
          No QR code is set up. You can transfer using the mobile number above.
        </p>
      )}
      <div className="checkout-transfer-proof">
        <div>
          <h4>Payment screenshot</h4>
          <p>After transferring the order total, add your screenshot here to continue.</p>
        </div>
        <label className="checkout-transfer-proof-picker">
          <Upload size={18} aria-hidden="true" />
          <span>{proofFile?.name ?? 'Add payment screenshot'}</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-required="true"
            aria-describedby={proofFileError ? 'checkout-proof-file-error' : undefined}
            onChange={(event) => {
              const nextFile = event.currentTarget.files?.[0] ?? null;
              event.currentTarget.value = '';
              onProofFileChange(nextFile);
            }}
          />
        </label>
        <p className="checkout-transfer-proof-hint">PNG, JPG, JPEG, or WEBP · maximum 5 MB</p>
        <label className="checkout-transfer-reference">
          Transaction reference (optional)
          <input
            value={transactionReference}
            maxLength={120}
            onChange={(event) => onTransactionReferenceChange(event.target.value)}
          />
        </label>
        {proofFileError && (
          <p className="checkout-transfer-proof-error" id="checkout-proof-file-error" role="alert">
            {proofFileError}
          </p>
        )}
      </div>
    </section>
  );
}

export default function CheckoutPage() {
  const { isAuthenticated, isLoading: isAuthLoading, session, user } = useAuth();
  const { items, isLoading, error, refreshCart } = useCart();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const orderCreation = useOrderCreation(user?.id, refreshCart);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount | null>(null);
  const [paymentAccountError, setPaymentAccountError] = useState<string | null>(null);
  const [isLoadingPaymentAccounts, setIsLoadingPaymentAccounts] = useState(true);
  const [isSubmittingOrderPayment, setIsSubmittingOrderPayment] = useState(false);
  const [orderPaymentError, setOrderPaymentError] = useState<string | null>(null);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofFileError, setPaymentProofFileError] = useState<string | null>(null);
  const [transactionReference, setTransactionReference] = useState('');
  const payment = usePayment(paymentAccounts);
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
    let active = true;
    void getPaymentAccounts()
      .then((accounts) => {
        if (active) {
          setPaymentAccounts(accounts);
          setPaymentAccountError(null);
        }
      })
      .catch((accountError: unknown) => {
        if (active) {
          setPaymentAccountError(
            accountError instanceof Error
              ? accountError.message
              : 'Payment options could not be loaded.',
          );
        }
      })
      .finally(() => {
        if (active) setIsLoadingPaymentAccounts(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const continueFromDelivery = () => {
    setStep('payment');
  };

  const handlePaymentProofFileChange = (file: File | null) => {
    if (!file) return;
    try {
      validateManualPaymentProofFile(file);
      setPaymentProofFile(file);
      setPaymentProofFileError(null);
      setOrderPaymentError(null);
    } catch (fileError) {
      setPaymentProofFile(null);
      setPaymentProofFileError(
        fileError instanceof Error
          ? fileError.message
          : 'This payment screenshot could not be used.',
      );
    }
  };

  const continueFromPayment = () => {
    if (!selectedAddress) {
      setStep('delivery');
      return;
    }
    if (payment.selectedMethod.disabled) return;
    if (isManualPaymentMethod(payment.selectedMethodId) && !paymentProofFile) {
      setPaymentProofFileError('Add your payment screenshot before continuing to review.');
      return;
    }
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

  const placeOrder = async () => {
    if (!selectedAddress) return;
    if (isManualPaymentMethod(payment.selectedMethodId) && !paymentProofFile) {
      setPaymentProofFileError('Add your payment screenshot before placing the order.');
      setOrderPaymentError('A payment screenshot is required for EasyPaisa and JazzCash.');
      setStep('payment');
      return;
    }
    setShowReviewNotice(false);
    setOrderPaymentError(null);

    const order =
      orderCreation.order ??
      (await orderCreation.submit(selectedAddress.id, items, idempotencyKey));
    if (!order) return;

    if (payment.selectedMethodId === 'safepay') {
      await startSafepayCheckout(order.id);
      return;
    }

    setIsSubmittingOrderPayment(true);
    try {
      const client = await getSupabaseClient();
      if (payment.selectedMethodId === 'cash_on_delivery') {
        await recordCashOnDelivery(client, order.id);
        navigate(`/checkout/confirmation/${encodeURIComponent(order.id)}`, { replace: true });
        return;
      }

      if (isManualPaymentMethod(payment.selectedMethodId)) {
        const proofId = await prepareManualPayment(
          client,
          order.id,
          payment.selectedMethodId,
        );
        if (!paymentProofFile || !user?.id) {
          throw new Error('Your payment screenshot is missing. Please add it and try again.');
        }
        await uploadManualPaymentProof(
          client,
          user.id,
          order.id,
          proofId,
          paymentProofFile,
          transactionReference,
          null,
        );
        let emailWarning = false;
        try {
          await apiClient.post(
            '/manual-payments/proof-submitted',
            { proofId },
            { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` } },
          );
        } catch {
          emailWarning = true;
        }
        navigate(
          `/checkout/manual-payment/${encodeURIComponent(order.id)}?proof=${encodeURIComponent(proofId)}`,
          { state: { emailWarning } },
        );
      }
    } catch (submitError) {
      setOrderPaymentError(
        submitError instanceof Error
          ? submitError.message
          : 'The selected payment method could not be prepared.',
      );
    } finally {
      setIsSubmittingOrderPayment(false);
    }
  };

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

        <CheckoutNotice
          tone="info"
          title={
            payment.selectedMethodId === 'cash_on_delivery'
              ? 'Cash on Delivery'
              : payment.selectedMethodId === 'easypaisa' || payment.selectedMethodId === 'jazzcash'
                ? 'Manual transfer and verification'
                : 'Safepay hosted checkout'
          }
        >
          {payment.selectedMethodId === 'cash_on_delivery'
            ? 'Your order will be prepared now. Pay the courier when your delivery arrives.'
            : payment.selectedMethodId === 'easypaisa' ||
                payment.selectedMethodId === 'jazzcash'
              ? 'Transfer the order total to the account shown below and add your screenshot. Continue to review, then place your order to securely submit the proof for verification.'
              : 'After review, your order is created and you’ll continue to Safepay to complete payment. Returning from Safepay alone is not proof of payment; a verified webhook confirms the payment.'}
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
                    description="Choose Safepay, Cash on Delivery, or an available manual transfer option."
                    icon={<CreditCard size={19} />}
                  >
                    <PaymentMethodSelector
                      methods={payment.methods}
                      selectedMethodId={payment.selectedMethodId}
                      onSelect={(methodId) => {
                        if (methodId !== payment.selectedMethodId) {
                          setPaymentProofFile(null);
                          setPaymentProofFileError(null);
                          setTransactionReference('');
                        }
                        payment.selectMethod(methodId);
                      }}
                      disabled={Boolean(orderCreation.order)}
                    />
                    {isManualPaymentMethod(payment.selectedMethodId) && paymentAccounts && (
                      <CheckoutManualAccountDetails
                        accounts={paymentAccounts}
                        method={payment.selectedMethodId}
                        proofFile={paymentProofFile}
                        proofFileError={paymentProofFileError}
                        transactionReference={transactionReference}
                        onProofFileChange={handlePaymentProofFileChange}
                        onTransactionReferenceChange={setTransactionReference}
                      />
                    )}
                    {payment.selectedMethodId === 'safepay' ? (
                      <PaymentStatusPanel status={payment.status} />
                    ) : (
                      <CheckoutNotice tone="info" title={payment.selectedMethod.title}>
                        {payment.selectedMethodId === 'cash_on_delivery'
                          ? 'No advance payment is required. The courier collects the order total at delivery.'
                          : 'Transfer the order total, add your payment screenshot above, then continue to review. Your proof will be uploaded securely when you place the order.'}
                      </CheckoutNotice>
                    )}
                    {isLoadingPaymentAccounts && (
                      <CheckoutNotice tone="info">Loading available payment accounts…</CheckoutNotice>
                    )}
                    {paymentAccountError && (
                      <CheckoutNotice tone="warning" title="Some payment options are unavailable">
                        {paymentAccountError} Safepay and Cash on Delivery remain available.
                      </CheckoutNotice>
                    )}
                    <CheckoutNotice tone="info" title="No payment details requested">
                      {payment.selectedMethodId === 'safepay'
                        ? 'No card numbers, credentials, or secure tokens are handled on this store.'
                        : payment.selectedMethodId === 'cash_on_delivery'
                          ? 'No payment details are collected before delivery.'
                          : 'The store never asks for account passwords, PINs, or one-time codes.'}
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
                          {payment.selectedMethod.title}
                          {payment.selectedMethodId === 'safepay'
                            ? ' · hosted checkout opens after order creation.'
                            : payment.selectedMethodId === 'cash_on_delivery'
                              ? ' · pay the courier when the order arrives.'
                              : ` · screenshot selected: ${paymentProofFile?.name ?? 'not selected'}.`}
                        </p>
                      </div>
                    </CheckoutCard>
                  </CheckoutSection>

                  <CheckoutNotice tone="warning" title="Review the order total">
                    {payment.selectedMethodId === 'safepay'
                      ? "Safepay will receive the saved order total. Shipping and tax currently use placeholders. The order remains pending until Safepay's verified webhook confirms payment."
                      : payment.selectedMethodId === 'cash_on_delivery'
                        ? 'The saved order total is due to the courier at delivery. Please review the delivery details before placing your order.'
                        : 'Transfer the exact saved order total to the account shown on the payment step. Your selected screenshot is uploaded when you place the order, which remains pending until an administrator verifies it.'}
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
                  {orderPaymentError && (
                    <CheckoutNotice tone="error" title="Payment could not be prepared">
                      {orderPaymentError}
                    </CheckoutNotice>
                  )}
                  <div
                    className="checkout-actions"
                    aria-busy={
                      orderCreation.isProcessing || isSafepayLoading || isSubmittingOrderPayment
                    }
                  >
                    <CheckoutButton variant="secondary" onClick={() => updateStep('payment')}>
                      <ArrowLeft size={15} aria-hidden="true" /> Back to payment
                    </CheckoutButton>
                    <CheckoutButton
                      disabled={
                        orderCreation.isProcessing ||
                        isSafepayLoading ||
                        isSubmittingOrderPayment ||
                        !selectedAddress ||
                        items.some((item) => !item.inStock)
                      }
                      onClick={() => void placeOrder()}
                    >
                      {orderCreation.isProcessing ||
                      isSafepayLoading ||
                      isSubmittingOrderPayment ? (
                        <>
                          <LoaderCircle
                            className="checkout-processing-icon"
                            size={16}
                            aria-hidden="true"
                          />
                          {orderCreation.isProcessing
                            ? 'Creating order…'
                            : isSafepayLoading
                              ? 'Opening Safepay…'
                              : 'Preparing payment…'}
                        </>
                      ) : (
                        <>
                          {orderCreation.order
                            ? payment.selectedMethodId === 'safepay'
                              ? 'Retry Safepay checkout'
                              : 'Retry payment setup'
                            : payment.selectedMethodId === 'safepay'
                              ? 'Create order & continue to Safepay'
                              : payment.selectedMethodId === 'cash_on_delivery'
                                ? 'Place Cash on Delivery order'
                                : 'Place order & submit proof'}{' '}
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
