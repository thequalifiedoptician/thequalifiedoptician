import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  ImagePlus,
  LoaderCircle,
  Plus,
  Save,
  Tag,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBrandSettings } from '@/features/brand/brandSettingsContext';
import {
  deleteDeal,
  deleteDealBanner,
  loadAdminDeals,
  saveDeal,
  uploadDealBanner,
  type Deal,
  type DealInput,
} from '@/features/deals/dealsService';
import AdminNavbar from '../components/AdminNavbar';
import './deals-admin.css';

type Notice = { tone: 'success' | 'error' | 'warning'; message: string };
type DealForm = {
  title: string;
  badge: string;
  description: string;
  image_path: string;
  image_url: string;
  image_alt: string;
  action_label: string;
  action_href: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  sort_order: string;
};

function emptyDealForm(): DealForm {
  return {
    title: '',
    badge: '',
    description: '',
    image_path: '',
    image_url: '',
    image_alt: '',
    action_label: 'Explore the deal',
    action_href: '/shop',
    starts_at: '',
    ends_at: '',
    is_active: false,
    sort_order: '0',
  };
}

function toLocalDateTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function toDealForm(deal: Deal): DealForm {
  return {
    title: deal.title,
    badge: deal.badge,
    description: deal.description,
    image_path: deal.image_path,
    image_url: deal.image_url,
    image_alt: deal.image_alt,
    action_label: deal.action_label,
    action_href: deal.action_href,
    starts_at: toLocalDateTime(deal.starts_at),
    ends_at: toLocalDateTime(deal.ends_at),
    is_active: deal.is_active,
    sort_order: String(deal.sort_order),
  };
}

function safeActionHref(value: string): boolean {
  const href = value.trim();
  if (href.startsWith('/') && !href.startsWith('//')) return true;
  try {
    const url = new URL(href);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function getDealStatus(deal: Deal): string {
  if (!deal.is_active) return 'Hidden';
  const now = Date.now();
  if (deal.starts_at && Date.parse(deal.starts_at) > now) return 'Scheduled';
  if (deal.ends_at && Date.parse(deal.ends_at) <= now) return 'Expired';
  return 'Published';
}

function localDateToIso(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

export default function DealsAdminPage() {
  const { settings: brand } = useBrandSettings();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [form, setForm] = useState<DealForm | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const pendingBannerPath = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadAdminDeals().then(
      (records) => {
        if (active) {
          setDeals(records);
          setLoadError(null);
          setIsLoading(false);
        }
      },
      (error: unknown) => {
        if (active) {
          setLoadError(
            error instanceof Error ? error.message : 'Deal posts could not be loaded.',
          );
          setIsLoading(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const updateForm = <K extends keyof DealForm>(key: K, value: DealForm[K]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
    setNotice(null);
  };

  const startNewDeal = () => {
    setEditingId(null);
    setForm(emptyDealForm());
    setNotice(null);
  };

  const editDeal = (deal: Deal) => {
    setEditingId(deal.id);
    setForm(toDealForm(deal));
    pendingBannerPath.current = null;
    setNotice(null);
  };

  const cancelEdit = async () => {
    const pendingPath = pendingBannerPath.current;
    pendingBannerPath.current = null;
    setForm(null);
    setEditingId(null);
    if (pendingPath) {
      try {
        await deleteDealBanner(pendingPath);
      } catch (error) {
        setNotice({
          tone: 'warning',
          message:
            error instanceof Error
              ? error.message
              : 'The unused banner image could not be removed.',
        });
      }
    }
  };

  const handleBannerUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file || !form) return;

    setIsUploading(true);
    setNotice(null);
    try {
      const uploaded = await uploadDealBanner(file);
      const previousPendingPath = pendingBannerPath.current;
      pendingBannerPath.current = uploaded.path;
      setForm((current) =>
        current
          ? {
              ...current,
              image_path: uploaded.path,
              image_url: uploaded.url,
              image_alt:
                current.image_alt ||
                file.name.replace(/\.[^.]+$/u, '').replace(/[-_]+/gu, ' '),
            }
          : current,
      );
      if (previousPendingPath) {
        try {
          await deleteDealBanner(previousPendingPath);
          pendingBannerPath.current = uploaded.path;
        } catch (cleanupError) {
          setNotice({
            tone: 'warning',
            message:
              cleanupError instanceof Error
                ? cleanupError.message
                : 'The previous unsaved banner could not be removed.',
          });
        }
      }
    } catch (error) {
      setNotice({
        tone: 'error',
        message:
          error instanceof Error ? error.message : 'Deal banner could not be uploaded.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form) return;
    if (!form.title.trim()) {
      setNotice({ tone: 'error', message: 'Add a title for this deal.' });
      return;
    }
    if (!form.image_path || !form.image_url) {
      setNotice({ tone: 'error', message: 'Upload a banner image before saving.' });
      return;
    }
    if (!form.image_alt.trim()) {
      setNotice({ tone: 'error', message: 'Add descriptive alt text for the banner image.' });
      return;
    }
    if (!form.action_label.trim() || !safeActionHref(form.action_href)) {
      setNotice({
        tone: 'error',
        message: 'Add a button label and a valid store path or http(s) link.',
      });
      return;
    }

    const startsAt = localDateToIso(form.starts_at);
    const endsAt = localDateToIso(form.ends_at);
    if (startsAt && endsAt && Date.parse(startsAt) >= Date.parse(endsAt)) {
      setNotice({ tone: 'error', message: 'The end date must be after the start date.' });
      return;
    }

    const previousImagePath = editingId
      ? deals.find((deal) => deal.id === editingId)?.image_path ?? ''
      : '';
    const input: DealInput = {
      title: form.title.trim(),
      badge: form.badge.trim(),
      description: form.description.trim(),
      image_path: form.image_path,
      image_url: form.image_url,
      image_alt: form.image_alt.trim(),
      action_label: form.action_label.trim(),
      action_href: form.action_href.trim(),
      starts_at: startsAt,
      ends_at: endsAt,
      is_active: form.is_active,
      sort_order: Math.max(0, Number.parseInt(form.sort_order, 10) || 0),
    };

    setIsSaving(true);
    setNotice(null);
    try {
      const saved = await saveDeal(input, editingId ?? undefined);
      setDeals((current) =>
        [...current.filter((deal) => deal.id !== saved.id), saved].sort(
          (left, right) =>
            left.sort_order - right.sort_order ||
            right.created_at.localeCompare(left.created_at),
        ),
      );
      setEditingId(saved.id);
      setForm(toDealForm(saved));
      pendingBannerPath.current = null;

      if (previousImagePath && previousImagePath !== saved.image_path) {
        try {
          await deleteDealBanner(previousImagePath);
        } catch (cleanupError) {
          setNotice({
            tone: 'warning',
            message:
              cleanupError instanceof Error
                ? `Deal saved, but the previous banner could not be removed: ${cleanupError.message}`
                : 'Deal saved, but the previous banner could not be removed.',
          });
          return;
        }
      }
      setNotice({
        tone: 'success',
        message: saved.is_active
          ? 'Deal saved. It will appear on the Deals page when its schedule is active.'
          : 'Deal saved as hidden. Turn it on when it is ready to publish.',
      });
    } catch (error) {
      setNotice({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Deal could not be saved.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (deal: Deal) => {
    if (!window.confirm(`Delete "${deal.title}"? This cannot be undone.`)) return;
    setIsDeleting(deal.id);
    setNotice(null);
    try {
      const cleanupError = await deleteDeal(deal.id, deal.image_path);
      setDeals((current) => current.filter((item) => item.id !== deal.id));
      if (editingId === deal.id) {
        setEditingId(null);
        setForm(null);
      }
      setNotice(
        cleanupError
          ? {
              tone: 'warning',
              message: `Deal deleted, but its banner image could not be removed: ${cleanupError}`,
            }
          : { tone: 'success', message: 'Deal deleted.' },
      );
    } catch (error) {
      setNotice({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Deal could not be deleted.',
      });
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <main className="deals-admin">
      <AdminNavbar />

      <div className="deals-admin-content">
        <Link className="deals-admin-back" to="/admin/homepage">
          <ArrowLeft size={15} aria-hidden="true" /> Admin dashboard
        </Link>
        <header className="deals-admin-heading">
          <div>
            <p>STOREFRONT CONTENT</p>
            <h1>Deals studio</h1>
            <span>Create polished offer posts and banners for your Deals page.</span>
          </div>
          {!form && (
            <button type="button" className="deals-admin-primary" onClick={startNewDeal}>
              <Plus size={16} aria-hidden="true" /> New deal
            </button>
          )}
        </header>

        {notice && (
          <p className={`deals-admin-notice deals-admin-notice--${notice.tone}`} role="status">
            {notice.message}
          </p>
        )}

        <p className="deals-admin-guidance">
          Offer badges and copy are promotional content only; they do not change product prices or
          checkout totals.
        </p>

        {form && (
          <section className="deals-admin-editor" aria-labelledby="deal-editor-title">
            <div className="deals-admin-editor-heading">
              <div>
                <p>{editingId ? 'EDIT POST' : 'NEW POST'}</p>
                <h2 id="deal-editor-title">{editingId ? 'Shape this offer' : 'Create a deal post'}</h2>
              </div>
              <button
                type="button"
                className="deals-admin-close"
                disabled={isSaving || isUploading}
                onClick={() => void cancelEdit()}
              >
                Cancel
              </button>
            </div>

            <div className="deals-admin-form-grid">
              <label className="deals-admin-field">
                Deal title
                <input
                  maxLength={120}
                  value={form.title}
                  onChange={(event) => updateForm('title', event.target.value)}
                  placeholder="A little something for your space"
                />
              </label>
              <label className="deals-admin-field">
                Offer badge
                <input
                  maxLength={60}
                  value={form.badge}
                  onChange={(event) => updateForm('badge', event.target.value)}
                  placeholder="Seasonal edit · up to 20% off"
                />
              </label>
              <label className="deals-admin-field deals-admin-field--wide">
                Description
                <textarea
                  maxLength={700}
                  rows={4}
                  value={form.description}
                  onChange={(event) => updateForm('description', event.target.value)}
                  placeholder="Tell customers what makes this offer worth a closer look."
                />
              </label>
              <div className="deals-admin-field deals-admin-field--wide">
                <span>Banner image</span>
                <label className="deals-admin-upload">
                  <ImagePlus size={18} aria-hidden="true" />
                  {isUploading ? 'Uploading image…' : 'Choose banner image'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    disabled={isUploading}
                    onChange={(event) => void handleBannerUpload(event)}
                  />
                </label>
                <small>JPG, PNG, WebP, or AVIF · up to 10 MB</small>
                {form.image_url && (
                  <img
                    className="deals-admin-image-preview"
                    src={form.image_url}
                    alt={form.image_alt || 'Deal banner preview'}
                  />
                )}
              </div>
              <label className="deals-admin-field deals-admin-field--wide">
                Image description (alt text)
                <input
                  maxLength={200}
                  value={form.image_alt}
                  onChange={(event) => updateForm('image_alt', event.target.value)}
                  placeholder="Describe the banner image"
                />
              </label>
              <label className="deals-admin-field">
                Button label
                <input
                  maxLength={50}
                  value={form.action_label}
                  onChange={(event) => updateForm('action_label', event.target.value)}
                />
              </label>
              <label className="deals-admin-field">
                Button link
                <input
                  maxLength={500}
                  value={form.action_href}
                  onChange={(event) => updateForm('action_href', event.target.value)}
                  placeholder="/shop or https://..."
                />
              </label>
              <label className="deals-admin-field">
                Starts at (optional)
                <span className="deals-admin-input-icon">
                  <CalendarDays size={15} aria-hidden="true" />
                  <input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(event) => updateForm('starts_at', event.target.value)}
                  />
                </span>
              </label>
              <label className="deals-admin-field">
                Ends at (optional)
                <span className="deals-admin-input-icon">
                  <CalendarDays size={15} aria-hidden="true" />
                  <input
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(event) => updateForm('ends_at', event.target.value)}
                  />
                </span>
              </label>
              <label className="deals-admin-field">
                Display order
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={form.sort_order}
                  onChange={(event) => updateForm('sort_order', event.target.value)}
                />
              </label>
              <label className="deals-admin-publish">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => updateForm('is_active', event.target.checked)}
                />
                <span>
                  <strong>Publish this deal</strong>
                  <small>Only published offers inside their schedule appear on the storefront.</small>
                </span>
              </label>
            </div>

            <div className="deals-admin-actions">
              <button
                type="button"
                className="deals-admin-primary"
                disabled={isSaving || isUploading}
                onClick={() => void handleSave()}
              >
                {isSaving ? (
                  <LoaderCircle className="deals-admin-spinner" size={16} aria-hidden="true" />
                ) : (
                  <Save size={16} aria-hidden="true" />
                )}
                {isSaving ? 'Saving…' : 'Save deal'}
              </button>
            </div>
          </section>
        )}

        <section className="deals-admin-list" aria-labelledby="deals-list-title">
          <div className="deals-admin-list-heading">
            <div>
              <p>YOUR CONTENT</p>
              <h2 id="deals-list-title">All deal posts</h2>
            </div>
            <span>{deals.length} {deals.length === 1 ? 'post' : 'posts'}</span>
          </div>

          {isLoading ? (
            <div className="deals-admin-state" role="status">
              <LoaderCircle className="deals-admin-spinner" size={18} aria-hidden="true" />
              Loading deal posts…
            </div>
          ) : loadError ? (
            <div className="deals-admin-state deals-admin-state--error" role="alert">
              <p>{loadError}</p>
              <button
                type="button"
                onClick={() => {
                  setIsLoading(true);
                  setReloadKey((key) => key + 1);
                }}
              >
                Try again
              </button>
            </div>
          ) : deals.length ? (
            <div className="deals-admin-cards">
              {deals.map((deal) => (
                <article className="deals-admin-card" key={deal.id}>
                  <img src={deal.image_url} alt="" />
                  <div className="deals-admin-card-copy">
                    <div className="deals-admin-card-meta">
                      <span className={`deals-admin-status deals-admin-status--${getDealStatus(deal).toLowerCase()}`}>
                        {getDealStatus(deal)}
                      </span>
                      <span>Order {deal.sort_order}</span>
                    </div>
                    <h3>{deal.title}</h3>
                    <p>{deal.badge || deal.description || 'No offer description added.'}</p>
                  </div>
                  <div className="deals-admin-card-actions">
                    <button type="button" onClick={() => editDeal(deal)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="deals-admin-delete"
                      disabled={isDeleting === deal.id}
                      onClick={() => void handleDelete(deal)}
                      aria-label={`Delete ${deal.title}`}
                    >
                      {isDeleting === deal.id ? (
                        <LoaderCircle className="deals-admin-spinner" size={15} aria-hidden="true" />
                      ) : (
                        <Trash2 size={15} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="deals-admin-empty">
              <span>
                <Tag size={20} aria-hidden="true" />
              </span>
              <h3>Your Deals page is ready.</h3>
              <p>Create a banner post and publish it when you are ready for customers to see it.</p>
              <button type="button" className="deals-admin-primary" onClick={startNewDeal}>
                <Plus size={16} aria-hidden="true" /> Create your first deal
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
