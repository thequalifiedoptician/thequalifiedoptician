import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ArrowLeft, ImagePlus, LoaderCircle, RotateCcw, Save, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBrandSettings } from '@/features/brand/brandSettingsContext';
import {
  DEFAULT_BRAND_SETTINGS,
  deleteBrandAsset,
  getBrandAssetPath,
  getBrandSettings,
  updateBrandSettings,
  uploadFavicon,
  uploadLogo,
  type BrandSettings,
  type BrandSettingsForm,
  type UploadedBrandAsset,
} from '@/features/brand/brandSettingsService';
import './brand-settings.css';

type Notice = { kind: 'success' | 'error'; message: string };
type AssetKind = 'logo' | 'favicon';
type PendingAssets = Record<AssetKind, string | null>;

const EMPTY_PENDING_ASSETS: PendingAssets = { logo: null, favicon: null };

function toForm(settings: BrandSettings): BrandSettingsForm {
  return {
    brand_name: settings.brand_name,
    brand_tagline: settings.brand_tagline,
    browser_title: settings.browser_title,
    logo_url: settings.logo_url,
    favicon_url: settings.favicon_url,
    company_name: settings.company_name,
    company_email: settings.company_email,
    company_phone: settings.company_phone,
    company_address: settings.company_address,
    company_city: settings.company_city,
    company_country: settings.company_country,
    postal_code: settings.postal_code,
    google_maps_url: settings.google_maps_url,
    support_email: settings.support_email,
    footer_copyright: settings.footer_copyright,
  };
}

function TextField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'tel' | 'url';
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="brand-settings-field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextAreaField({
  id,
  label,
  value,
  onChange,
  rows = 3,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="brand-settings-field" htmlFor={id}>
      <span>{label}</span>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export default function BrandSettingsPage() {
  const { replaceSettings } = useBrandSettings();
  const [savedSettings, setSavedSettings] = useState<BrandSettings | null>(null);
  const [form, setForm] = useState<BrandSettingsForm>(DEFAULT_BRAND_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState<AssetKind | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const faviconInput = useRef<HTMLInputElement>(null);
  const pendingAssets = useRef<PendingAssets>({ ...EMPTY_PENDING_ASSETS });
  const savedForm = useMemo(
    () => (savedSettings ? toForm(savedSettings) : DEFAULT_BRAND_SETTINGS),
    [savedSettings],
  );
  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(savedForm),
    [form, savedForm],
  );

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setNotice(null);
    try {
      const settings = await getBrandSettings();
      setSavedSettings(settings);
      setForm(toForm(settings));
    } catch (error) {
      setNotice({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Brand settings could not be loaded.',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void getBrandSettings().then(
      (settings) => {
        if (active) {
          setSavedSettings(settings);
          setForm(toForm(settings));
          setIsLoading(false);
        }
      },
      (error: unknown) => {
        if (active) {
          setNotice({
            kind: 'error',
            message: error instanceof Error ? error.message : 'Brand settings could not be loaded.',
          });
          setIsLoading(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) {
        return;
      }
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(
    () => () => {
      for (const path of Object.values(pendingAssets.current)) {
        if (path) {
          void deleteBrandAsset(path).catch((error: unknown) => {
            console.error('An uncommitted brand asset could not be cleaned up.', error);
          });
        }
      }
    },
    [],
  );

  const updateField = <K extends keyof BrandSettingsForm>(key: K, value: BrandSettingsForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setNotice(null);
  };

  const handleUpload = async (kind: AssetKind, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    setUploading(kind);
    setNotice(null);
    try {
      const uploaded: UploadedBrandAsset =
        kind === 'logo' ? await uploadLogo(file) : await uploadFavicon(file);
      const previousPending = pendingAssets.current[kind];
      pendingAssets.current[kind] = uploaded.path;
      if (previousPending) {
        await deleteBrandAsset(previousPending);
      }
      updateField(kind === 'logo' ? 'logo_url' : 'favicon_url', uploaded.url);
      setNotice({
        kind: 'success',
        message: `${kind === 'logo' ? 'Logo' : 'Favicon'} uploaded. Save changes to publish it.`,
      });
    } catch (error) {
      setNotice({
        kind: 'error',
        message:
          error instanceof Error
            ? error.message
            : `${kind === 'logo' ? 'Logo' : 'Favicon'} upload failed.`,
      });
    } finally {
      setUploading(null);
    }
  };

  const clearPendingUploads = async () => {
    const paths = Object.values(pendingAssets.current).filter((path): path is string =>
      Boolean(path),
    );
    pendingAssets.current = { ...EMPTY_PENDING_ASSETS };
    const results = await Promise.allSettled(paths.map((path) => deleteBrandAsset(path)));
    const failed = results.find((result) => result.status === 'rejected');
    if (failed?.status === 'rejected') {
      throw failed.reason;
    }
  };

  const handleCancel = async () => {
    if (!savedSettings) {
      return;
    }
    try {
      await clearPendingUploads();
      setForm(toForm(savedSettings));
      setNotice(null);
    } catch (error) {
      setNotice({
        kind: 'error',
        message:
          error instanceof Error ? error.message : 'An unused uploaded file could not be removed.',
      });
    }
  };

  const handleReset = async () => {
    try {
      await clearPendingUploads();
      setForm({ ...DEFAULT_BRAND_SETTINGS });
      setNotice({ kind: 'success', message: 'Default brand values restored. Save to apply them.' });
    } catch (error) {
      setNotice({
        kind: 'error',
        message:
          error instanceof Error ? error.message : 'An unused uploaded file could not be removed.',
      });
    }
  };

  const handleSave = async () => {
    if (!savedSettings) {
      return;
    }
    if (!form.brand_name.trim() || !form.browser_title.trim()) {
      setNotice({ kind: 'error', message: 'Brand name and browser title are required.' });
      return;
    }
    for (const [label, address] of [
      ['Company email', form.company_email],
      ['Support email', form.support_email],
    ]) {
      if (address && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(address)) {
        setNotice({ kind: 'error', message: `${label} must be a valid email address.` });
        return;
      }
    }
    if (form.google_maps_url) {
      try {
        const mapUrl = new URL(form.google_maps_url);
        if (mapUrl.protocol !== 'https:') {
          throw new Error();
        }
      } catch {
        setNotice({ kind: 'error', message: 'Google Maps URL must be a valid HTTPS URL.' });
        return;
      }
    }

    setIsSaving(true);
    setNotice(null);
    try {
      const updatedSettings = await updateBrandSettings(savedSettings.id, form);
      setSavedSettings(updatedSettings);
      setForm(toForm(updatedSettings));
      replaceSettings(updatedSettings);
      pendingAssets.current = { ...EMPTY_PENDING_ASSETS };

      const replacedAssetUrls = [
        savedSettings.logo_url !== updatedSettings.logo_url ? savedSettings.logo_url : null,
        savedSettings.favicon_url !== updatedSettings.favicon_url
          ? savedSettings.favicon_url
          : null,
      ];
      const oldPaths = replacedAssetUrls
        .map(getBrandAssetPath)
        .filter((path): path is string => Boolean(path));
      const removalResults = await Promise.allSettled(
        oldPaths.map((path) => deleteBrandAsset(path)),
      );
      const failedRemoval = removalResults.find((result) => result.status === 'rejected');
      setNotice(
        failedRemoval?.status === 'rejected'
          ? {
              kind: 'error',
              message: `Settings were saved, but an unused previous image could not be deleted: ${String(failedRemoval.reason)}`,
            }
          : { kind: 'success', message: 'Brand settings saved successfully.' },
      );
    } catch (error) {
      setNotice({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Brand settings could not be saved.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const setAssetUrl = (kind: AssetKind, url: string | null) => {
    const pendingPath = pendingAssets.current[kind];
    if (pendingPath) {
      pendingAssets.current[kind] = null;
      void deleteBrandAsset(pendingPath).catch((error: unknown) => {
        setNotice({
          kind: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'The unused uploaded image could not be deleted.',
        });
      });
    }
    updateField(kind === 'logo' ? 'logo_url' : 'favicon_url', url);
  };

  if (isLoading) {
    return (
      <main className="brand-settings-page">
        <div className="brand-settings-loading" role="status">
          <LoaderCircle aria-hidden="true" />
          Loading brand settings…
        </div>
      </main>
    );
  }

  return (
    <main className="brand-settings-page">
      <header className="brand-settings-topbar">
        <Link className="brand-settings-back" to="/admin/homepage">
          <ArrowLeft aria-hidden="true" /> Admin dashboard
        </Link>
        <span>SETTINGS</span>
      </header>

      <div className="brand-settings-content">
        <header className="brand-settings-heading">
          <div>
            <p className="brand-settings-eyebrow">STORE IDENTITY</p>
            <h1>Brand settings</h1>
            <p>Manage the name, assets, and company details displayed across your storefront.</p>
          </div>
        </header>

        {notice && (
          <div
            className={`brand-settings-notice is-${notice.kind}`}
            role={notice.kind === 'error' ? 'alert' : 'status'}
          >
            {notice.message}
          </div>
        )}
        {isDirty && (
          <p className="brand-settings-unsaved" role="status">
            You have unsaved changes. Save or cancel before leaving this page.
          </p>
        )}

        {!savedSettings ? (
          <section className="brand-settings-error">
            <p>Settings could not be opened.</p>
            <button type="button" onClick={() => void loadSettings()}>
              Try again
            </button>
          </section>
        ) : (
          <>
            <section className="brand-settings-panel" aria-labelledby="brand-general-heading">
              <div className="brand-settings-panel-heading">
                <h2 id="brand-general-heading">General</h2>
                <p>Set the storefront name and browser identity.</p>
              </div>
              <div className="brand-settings-fields">
                <TextField
                  id="brand-name"
                  label="Brand name"
                  required
                  value={form.brand_name}
                  onChange={(value) => updateField('brand_name', value)}
                />
                <TextField
                  id="brand-tagline"
                  label="Brand tagline"
                  value={form.brand_tagline}
                  onChange={(value) => updateField('brand_tagline', value)}
                />
                <TextField
                  id="browser-title"
                  label="Browser title"
                  required
                  value={form.browser_title}
                  onChange={(value) => updateField('browser_title', value)}
                />
              </div>
            </section>

            <section className="brand-settings-panel" aria-labelledby="brand-assets-heading">
              <div className="brand-settings-panel-heading">
                <h2 id="brand-assets-heading">Branding</h2>
                <p>Upload public storefront assets. Images are validated before upload.</p>
              </div>
              <div className="brand-settings-assets">
                <AssetEditor
                  title="Logo"
                  description="PNG, SVG, WebP, or JPG · maximum 5 MB"
                  imageUrl={form.logo_url}
                  isUploading={uploading === 'logo'}
                  onChoose={() => logoInput.current?.click()}
                  onRemove={() => setAssetUrl('logo', null)}
                />
                <AssetEditor
                  title="Favicon"
                  description="PNG, ICO, or SVG · maximum 1 MB"
                  imageUrl={form.favicon_url}
                  isUploading={uploading === 'favicon'}
                  onChoose={() => faviconInput.current?.click()}
                  onRemove={() => setAssetUrl('favicon', null)}
                />
                <input
                  ref={logoInput}
                  className="brand-settings-file-input"
                  type="file"
                  accept=".png,.svg,.webp,.jpg,.jpeg,image/png,image/svg+xml,image/webp,image/jpeg"
                  aria-label="Upload logo image"
                  onChange={(event) => void handleUpload('logo', event)}
                />
                <input
                  ref={faviconInput}
                  className="brand-settings-file-input"
                  type="file"
                  accept=".png,.ico,.svg,image/png,image/x-icon,image/svg+xml"
                  aria-label="Upload favicon image"
                  onChange={(event) => void handleUpload('favicon', event)}
                />
              </div>
              <div className="brand-settings-preview" aria-live="polite">
                <span className="brand-settings-preview-label">LIVE PREVIEW</span>
                <div className="brand-settings-preview-header">
                  {form.logo_url ? (
                    <img src={form.logo_url} alt="" />
                  ) : (
                    <span className="brand-settings-preview-mark" aria-hidden="true">
                      {form.brand_name.trim().charAt(0).toUpperCase() || 'B'}
                    </span>
                  )}
                  <span>
                    <strong>{form.brand_name || 'Brand name'}</strong>
                    <small>{form.brand_tagline || 'Brand tagline'}</small>
                  </span>
                  {form.favicon_url && (
                    <img className="brand-settings-preview-favicon" src={form.favicon_url} alt="" />
                  )}
                </div>
                <span className="brand-settings-preview-title">
                  Browser tab: {form.browser_title || form.brand_name || 'Brand'}
                </span>
              </div>
            </section>

            <section className="brand-settings-panel" aria-labelledby="brand-company-heading">
              <div className="brand-settings-panel-heading">
                <h2 id="brand-company-heading">Company</h2>
                <p>Public contact information shown in the storefront footer.</p>
              </div>
              <div className="brand-settings-fields">
                <TextField
                  id="company-name"
                  label="Company name"
                  value={form.company_name}
                  onChange={(value) => updateField('company_name', value)}
                />
                <TextField
                  id="company-email"
                  label="Company email"
                  type="email"
                  value={form.company_email}
                  onChange={(value) => updateField('company_email', value)}
                />
                <TextField
                  id="company-phone"
                  label="Company phone"
                  type="tel"
                  value={form.company_phone}
                  onChange={(value) => updateField('company_phone', value)}
                />
                <TextAreaField
                  id="company-address"
                  label="Company address"
                  value={form.company_address}
                  onChange={(value) => updateField('company_address', value)}
                />
                <TextField
                  id="company-city"
                  label="City"
                  value={form.company_city}
                  onChange={(value) => updateField('company_city', value)}
                />
                <TextField
                  id="company-country"
                  label="Country"
                  value={form.company_country}
                  onChange={(value) => updateField('company_country', value)}
                />
                <TextField
                  id="company-postal-code"
                  label="Postal code"
                  value={form.postal_code}
                  onChange={(value) => updateField('postal_code', value)}
                />
                <TextField
                  id="company-maps-url"
                  label="Google Maps URL"
                  type="url"
                  value={form.google_maps_url}
                  onChange={(value) => updateField('google_maps_url', value)}
                />
                <TextField
                  id="support-email"
                  label="Support email"
                  type="email"
                  value={form.support_email}
                  onChange={(value) => updateField('support_email', value)}
                />
              </div>
            </section>

            <section className="brand-settings-panel" aria-labelledby="brand-footer-heading">
              <div className="brand-settings-panel-heading">
                <h2 id="brand-footer-heading">Footer</h2>
                <p>
                  Use {'{year}'} and {'{brand_name}'} for values that update automatically.
                </p>
              </div>
              <TextAreaField
                id="footer-copyright"
                label="Copyright text"
                value={form.footer_copyright}
                onChange={(value) => updateField('footer_copyright', value)}
                rows={2}
              />
            </section>

            <div className="brand-settings-actions">
              <button
                className="brand-settings-button is-secondary"
                type="button"
                disabled={!isDirty || isSaving || uploading !== null}
                onClick={() => void handleReset()}
              >
                <RotateCcw aria-hidden="true" /> Reset
              </button>
              <button
                className="brand-settings-button is-secondary"
                type="button"
                disabled={!isDirty || isSaving || uploading !== null}
                onClick={() => void handleCancel()}
              >
                Cancel
              </button>
              <button
                className="brand-settings-button is-primary"
                type="button"
                disabled={!isDirty || isSaving || uploading !== null}
                onClick={() => void handleSave()}
              >
                {isSaving ? (
                  <LoaderCircle className="is-spinning" aria-hidden="true" />
                ) : (
                  <Save aria-hidden="true" />
                )}
                {isSaving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function AssetEditor({
  title,
  description,
  imageUrl,
  isUploading,
  onChoose,
  onRemove,
}: {
  title: string;
  description: string;
  imageUrl: string | null;
  isUploading: boolean;
  onChoose: () => void;
  onRemove: () => void;
}) {
  return (
    <article className="brand-settings-asset">
      <div className="brand-settings-asset-preview">
        {imageUrl ? (
          <img src={imageUrl} alt={`${title} preview`} />
        ) : (
          <ImagePlus aria-hidden="true" />
        )}
      </div>
      <div className="brand-settings-asset-copy">
        <h3>{title}</h3>
        <p>{description}</p>
        <div className="brand-settings-asset-actions">
          <button
            type="button"
            onClick={onChoose}
            disabled={isUploading}
            aria-label={`Upload or replace ${title.toLowerCase()}`}
          >
            {isUploading ? (
              <LoaderCircle className="is-spinning" aria-hidden="true" />
            ) : (
              <ImagePlus aria-hidden="true" />
            )}
            {imageUrl ? 'Replace' : 'Upload'}
          </button>
          {imageUrl && (
            <button
              type="button"
              className="is-danger"
              onClick={onRemove}
              aria-label={`Delete ${title.toLowerCase()}`}
            >
              <Trash2 aria-hidden="true" /> Delete
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
