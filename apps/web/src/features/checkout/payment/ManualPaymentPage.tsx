import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle2, LoaderCircle, ShieldCheck, Upload } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AUTH_ROUTES } from '@/features/auth/constants/auth';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getAuthRedirectState } from '@/features/auth/utils/authNavigation';
import { formatCartPrice } from '@/features/cart/cartUtils';
import { apiClient } from '@/lib/api-client';
import { getSupabaseClient } from '@/lib/supabase';
import { CheckoutFrame, CheckoutNotice } from '../CheckoutDesignSystem';
import PaymentBrandMark from './PaymentBrandMark';
import {
  getAccountSnapshot,
  loadManualPaymentData,
  uploadManualPaymentProof,
  type ManualPaymentData,
} from './manualPaymentService';
import { resolvePaymentQrUrl } from './paymentAccountService';
import '../checkout.css';
import './manual-payment.css';

const PROOF_BUCKET = 'manual-payment-proofs';

function isValidOrderId(value: string | undefined): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value),
  );
}

function hasEmailWarning(state: unknown): boolean {
  return (
    typeof state === 'object' &&
    state !== null &&
    'emailWarning' in state &&
    state.emailWarning === true
  );
}

export default function ManualPaymentPage() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const requestedProofId = searchParams.get('proof');
  const { isAuthenticated, isLoading: isAuthLoading, session, user } = useAuth();
  const location = useLocation();
  const [data, setData] = useState<ManualPaymentData | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [transactionReference, setTransactionReference] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRetryingEmail, setIsRetryingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [emailWarning, setEmailWarning] = useState(() => hasEmailWarning(location.state));
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const orderIdIsValid = isValidOrderId(orderId);

  const load = useCallback(
    async (showLoading: boolean) => {
      if (!user?.id || !orderIdIsValid || !orderId) return;
      if (showLoading) setIsLoading(true);
      try {
        const client = await getSupabaseClient();
        const nextData = await loadManualPaymentData(client, orderId, user.id);
        if (requestedProofId && requestedProofId !== nextData.proof.id) {
          throw new Error('This payment request could not be found in your account.');
        }
        const accountSnapshot = getAccountSnapshot(nextData.proof.account_used);
        const [nextQrUrl, nextScreenshotUrl] = await Promise.all([
          resolvePaymentQrUrl(accountSnapshot.qrPath),
          nextData.proof.payment_screenshot_url
            ? client.storage
                .from(PROOF_BUCKET)
                .createSignedUrl(nextData.proof.payment_screenshot_url, 600)
                .then(({ data: signedUrl, error: signedUrlError }) => {
                  if (signedUrlError) throw new Error('Your saved payment screenshot is unavailable.');
                  return signedUrl.signedUrl;
                })
            : Promise.resolve(null),
        ]);
        setData(nextData);
        setQrUrl(nextQrUrl);
        setScreenshotUrl(nextScreenshotUrl);
        setError(null);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Payment details could not be loaded.',
        );
      } finally {
        if (showLoading) setIsLoading(false);
      }
    },
    [orderId, orderIdIsValid, requestedProofId, user?.id],
  );

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      navigate(AUTH_ROUTES.login, {
        replace: true,
        state: getAuthRedirectState(location),
      });
    }
  }, [isAuthLoading, isAuthenticated, location, navigate]);

  useEffect(() => {
    void load(true);
  }, [load]);

  useEffect(() => {
    if (!data || !['pending_verification', 'rejected', 'reupload_requested'].includes(data.proof.verification_status)) {
      return;
    }
    const timer = window.setInterval(() => void load(false), 15000);
    return () => window.clearInterval(timer);
  }, [data, load]);

  const account = useMemo(() => {
    if (!data) return null;
    try {
      return getAccountSnapshot(data.proof.account_used);
    } catch {
      return null;
    }
  }, [data]);

  const submitProof = async () => {
    if (!data || !user?.id || !file) return;
    setIsSubmitting(true);
    setNotice(null);
    setError(null);
    setEmailWarning(false);
    try {
      const client = await getSupabaseClient();
      const result = await uploadManualPaymentProof(
        client,
        user.id,
        data.order.id,
        data.proof.id,
        file,
        transactionReference,
        data.proof.payment_screenshot_url,
      );
      setFile(null);
      setTransactionReference('');
      setNotice(
        result.cleanupWarning
          ? 'We have received your payment proof. Our team will verify it shortly. A previous screenshot could not be removed.'
          : 'We have received your payment proof. Our team will verify it shortly.',
      );
      setData((current) =>
        current
          ? {
              ...current,
              proof: {
                ...current.proof,
                payment_screenshot_url: null,
                transaction_reference: transactionReference.trim() || null,
                uploaded_at: new Date().toISOString(),
                verification_status: 'pending_verification',
                verified_by: null,
                verified_at: null,
                admin_note: null,
              },
            }
          : current,
      );
      try {
        await apiClient.post(
          '/manual-payments/proof-submitted',
          { proofId: data.proof.id },
          { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` } },
        );
      } catch {
        setEmailWarning(true);
      }
      await load(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Your payment proof could not be submitted.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const retryConfirmationEmail = async () => {
    if (!data || !session?.access_token) return;
    setIsRetryingEmail(true);
    try {
      await apiClient.post(
        '/manual-payments/proof-submitted',
        { proofId: data.proof.id },
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      setEmailWarning(false);
    } catch {
      setEmailWarning(true);
    } finally {
      setIsRetryingEmail(false);
    }
  };

  if (isAuthLoading || !isAuthenticated || isLoading) {
    return (
      <CheckoutFrame>
        <main className="manual-payment-content" id="checkout-content">
          <div className="manual-payment-loading" role="status">
            <LoaderCircle className="checkout-processing-icon" size={20} aria-hidden="true" />
            Loading payment instructions…
          </div>
        </main>
      </CheckoutFrame>
    );
  }

  if (!orderIdIsValid || !data || !account) {
    return (
      <CheckoutFrame>
        <main className="manual-payment-content" id="checkout-content">
          <CheckoutNotice tone="error" title="Payment details unavailable">
            {error ?? 'This payment request could not be found in your account.'}
          </CheckoutNotice>
          <Link className="checkout-button checkout-button--secondary" to="/account/orders">
            <ArrowLeft size={15} aria-hidden="true" /> View my orders
          </Link>
        </main>
      </CheckoutFrame>
    );
  }

  const isEasyPaisa = data.proof.payment_method === 'easypaisa';
  const proofCanUpload = ['awaiting_payment', 'rejected', 'reupload_requested'].includes(
    data.proof.verification_status,
  );
  const isApproved = data.proof.verification_status === 'approved';
  const isPending = data.proof.verification_status === 'pending_verification';

  return (
    <CheckoutFrame>
      <main className="manual-payment-content" id="checkout-content">
        <motion.header
          className="manual-payment-heading"
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.3 }}
        >
          <div>
            <p className="checkout-eyebrow">PAYMENT INSTRUCTIONS</p>
            <h1>Complete your transfer.</h1>
            <p>Send the order total to this account, then upload a clear screenshot.</p>
          </div>
          <PaymentBrandMark brand={isEasyPaisa ? 'easypaisa' : 'jazzcash'} large />
        </motion.header>

        {error && <CheckoutNotice tone="error" title="Payment update failed">{error}</CheckoutNotice>}
        {notice && <CheckoutNotice tone="success" title="Proof received">{notice}</CheckoutNotice>}
        {emailWarning && (
          <CheckoutNotice tone="warning" title="Email confirmation delayed">
            Your payment proof is saved, but the email confirmation could not be sent. Our team can still review your upload.
            <button
              type="button"
              className="manual-payment-retry-email"
              disabled={isRetryingEmail}
              onClick={() => void retryConfirmationEmail()}
            >
              {isRetryingEmail ? 'Retrying email…' : 'Retry confirmation email'}
            </button>
          </CheckoutNotice>
        )}

        {isPending && (
          <CheckoutNotice tone="info" title="Payment pending verification">
            We have received your payment proof. Our team will verify it shortly.
          </CheckoutNotice>
        )}
        {isApproved && (
          <CheckoutNotice tone="success" title="Payment verified">
            Your payment was approved and your order is being processed.
          </CheckoutNotice>
        )}
        {(data.proof.verification_status === 'rejected' ||
          data.proof.verification_status === 'reupload_requested') && (
          <CheckoutNotice tone="warning" title="Please upload a new payment screenshot">
            {data.proof.admin_note || 'The payment screenshot could not be verified. Please upload a new, clear screenshot.'}
          </CheckoutNotice>
        )}

        <section className="manual-payment-grid">
          <article className="manual-payment-card">
            <div className="manual-payment-card-heading">
              <span className="manual-payment-step">01</span>
              <div>
                <h2>Transfer details</h2>
                <p>Please send payment to the following {isEasyPaisa ? 'EasyPaisa' : 'JazzCash'} account.</p>
              </div>
            </div>
            <dl className="manual-payment-account">
              <div>
                <dt>Account holder</dt>
                <dd>{account.holderName}</dd>
              </div>
              <div>
                <dt>Mobile number</dt>
                <dd>{account.mobileNumber}</dd>
              </div>
              <div className="manual-payment-total">
                <dt>Order total</dt>
                <dd>{formatCartPrice(data.order.total)}</dd>
              </div>
            </dl>
            {qrUrl && (
              <figure className="manual-payment-qr">
                <img src={qrUrl} alt={`${isEasyPaisa ? 'EasyPaisa' : 'JazzCash'} account QR code`} />
                <figcaption>Scan to pay the exact order total.</figcaption>
              </figure>
            )}
            <p className="manual-payment-order-ref">
              Order <strong>{data.order.order_number}</strong>
            </p>
          </article>

          <article className="manual-payment-card manual-payment-proof-card">
            <div className="manual-payment-card-heading">
              <span className="manual-payment-step">02</span>
              <div>
                <h2>Payment screenshot</h2>
                <p>We accept PNG, JPG, JPEG, or WEBP images up to 5 MB.</p>
              </div>
            </div>
            {proofCanUpload ? (
              <div className="manual-payment-upload-form">
                {data.proof.payment_screenshot_url && screenshotUrl && (
                  <a
                    className="manual-payment-existing-proof"
                    href={screenshotUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View previous screenshot <ArrowRight size={14} aria-hidden="true" />
                  </a>
                )}
                <label className="manual-payment-file">
                  <Upload size={19} aria-hidden="true" />
                  <span>{file ? file.name : 'Choose payment screenshot'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => {
                      const nextFile = event.currentTarget.files?.[0] ?? null;
                      event.currentTarget.value = '';
                      setError(null);
                      setFile(nextFile);
                    }}
                  />
                </label>
                <label className="manual-payment-reference">
                  Transaction reference (optional)
                  <input
                    value={transactionReference}
                    maxLength={120}
                    onChange={(event) => setTransactionReference(event.target.value)}
                  />
                </label>
                {file && (
                  <p className="manual-payment-file-meta">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB · {file.type || 'Unknown file type'}
                  </p>
                )}
                <button
                  type="button"
                  className="checkout-button checkout-button--primary manual-payment-submit"
                  disabled={!file || isSubmitting}
                  aria-busy={isSubmitting}
                  onClick={() => void submitProof()}
                >
                  {isSubmitting ? (
                    <>
                      <LoaderCircle className="checkout-processing-icon" size={16} aria-hidden="true" />
                      Submitting proof…
                    </>
                  ) : (
                    <>
                      Submit payment proof <ArrowRight size={15} aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="manual-payment-status">
                <CheckCircle2 size={21} aria-hidden="true" />
                <div>
                  <strong>{isApproved ? 'Payment approved' : 'Proof submitted'}</strong>
                  <p>
                    {isApproved
                      ? 'Your order is now processing.'
                      : `Uploaded ${data.proof.uploaded_at ? new Date(data.proof.uploaded_at).toLocaleString() : 'recently'}. We will refresh this page when the verification status changes.`}
                  </p>
                </div>
              </div>
            )}
            {screenshotUrl && !proofCanUpload && (
              <a
                className="manual-payment-existing-proof"
                href={screenshotUrl}
                target="_blank"
                rel="noreferrer"
              >
                View uploaded screenshot <ArrowRight size={14} aria-hidden="true" />
              </a>
            )}
            <p className="manual-payment-security">
              <ShieldCheck size={15} aria-hidden="true" />
              Your screenshot is private to you and the payment review team.
            </p>
          </article>
        </section>

        <footer className="manual-payment-footer">
          <Link to={`/checkout/confirmation/${encodeURIComponent(data.order.id)}`}>
            <ArrowLeft size={15} aria-hidden="true" /> Order confirmation
          </Link>
          {isPending && <span role="status">Status refreshes automatically.</span>}
        </footer>
      </main>
    </CheckoutFrame>
  );
}
