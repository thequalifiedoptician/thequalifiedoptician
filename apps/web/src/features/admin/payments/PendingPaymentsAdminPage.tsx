import { ArrowLeft, Check, Clock3, Image, LoaderCircle, RotateCcw, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBrandSettings } from '@/features/brand/brandSettingsContext';
import { formatCartPrice } from '@/features/cart/cartUtils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { apiClient } from '@/lib/api-client';
import { getSupabaseClient } from '@/lib/supabase';
import {
  loadManualPaymentMetrics,
  loadPendingManualPayments,
  reviewManualPayment,
  type ManualPaymentAdminEntry,
  type ManualPaymentMetrics,
} from './manualPaymentAdminService';
import './payment-review-admin.css';

const EMPTY_METRICS: ManualPaymentMetrics = {
  pending_count: 0,
  approved_today: 0,
  rejected_count: 0,
  total_manual_payments: 0,
};

function snapshotValue(snapshot: ManualPaymentAdminEntry['order']['shipping_address_snapshot'], key: string) {
  if (typeof snapshot !== 'object' || snapshot === null || Array.isArray(snapshot)) return '';
  const value = snapshot[key];
  return typeof value === 'string' ? value : '';
}

function paymentMethodLabel(method: string): string {
  return method === 'easypaisa' ? 'EasyPaisa' : 'JazzCash';
}

function ProofReviewCard({
  entry,
  busy,
  onReview,
}: {
  entry: ManualPaymentAdminEntry;
  busy: boolean;
  onReview: (proofId: string, action: 'approve' | 'reject' | 'request_reupload', note: string) => void;
}) {
  const [note, setNote] = useState('');
  const customerName = snapshotValue(entry.order.shipping_address_snapshot, 'full_name');
  const customerEmail = snapshotValue(entry.order.shipping_address_snapshot, 'email');
  const mobile = snapshotValue(entry.proof.account_used, 'mobile_number');

  return (
    <article className="payment-review-card">
      <header className="payment-review-card-header">
        <div>
          <p>ORDER {entry.order.order_number}</p>
          <h2>{customerName || 'Customer'}</h2>
          <span>{customerEmail || 'Email unavailable'}</span>
        </div>
        <strong className="payment-review-total">{formatCartPrice(entry.order.total)}</strong>
      </header>

      <div className="payment-review-facts">
        <div>
          <span>Payment method</span>
          <strong>{paymentMethodLabel(entry.proof.payment_method)}</strong>
        </div>
        <div>
          <span>Account used</span>
          <strong>{typeof mobile === 'string' ? mobile : 'Not recorded'}</strong>
        </div>
        <div>
          <span>Transaction reference</span>
          <strong>{entry.proof.transaction_reference || 'Not provided'}</strong>
        </div>
        <div>
          <span>Uploaded</span>
          <strong>
            {entry.proof.uploaded_at
              ? new Date(entry.proof.uploaded_at).toLocaleString()
              : 'Date unavailable'}
          </strong>
        </div>
      </div>

      <a
        className="payment-review-screenshot"
        href={entry.screenshotUrl}
        target="_blank"
        rel="noreferrer"
      >
        <img src={entry.screenshotUrl} alt={`Payment proof for order ${entry.order.order_number}`} />
        <span>
          <Image size={15} aria-hidden="true" /> Open private screenshot
        </span>
      </a>

      <label className="payment-review-note">
        Admin note
        <textarea
          value={note}
          maxLength={1000}
          rows={3}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Optional note for this review"
        />
      </label>

      <div className="payment-review-actions">
        <button
          type="button"
          className="payment-review-action payment-review-action--approve"
          disabled={busy}
          onClick={() => onReview(entry.proof.id, 'approve', note)}
        >
          <Check size={15} aria-hidden="true" /> Approve
        </button>
        <button
          type="button"
          className="payment-review-action payment-review-action--reupload"
          disabled={busy}
          onClick={() => onReview(entry.proof.id, 'request_reupload', note)}
        >
          <RotateCcw size={15} aria-hidden="true" /> Request re-upload
        </button>
        <button
          type="button"
          className="payment-review-action payment-review-action--reject"
          disabled={busy}
          onClick={() => onReview(entry.proof.id, 'reject', note)}
        >
          <X size={15} aria-hidden="true" /> Reject
        </button>
      </div>
    </article>
  );
}

export default function PendingPaymentsAdminPage() {
  const { settings: brand } = useBrandSettings();
  const { session } = useAuth();
  const [entries, setEntries] = useState<ManualPaymentAdminEntry[]>([]);
  const [metrics, setMetrics] = useState(EMPTY_METRICS);
  const [isLoading, setIsLoading] = useState(true);
  const [busyProofId, setBusyProofId] = useState<string | null>(null);
  const [emailRetryProofId, setEmailRetryProofId] = useState<string | null>(null);
  const [isRetryingEmail, setIsRetryingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const client = await getSupabaseClient();
      const [nextMetrics, nextEntries] = await Promise.all([
        loadManualPaymentMetrics(client),
        loadPendingManualPayments(client),
      ]);
      setMetrics(nextMetrics);
      setEntries(nextEntries);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Pending payments could not be loaded.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleReview = async (
    proofId: string,
    action: 'approve' | 'reject' | 'request_reupload',
    note: string,
  ) => {
    setBusyProofId(proofId);
    setError(null);
    setNotice(null);
    try {
      const client = await getSupabaseClient();
      const result = await reviewManualPayment(client, proofId, action, note);
      let emailWarning = false;
      if (result !== 'approved') {
        if (session?.access_token) {
          try {
            await apiClient.post(
              '/manual-payments/proof-review',
              { proofId },
              { headers: { Authorization: `Bearer ${session.access_token}` } },
            );
          } catch {
            emailWarning = true;
          }
        } else {
          emailWarning = true;
        }
      }
      setEmailRetryProofId(emailWarning ? proofId : null);
      setNotice(
        result === 'approved'
          ? 'Payment approved. The order is now processing.'
          : emailWarning
            ? 'The review was saved, but the customer email could not be sent.'
            : 'The review was saved and the customer was asked to upload a new screenshot.',
      );
      await load();
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : 'The payment review could not be saved.',
      );
    } finally {
      setBusyProofId(null);
    }
  };

  const retryCustomerEmail = async () => {
    if (!emailRetryProofId || !session?.access_token) return;
    setIsRetryingEmail(true);
    try {
      await apiClient.post(
        '/manual-payments/proof-review',
        { proofId: emailRetryProofId },
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      setEmailRetryProofId(null);
      setNotice('The customer notification email has been sent.');
    } catch {
      setNotice('The customer notification email could not be sent. Please retry.');
    } finally {
      setIsRetryingEmail(false);
    }
  };

  return (
    <main className="payment-review-admin">
      <header className="payment-review-topbar">
        <Link className="payment-review-brand" to="/" aria-label={`${brand.brand_name} home`}>
          <span className="payment-review-brand-mark">
            {brand.logo_url ? <img src={brand.logo_url} alt="" /> : brand.brand_name.charAt(0)}
          </span>
          <span>
            <strong>{brand.brand_name}</strong>
            <small>{brand.brand_tagline || 'Admin console'}</small>
          </span>
        </Link>
        <nav className="payment-review-nav" aria-label="Admin navigation">
          <span>ADMIN CONSOLE</span>
          <Link to="/admin/homepage">Homepage</Link>
          <Link to="/admin/products">Products</Link>
          <Link to="/admin/orders">Orders</Link>
          <Link className="is-active" to="/admin/payments/pending" aria-current="page">
            Pending payments
          </Link>
          <Link to="/admin/settings/payment-accounts">Payment accounts</Link>
          <Link to="/admin/settings/brand">Brand settings</Link>
          <Link to="/admin/settings/social">Social media</Link>
          <Link to="/" className="payment-review-storefront">
            <ArrowLeft size={15} aria-hidden="true" /> Storefront
          </Link>
        </nav>
      </header>

      <div className="payment-review-content">
        <header className="payment-review-heading">
          <div>
            <p>ORDERS / PENDING PAYMENTS</p>
            <h1>Payment verification</h1>
            <span>Review customer screenshots before confirming manual payments.</span>
          </div>
          <Link to="/admin/settings/payment-accounts">Manage payment accounts</Link>
        </header>

        <section className="payment-review-metrics" aria-label="Manual payment totals">
          <article>
            <span>Pending payments</span>
            <strong>{metrics.pending_count}</strong>
            <small>Waiting for review</small>
          </article>
          <article>
            <span>Approved today</span>
            <strong>{metrics.approved_today}</strong>
            <small>Verified payments</small>
          </article>
          <article>
            <span>Rejected</span>
            <strong>{metrics.rejected_count}</strong>
            <small>Rejected or re-upload requested</small>
          </article>
          <article>
            <span>Total manual payments</span>
            <strong>{metrics.total_manual_payments}</strong>
            <small>EasyPaisa and JazzCash proofs</small>
          </article>
        </section>

        {error && <p className="payment-review-message payment-review-message--error" role="alert">{error}</p>}
        {notice && <p className="payment-review-message" role="status">{notice}</p>}
        {emailRetryProofId && (
          <button
            type="button"
            className="payment-review-email-retry"
            disabled={isRetryingEmail}
            onClick={() => void retryCustomerEmail()}
          >
            {isRetryingEmail ? 'Retrying customer email…' : 'Retry customer email'}
          </button>
        )}

        <section className="payment-review-queue" aria-label="Pending payment proofs">
          <header>
            <div>
              <p>REVIEW QUEUE</p>
              <h2>Pending payments</h2>
            </div>
            <span><Clock3 size={15} aria-hidden="true" /> {entries.length} awaiting review</span>
          </header>

          {isLoading ? (
            <div className="payment-review-loading" role="status">
              <LoaderCircle className="payment-review-spinner" size={19} aria-hidden="true" />
              Loading payment proofs…
            </div>
          ) : entries.length ? (
            <div className="payment-review-list">
              {entries.map((entry) => (
                <ProofReviewCard
                  key={entry.proof.id}
                  entry={entry}
                  busy={busyProofId === entry.proof.id}
                  onReview={(proofId, action, note) => void handleReview(proofId, action, note)}
                />
              ))}
            </div>
          ) : (
            <div className="payment-review-empty">
              <Check size={22} aria-hidden="true" />
              <strong>Nothing to review</strong>
              <span>New payment screenshots will appear here.</span>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
