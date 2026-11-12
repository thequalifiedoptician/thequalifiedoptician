import { useState, type FormEvent } from 'react';
import { ArrowLeft, LoaderCircle, Mail, Save } from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';
import { Link } from 'react-router-dom';
import { useSocialSettings } from '@/features/social/socialSettingsContext';
import {
  FacebookBrandIcon,
  InstagramBrandIcon,
  LinkedInBrandIcon,
  PinterestBrandIcon,
  TikTokBrandIcon,
  WhatsAppBrandIcon,
  XBrandIcon,
  YouTubeBrandIcon,
} from '@/features/social/SocialBrandIcon';
import {
  updateSocialSettings,
  type SocialSettings,
  type SocialSettingsForm,
} from '@/features/social/socialSettingsService';
import AdminNavbar from '../components/AdminNavbar';
import './social-media-admin.css';

type Notice = { kind: 'success' | 'error'; message: string };
type SocialUrlKey =
  | 'facebook_url'
  | 'instagram_url'
  | 'tiktok_url'
  | 'linkedin_url'
  | 'youtube_url'
  | 'twitter_url'
  | 'pinterest_url';
type SocialToggleKey =
  | 'enable_facebook'
  | 'enable_instagram'
  | 'enable_tiktok'
  | 'enable_linkedin'
  | 'enable_youtube'
  | 'enable_twitter'
  | 'enable_pinterest';

const SOCIAL_NETWORKS: {
  label: string;
  urlKey: SocialUrlKey;
  enabledKey: SocialToggleKey;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}[] = [
  {
    label: 'Facebook',
    urlKey: 'facebook_url',
    enabledKey: 'enable_facebook',
    Icon: FacebookBrandIcon,
  },
  {
    label: 'Instagram',
    urlKey: 'instagram_url',
    enabledKey: 'enable_instagram',
    Icon: InstagramBrandIcon,
  },
  { label: 'TikTok', urlKey: 'tiktok_url', enabledKey: 'enable_tiktok', Icon: TikTokBrandIcon },
  {
    label: 'LinkedIn',
    urlKey: 'linkedin_url',
    enabledKey: 'enable_linkedin',
    Icon: LinkedInBrandIcon,
  },
  { label: 'YouTube', urlKey: 'youtube_url', enabledKey: 'enable_youtube', Icon: YouTubeBrandIcon },
  { label: 'Twitter (X)', urlKey: 'twitter_url', enabledKey: 'enable_twitter', Icon: XBrandIcon },
  {
    label: 'Pinterest',
    urlKey: 'pinterest_url',
    enabledKey: 'enable_pinterest',
    Icon: PinterestBrandIcon,
  },
];

function toForm(settings: SocialSettings): SocialSettingsForm {
  return {
    whatsapp_number: settings.whatsapp_number,
    whatsapp_message: settings.whatsapp_message,
    facebook_url: settings.facebook_url,
    instagram_url: settings.instagram_url,
    tiktok_url: settings.tiktok_url,
    linkedin_url: settings.linkedin_url,
    youtube_url: settings.youtube_url,
    twitter_url: settings.twitter_url,
    pinterest_url: settings.pinterest_url,
    email: settings.email,
    support_phone: settings.support_phone,
    enable_whatsapp: settings.enable_whatsapp,
    enable_facebook: settings.enable_facebook,
    enable_instagram: settings.enable_instagram,
    enable_tiktok: settings.enable_tiktok,
    enable_linkedin: settings.enable_linkedin,
    enable_youtube: settings.enable_youtube,
    enable_twitter: settings.enable_twitter,
    enable_pinterest: settings.enable_pinterest,
    enable_email: settings.enable_email,
  };
}

function isValidExternalUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export default function SocialMediaAdminPage() {
  const { settings, isLoading, error, reload, replaceSettings } = useSocialSettings();

  return (
    <main className="social-settings-page">
      <AdminNavbar />

      <div className="social-settings-content">
        <header className="social-settings-heading">
          <div>
            <p className="social-settings-eyebrow">STOREFRONT SETTINGS</p>
            <h1>Social Media</h1>
            <p>Manage public social links and contact options shown on your storefront.</p>
          </div>
        </header>

        {isLoading ? (
          <div className="social-settings-state" role="status">
            <LoaderCircle className="is-spinning" aria-hidden="true" /> Loading social settings…
          </div>
        ) : error ? (
          <section className="social-settings-state is-error" role="alert">
            <p>{error}</p>
            <button type="button" onClick={() => void reload()}>
              Try again
            </button>
          </section>
        ) : settings ? (
          <SocialMediaEditor settings={settings} replaceSettings={replaceSettings} />
        ) : null}
      </div>
    </main>
  );
}

function SocialMediaEditor({
  settings,
  replaceSettings,
}: {
  settings: SocialSettings;
  replaceSettings: (settings: SocialSettings) => void;
}) {
  const [form, setForm] = useState(() => toForm(settings));
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const isDirty = JSON.stringify(form) !== JSON.stringify(toForm(settings));

  const updateField = <K extends keyof SocialSettingsForm>(
    key: K,
    value: SocialSettingsForm[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    setNotice(null);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    const invalidNetwork = SOCIAL_NETWORKS.find(
      (network) => !isValidExternalUrl(form[network.urlKey]),
    );
    if (invalidNetwork) {
      setNotice({
        kind: 'error',
        message: `${invalidNetwork.label} URL must use HTTP or HTTPS.`,
      });
      return;
    }

    setIsSaving(true);
    try {
      const saved = await updateSocialSettings(form);
      replaceSettings(saved);
      setNotice({ kind: 'success', message: 'Social media settings saved successfully.' });
    } catch (saveError) {
      setNotice({
        kind: 'error',
        message:
          saveError instanceof Error
            ? saveError.message
            : 'Social media settings could not be saved.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {notice && (
        <div
          className={`social-settings-notice is-${notice.kind}`}
          role={notice.kind === 'error' ? 'alert' : 'status'}
        >
          {notice.message}
        </div>
      )}

      <form onSubmit={(event) => void handleSave(event)}>
        <section className="social-settings-panel" aria-labelledby="social-general-heading">
          <div className="social-settings-panel-heading">
            <h2 id="social-general-heading">General</h2>
            <p>Set the contact details used by the floating contact menu.</p>
          </div>
          <div className="social-settings-fields">
            <label className="social-settings-field" htmlFor="support-email">
              <span>Support email</span>
              <input
                id="support-email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
              />
            </label>
            <label className="social-settings-field" htmlFor="support-phone">
              <span>Support phone</span>
              <input
                id="support-phone"
                type="tel"
                autoComplete="tel"
                value={form.support_phone}
                onChange={(event) => updateField('support_phone', event.target.value)}
              />
            </label>
            <label className="social-settings-field" htmlFor="whatsapp-number">
              <span>WhatsApp number</span>
              <input
                id="whatsapp-number"
                type="tel"
                autoComplete="tel"
                value={form.whatsapp_number}
                onChange={(event) => updateField('whatsapp_number', event.target.value)}
              />
            </label>
            <label className="social-settings-field" htmlFor="whatsapp-message">
              <span>Default WhatsApp message</span>
              <textarea
                id="whatsapp-message"
                rows={3}
                value={form.whatsapp_message}
                onChange={(event) => updateField('whatsapp_message', event.target.value)}
              />
            </label>
            <label className="social-settings-toggle" htmlFor="enable-whatsapp">
              <span className="social-settings-toggle-copy">
                <WhatsAppBrandIcon />
                <span>
                  <strong>WhatsApp</strong>
                  <small>Show WhatsApp in the floating contact menu.</small>
                </span>
              </span>
              <input
                id="enable-whatsapp"
                type="checkbox"
                checked={form.enable_whatsapp}
                onChange={(event) => updateField('enable_whatsapp', event.target.checked)}
              />
            </label>
            <label className="social-settings-toggle" htmlFor="enable-email">
              <span className="social-settings-toggle-copy">
                <Mail aria-hidden="true" />
                <span>
                  <strong>Email</strong>
                  <small>Show email in the floating contact menu.</small>
                </span>
              </span>
              <input
                id="enable-email"
                type="checkbox"
                checked={form.enable_email}
                onChange={(event) => updateField('enable_email', event.target.checked)}
              />
            </label>
          </div>
        </section>

        <section className="social-settings-panel" aria-labelledby="social-links-heading">
          <div className="social-settings-panel-heading">
            <h2 id="social-links-heading">Social links</h2>
            <p>Add a URL and enable each network to make it visible to storefront visitors.</p>
          </div>
          <div className="social-settings-network-list">
            {SOCIAL_NETWORKS.map(({ label, urlKey, enabledKey, Icon }) => (
              <article className="social-settings-network" key={urlKey}>
                <div className="social-settings-network-heading">
                  <span>
                    <Icon aria-hidden="true" />
                    <strong>{label}</strong>
                  </span>
                  <label className="social-settings-switch" htmlFor={enabledKey}>
                    <span>Enabled</span>
                    <input
                      id={enabledKey}
                      type="checkbox"
                      checked={form[enabledKey]}
                      onChange={(event) => updateField(enabledKey, event.target.checked)}
                    />
                  </label>
                </div>
                <label className="social-settings-field" htmlFor={urlKey}>
                  <span>{label} URL</span>
                  <input
                    id={urlKey}
                    type="url"
                    inputMode="url"
                    placeholder="https://"
                    value={form[urlKey]}
                    onChange={(event) => updateField(urlKey, event.target.value)}
                  />
                </label>
              </article>
            ))}
          </div>
        </section>

        <div className="social-settings-actions">
          <button
            className="social-settings-button is-secondary"
            type="button"
            disabled={!isDirty || isSaving}
            onClick={() => {
              setForm(toForm(settings));
              setNotice(null);
            }}
          >
            Reset
          </button>
          <button
            className="social-settings-button is-primary"
            type="submit"
            disabled={!isDirty || isSaving}
          >
            {isSaving ? (
              <LoaderCircle className="is-spinning" aria-hidden="true" />
            ) : (
              <Save aria-hidden="true" />
            )}
            {isSaving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </>
  );
}
