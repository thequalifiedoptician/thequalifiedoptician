import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  Eye,
  ImagePlus,
  LayoutDashboard,
  LoaderCircle,
  Save,
  Settings,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBrandSettings } from '@/features/brand/brandSettingsContext';
import AboutPageContentView from '@/features/about/AboutPageContentView';
import {
  defaultAboutPageContent,
  validateAboutPageContent,
  type AboutPageContent,
} from '@/features/about/aboutContent';
import { loadAboutPageDraft, saveAboutPageDraft, uploadAboutImage } from '@/features/about/aboutService';
import './about-admin.css';

type Notice = { tone: 'success' | 'error'; message: string };
type ImageSection = 'hero' | 'story';

function TextField({
  label,
  value,
  onChange,
  multiline = false,
  maxLength,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  maxLength?: number;
  rows?: number;
}) {
  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange(event.target.value);
  return (
    <label className="about-admin-field">
      <span>{label}</span>
      {multiline ? (
        <textarea value={value} onChange={handleChange} maxLength={maxLength} rows={rows} />
      ) : (
        <input value={value} onChange={handleChange} maxLength={maxLength} />
      )}
    </label>
  );
}

export default function AboutAdminPage() {
  const { settings: brand } = useBrandSettings();
  const [content, setContent] = useState<AboutPageContent | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<ImageSection | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const heroImageRef = useRef<HTMLInputElement>(null);
  const storyImageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    void loadAboutPageDraft().then(
      (draft) => {
        if (active) {
          setContent(draft);
          setNotice(null);
          setIsLoading(false);
        }
      },
      (error: unknown) => {
        if (active) {
          setNotice({
            tone: 'error',
            message:
              error instanceof Error ? error.message : 'About page draft could not be loaded.',
          });
          setIsLoading(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const updateHero = (key: keyof AboutPageContent['hero'], value: string) => {
    setContent((current) =>
      current ? { ...current, hero: { ...current.hero, [key]: value } } : current,
    );
    setNotice(null);
  };

  const updateStory = (key: keyof AboutPageContent['story'], value: string) => {
    setContent((current) =>
      current ? { ...current, story: { ...current.story, [key]: value } } : current,
    );
    setNotice(null);
  };

  const updateValue = (index: number, key: 'title' | 'description', value: string) => {
    setContent((current) =>
      current
        ? {
            ...current,
            values: current.values.map((item, itemIndex) =>
              itemIndex === index ? { ...item, [key]: value } : item,
            ),
          }
        : current,
    );
    setNotice(null);
  };

  const handleImageUpload = async (
    section: ImageSection,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    setUploadingImage(section);
    setNotice(null);
    try {
      const uploaded = await uploadAboutImage(file);
      if (section === 'hero') {
        setContent((current) =>
          current
            ? {
                ...current,
                hero: {
                  ...current.hero,
                  imagePath: uploaded.path,
                  imageUrl: uploaded.url,
                  imageAlt:
                    current.hero.imageAlt ||
                    file.name.replace(/\.[^.]+$/u, '').replace(/[-_]+/gu, ' '),
                },
              }
            : current,
        );
      } else {
        setContent((current) =>
          current
            ? {
                ...current,
                story: {
                  ...current.story,
                  imagePath: uploaded.path,
                  imageUrl: uploaded.url,
                  imageAlt:
                    current.story.imageAlt ||
                    file.name.replace(/\.[^.]+$/u, '').replace(/[-_]+/gu, ' '),
                },
              }
            : current,
        );
      }
    } catch (error) {
      setNotice({
        tone: 'error',
        message: error instanceof Error ? error.message : 'About page image could not be uploaded.',
      });
    } finally {
      setUploadingImage(null);
    }
  };

  const handleSave = async (publish: boolean) => {
    if (!content) return;
    const validationError = validateAboutPageContent(content);
    if (validationError) {
      setNotice({ tone: 'error', message: validationError });
      return;
    }

    setIsSaving(true);
    setNotice(null);
    try {
      await saveAboutPageDraft(content, publish);
      setNotice({
        tone: 'success',
        message: publish
          ? 'About page published. The storefront now shows these changes.'
          : 'About page draft saved. Publish it when it is ready.',
      });
    } catch (error) {
      setNotice({
        tone: 'error',
        message: error instanceof Error ? error.message : 'About page could not be saved.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    setContent(structuredClone(defaultAboutPageContent));
    setNotice({ tone: 'success', message: 'Default content restored here. Save or publish to apply it.' });
  };

  const isBusy = isSaving || uploadingImage !== null;

  return (
    <main className="about-admin">
      <header className="about-admin-topbar">
        <Link className="about-admin-brand" to="/" aria-label={`${brand.brand_name} home`}>
          <span className="about-admin-brand-mark">
            {brand.logo_url ? <img src={brand.logo_url} alt="" /> : brand.brand_name.charAt(0)}
          </span>
          <span>
            <strong>{brand.brand_name}</strong>
            <small>{brand.brand_tagline || 'Admin console'}</small>
          </span>
        </Link>
        <nav className="about-admin-nav" aria-label="Admin navigation">
          <Link to="/admin/homepage">Homepage</Link>
          <Link to="/admin/deals">Deals</Link>
          <Link className="is-active" to="/admin/about" aria-current="page">
            About
          </Link>
          <Link to="/admin/settings/brand">
            <Settings size={14} aria-hidden="true" /> Settings
          </Link>
          <Link className="about-admin-storefront" to="/about">
            <ExternalLink size={14} aria-hidden="true" /> View About page
          </Link>
        </nav>
      </header>

      <div className="about-admin-content">
        <Link className="about-admin-back" to="/admin/homepage">
          <ArrowLeft size={15} aria-hidden="true" /> Admin dashboard
        </Link>
        <header className="about-admin-heading">
          <div>
            <p>STOREFRONT CONTENT</p>
            <h1>About page</h1>
            <span>Edit the story, imagery, and values shown to your customers.</span>
          </div>
          <div className="about-admin-actions">
            <button
              type="button"
              className="about-admin-secondary"
              onClick={() => setShowPreview((visible) => !visible)}
              disabled={!content}
            >
              <Eye size={15} aria-hidden="true" /> {showPreview ? 'Hide preview' : 'Preview'}
            </button>
            <button
              type="button"
              className="about-admin-secondary"
              onClick={() => void handleSave(false)}
              disabled={!content || isBusy}
            >
              {isSaving ? <LoaderCircle className="about-admin-spinner" size={15} /> : <Save size={15} />}
              Save draft
            </button>
            <button
              type="button"
              className="about-admin-primary"
              onClick={() => void handleSave(true)}
              disabled={!content || isBusy}
            >
              {isSaving ? <LoaderCircle className="about-admin-spinner" size={15} /> : <Sparkles size={15} />}
              Publish
            </button>
          </div>
        </header>

        {notice && (
          <p className={`about-admin-notice about-admin-notice--${notice.tone}`} role="status">
            {notice.message}
          </p>
        )}

        {isLoading ? (
          <div className="about-admin-loading" role="status">
            <LoaderCircle size={20} className="about-admin-spinner" /> Loading About page draft…
          </div>
        ) : !content ? (
          <section className="about-admin-load-error" role="alert">
            <p>The editor could not load its content. Check that the About page migration is applied.</p>
            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                setReloadKey((key) => key + 1);
              }}
            >
              Try again
            </button>
          </section>
        ) : (
          <>
            <div className="about-admin-guidance">
              Draft saves are private to admins. Publishing updates the public About page.
            </div>

            <section className="about-admin-card" aria-labelledby="about-hero-editor">
              <header className="about-admin-card-heading">
                <div>
                  <p>01 · FIRST IMPRESSION</p>
                  <h2 id="about-hero-editor">Hero section</h2>
                </div>
              </header>
              <div className="about-admin-grid">
                <TextField
                  label="Eyebrow"
                  value={content.hero.eyebrow}
                  onChange={(value) => updateHero('eyebrow', value)}
                  maxLength={100}
                />
                <TextField
                  label="Heading"
                  value={content.hero.title}
                  onChange={(value) => updateHero('title', value)}
                  maxLength={120}
                />
                <TextField
                  label="Introduction"
                  value={content.hero.description}
                  onChange={(value) => updateHero('description', value)}
                  multiline
                  maxLength={600}
                  rows={4}
                />
                <div className="about-admin-field about-admin-field--wide">
                  <span>Hero image</span>
                  <label className="about-admin-upload">
                    <ImagePlus size={17} aria-hidden="true" />
                    {uploadingImage === 'hero' ? 'Uploading…' : 'Choose image'}
                    <input
                      ref={heroImageRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      disabled={isBusy}
                      onChange={(event) => void handleImageUpload('hero', event)}
                    />
                  </label>
                  <small>JPG, PNG, WebP, or AVIF · up to 10 MB</small>
                  {content.hero.imageUrl && (
                    <img
                      className="about-admin-image-preview"
                      src={content.hero.imageUrl}
                      alt={content.hero.imageAlt || 'Hero image preview'}
                    />
                  )}
                  {content.hero.imageUrl && (
                    <button
                      type="button"
                      className="about-admin-text-button"
                      onClick={() => {
                        updateHero('imagePath', '');
                        updateHero('imageUrl', '');
                        updateHero('imageAlt', '');
                      }}
                    >
                      Remove image
                    </button>
                  )}
                </div>
                <TextField
                  label="Image description (alt text)"
                  value={content.hero.imageAlt}
                  onChange={(value) => updateHero('imageAlt', value)}
                  maxLength={200}
                />
              </div>
            </section>

            <section className="about-admin-card" aria-labelledby="about-story-editor">
              <header className="about-admin-card-heading">
                <div>
                  <p>02 · THE STORY</p>
                  <h2 id="about-story-editor">Our story</h2>
                </div>
              </header>
              <div className="about-admin-grid">
                <TextField
                  label="Eyebrow"
                  value={content.story.eyebrow}
                  onChange={(value) => updateStory('eyebrow', value)}
                  maxLength={100}
                />
                <TextField
                  label="Heading"
                  value={content.story.title}
                  onChange={(value) => updateStory('title', value)}
                  maxLength={120}
                />
                <TextField
                  label="Story text"
                  value={content.story.body}
                  onChange={(value) => updateStory('body', value)}
                  multiline
                  maxLength={1800}
                  rows={7}
                />
                <div className="about-admin-field about-admin-field--wide">
                  <span>Story image</span>
                  <label className="about-admin-upload">
                    <ImagePlus size={17} aria-hidden="true" />
                    {uploadingImage === 'story' ? 'Uploading…' : 'Choose image'}
                    <input
                      ref={storyImageRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      disabled={isBusy}
                      onChange={(event) => void handleImageUpload('story', event)}
                    />
                  </label>
                  <small>JPG, PNG, WebP, or AVIF · up to 10 MB</small>
                  {content.story.imageUrl && (
                    <img
                      className="about-admin-image-preview"
                      src={content.story.imageUrl}
                      alt={content.story.imageAlt || 'Story image preview'}
                    />
                  )}
                  {content.story.imageUrl && (
                    <button
                      type="button"
                      className="about-admin-text-button"
                      onClick={() => {
                        updateStory('imagePath', '');
                        updateStory('imageUrl', '');
                        updateStory('imageAlt', '');
                      }}
                    >
                      Remove image
                    </button>
                  )}
                </div>
                <TextField
                  label="Image description (alt text)"
                  value={content.story.imageAlt}
                  onChange={(value) => updateStory('imageAlt', value)}
                  maxLength={200}
                />
              </div>
            </section>

            <section className="about-admin-card" aria-labelledby="about-values-editor">
              <header className="about-admin-card-heading">
                <div>
                  <p>03 · WHAT MATTERS</p>
                  <h2 id="about-values-editor">Our values</h2>
                </div>
              </header>
              <div className="about-admin-values">
                {content.values.map((value, index) => (
                  <div className="about-admin-value" key={index}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <TextField
                      label="Value title"
                      value={value.title}
                      onChange={(next) => updateValue(index, 'title', next)}
                      maxLength={80}
                    />
                    <TextField
                      label="Description"
                      value={value.description}
                      onChange={(next) => updateValue(index, 'description', next)}
                      multiline
                      maxLength={300}
                      rows={3}
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="about-admin-card" aria-labelledby="about-closing-editor">
              <header className="about-admin-card-heading">
                <div>
                  <p>04 · INVITATION</p>
                  <h2 id="about-closing-editor">Closing section</h2>
                </div>
              </header>
              <div className="about-admin-grid">
                <TextField
                  label="Heading"
                  value={content.closing.title}
                  onChange={(value) =>
                    setContent((current) =>
                      current ? { ...current, closing: { ...current.closing, title: value } } : current,
                    )
                  }
                  maxLength={120}
                />
                <TextField
                  label="Description"
                  value={content.closing.description}
                  onChange={(value) =>
                    setContent((current) =>
                      current
                        ? { ...current, closing: { ...current.closing, description: value } }
                        : current,
                    )
                  }
                  multiline
                  maxLength={400}
                  rows={3}
                />
              </div>
            </section>

            <div className="about-admin-footer-actions">
              <button type="button" className="about-admin-text-button" onClick={resetToDefaults}>
                Restore default content
              </button>
              <div>
                <button
                  type="button"
                  className="about-admin-secondary"
                  onClick={() => void handleSave(false)}
                  disabled={isBusy}
                >
                  <Save size={15} aria-hidden="true" /> Save draft
                </button>
                <button
                  type="button"
                  className="about-admin-primary"
                  onClick={() => void handleSave(true)}
                  disabled={isBusy}
                >
                  <Sparkles size={15} aria-hidden="true" /> Publish
                </button>
              </div>
            </div>

            {showPreview && (
              <section className="about-admin-preview" aria-label="About page preview">
                <AboutPageContentView content={content} />
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
