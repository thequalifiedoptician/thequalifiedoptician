import { ArrowLeft, ImagePlus, LoaderCircle, Save, Settings } from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBrandSettings } from '@/features/brand/brandSettingsContext';
import {
  getPaymentAccounts,
  resolvePaymentQrUrl,
  savePaymentAccounts,
  uploadPaymentQr,
  type PaymentAccount,
} from '@/features/checkout/payment/paymentAccountService';
import './payment-admin.css';

type AccountTextField =
  | 'easypaisa_holder_name'
  | 'easypaisa_mobile_number'
  | 'jazzcash_holder_name'
  | 'jazzcash_mobile_number'
  | 'bank_name'
  | 'bank_account_holder'
  | 'bank_iban'
  | 'bank_account_number';

function AccountQrField({
  label,
  path,
  onUpload,
}: {
  label: string;
  path: string | null;
  onUpload: (file: File) => Promise<void>;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void resolvePaymentQrUrl(path)
      .then((url) => {
        if (active) setPreviewUrl(url);
      })
      .catch(() => {
        if (active) setError('QR code preview could not be loaded.');
      });
    return () => {
      active = false;
    };
  }, [path]);

  return (
    <div className="payment-admin-qr">
      <label className="payment-admin-label">
        {label}
        <span className="payment-admin-upload">
          <ImagePlus size={16} aria-hidden="true" />
          {isUploading ? 'Uploading…' : 'Upload QR code'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={isUploading}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = '';
              if (!file) return;
              setIsUploading(true);
              setError(null);
              void onUpload(file)
                .catch((uploadError: unknown) => {
                  setError(
                    uploadError instanceof Error
                      ? uploadError.message
                      : 'QR code could not be uploaded.',
                  );
                })
                .finally(() => setIsUploading(false));
            }}
          />
        </span>
      </label>
      {previewUrl && <img className="payment-admin-qr-preview" src={previewUrl} alt={`${label} preview`} />}
      {error && <span className="payment-admin-field-error">{error}</span>}
    </div>
  );
}

function PaymentAccountSection({
  title,
  enabled,
  toggleLabel,
  onToggle,
  children,
}: {
  title: string;
  enabled: boolean;
  toggleLabel: string;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="payment-admin-section">
      <header className="payment-admin-section-heading">
        <div>
          <p>PAYMENT ACCOUNT</p>
          <h2>{title}</h2>
        </div>
        <label className="payment-admin-toggle">
          <input type="checkbox" checked={enabled} onChange={onToggle} />
          <span aria-hidden="true" />
          <span>{toggleLabel}</span>
        </label>
      </header>
      {children}
    </section>
  );
}

export default function PaymentAccountsAdminPage() {
  const { settings: brand } = useBrandSettings();
  const [account, setAccount] = useState<PaymentAccount | null>(null);
  const [draft, setDraft] = useState<PaymentAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error' | 'warning'; text: string } | null>(
    null,
  );

  const load = useCallback(async (isCurrent: () => boolean = () => true) => {
    if (isCurrent()) setIsLoading(true);
    try {
      const settings = await getPaymentAccounts();
      if (!isCurrent()) return;
      setAccount(settings);
      setDraft(settings);
      setNotice(null);
    } catch (error) {
      if (!isCurrent()) return;
      setNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Payment settings could not be loaded.',
      });
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      if (active) await load(() => active);
    });
    return () => {
      active = false;
    };
  }, [load]);

  const updateText = (field: AccountTextField, value: string) => {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  };
  const updateToggle = (field: 'enable_easypaisa' | 'enable_jazzcash' | 'enable_bank_transfer') => {
    setDraft((current) => (current ? { ...current, [field]: !current[field] } : current));
  };
  const uploadQr = async (
    field: 'easypaisa_qr_path' | 'jazzcash_qr_path' | 'bank_qr_path',
    file: File,
  ) => {
    const path = await uploadPaymentQr(file);
    setDraft((current) => (current ? { ...current, [field]: path } : current));
  };

  const save = async () => {
    if (!draft || !account) return;
    setIsSaving(true);
    setNotice(null);
    try {
      const saved = await savePaymentAccounts(draft);
      setAccount(saved);
      setDraft(saved);
      setNotice({
        tone: 'success',
        text: 'Payment account settings have been saved. Previous QR codes remain available to existing orders.',
      });
    } catch (error) {
      setNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Payment settings could not be saved.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="payment-admin">
      <header className="payment-admin-topbar">
        <Link className="payment-admin-brand" to="/" aria-label={`${brand.brand_name} home`}>
          <span className="payment-admin-brand-mark">
            {brand.logo_url ? <img src={brand.logo_url} alt="" /> : brand.brand_name.charAt(0)}
          </span>
          <span>
            <strong>{brand.brand_name}</strong>
            <small>{brand.brand_tagline || 'Admin console'}</small>
          </span>
        </Link>
        <nav className="payment-admin-nav" aria-label="Admin navigation">
          <span>ADMIN CONSOLE</span>
          <Link to="/admin/homepage">Homepage</Link>
          <Link to="/admin/products">Products</Link>
          <Link to="/admin/orders">Orders</Link>
          <Link to="/admin/payments/pending">Pending payments</Link>
          <Link className="is-active" to="/admin/settings/payment-accounts" aria-current="page">
            <Settings size={15} aria-hidden="true" /> Payment accounts
          </Link>
          <Link to="/admin/settings/brand">Brand settings</Link>
          <Link to="/admin/settings/social">Social media</Link>
          <Link to="/" className="payment-admin-storefront">
            <ArrowLeft size={15} aria-hidden="true" /> Storefront
          </Link>
        </nav>
      </header>

      <div className="payment-admin-content">
        <header className="payment-admin-heading">
          <p>SETTINGS / PAYMENT ACCOUNTS</p>
          <h1>Manual payment accounts</h1>
          <span>Manage the transfer details customers see during checkout.</span>
        </header>

        {notice && (
          <p className={`payment-admin-notice payment-admin-notice--${notice.tone}`} role="status">
            {notice.text}
          </p>
        )}
        {isLoading || !draft ? (
          <div className="payment-admin-loading" role="status">
            <LoaderCircle className="payment-admin-spinner" size={20} aria-hidden="true" />
            Loading payment accounts…
          </div>
        ) : (
          <div className="payment-admin-form">
            <PaymentAccountSection
              title="EasyPaisa"
              enabled={draft.enable_easypaisa}
              toggleLabel="Enable EasyPaisa"
              onToggle={() => updateToggle('enable_easypaisa')}
            >
              <div className="payment-admin-fields">
                <label className="payment-admin-label">
                  Account holder name
                  <input
                    value={draft.easypaisa_holder_name}
                    onChange={(event) => updateText('easypaisa_holder_name', event.target.value)}
                  />
                </label>
                <label className="payment-admin-label">
                  Mobile number
                  <input
                    inputMode="tel"
                    value={draft.easypaisa_mobile_number}
                    onChange={(event) => updateText('easypaisa_mobile_number', event.target.value)}
                  />
                </label>
                <AccountQrField
                  label="QR code"
                  path={draft.easypaisa_qr_path}
                  onUpload={(file) => uploadQr('easypaisa_qr_path', file)}
                />
              </div>
            </PaymentAccountSection>

            <PaymentAccountSection
              title="JazzCash"
              enabled={draft.enable_jazzcash}
              toggleLabel="Enable JazzCash"
              onToggle={() => updateToggle('enable_jazzcash')}
            >
              <div className="payment-admin-fields">
                <label className="payment-admin-label">
                  Account holder name
                  <input
                    value={draft.jazzcash_holder_name}
                    onChange={(event) => updateText('jazzcash_holder_name', event.target.value)}
                  />
                </label>
                <label className="payment-admin-label">
                  Mobile number
                  <input
                    inputMode="tel"
                    value={draft.jazzcash_mobile_number}
                    onChange={(event) => updateText('jazzcash_mobile_number', event.target.value)}
                  />
                </label>
                <AccountQrField
                  label="QR code"
                  path={draft.jazzcash_qr_path}
                  onUpload={(file) => uploadQr('jazzcash_qr_path', file)}
                />
              </div>
            </PaymentAccountSection>

            <PaymentAccountSection
              title="Bank transfer"
              enabled={draft.enable_bank_transfer}
              toggleLabel="Enable bank transfer"
              onToggle={() => updateToggle('enable_bank_transfer')}
            >
              <div className="payment-admin-fields">
                <label className="payment-admin-label">
                  Bank name
                  <input value={draft.bank_name} onChange={(event) => updateText('bank_name', event.target.value)} />
                </label>
                <label className="payment-admin-label">
                  Account holder
                  <input
                    value={draft.bank_account_holder}
                    onChange={(event) => updateText('bank_account_holder', event.target.value)}
                  />
                </label>
                <label className="payment-admin-label">
                  IBAN
                  <input value={draft.bank_iban} onChange={(event) => updateText('bank_iban', event.target.value)} />
                </label>
                <label className="payment-admin-label">
                  Account number
                  <input
                    value={draft.bank_account_number}
                    onChange={(event) => updateText('bank_account_number', event.target.value)}
                  />
                </label>
                <AccountQrField
                  label="QR code"
                  path={draft.bank_qr_path}
                  onUpload={(file) => uploadQr('bank_qr_path', file)}
                />
              </div>
              <p className="payment-admin-help">
                Bank transfer is stored for future use and is not offered at checkout yet.
              </p>
            </PaymentAccountSection>

            <div className="payment-admin-actions">
              <button
                type="button"
                className="payment-admin-save"
                disabled={isSaving}
                onClick={() => void save()}
              >
                {isSaving ? (
                  <LoaderCircle className="payment-admin-spinner" size={16} aria-hidden="true" />
                ) : (
                  <Save size={16} aria-hidden="true" />
                )}
                {isSaving ? 'Saving…' : 'Save payment accounts'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
