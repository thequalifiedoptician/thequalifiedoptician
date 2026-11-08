import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ClipboardList,
  ExternalLink,
  Eye,
  EyeOff,
  House,
  LayoutDashboard,
  LoaderCircle,
  Package,
  Plus,
  RefreshCw,
  Save,
  Send,
  Trash2,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  defaultHomepageContent,
  validateHomepageContent,
  type HomepageCard,
  type HomepageContent,
  type HomepageSection,
  type HomepageSectionKind,
} from './homepageContent';
import {
  loadHomepageDraft,
  loadHomepageProductOptions,
  uploadShopHeroImage,
  saveHomepageDraft,
  type HomepageProductOption,
} from './homepageContentService';
import HomepageContentView from '@/features/catalog/HomepageContentView';
import './homepage-admin.css';

type Notice = { kind: 'success' | 'error'; message: string };
const sectionKinds: { kind: HomepageSectionKind; label: string }[] = [
  { kind: 'categories', label: 'Category cards' },
  { kind: 'collections', label: 'Collection cards' },
  { kind: 'products', label: 'Product cards' },
  { kind: 'benefits', label: 'Benefits cards' },
  { kind: 'brands', label: 'Brand cards' },
  { kind: 'testimonials', label: 'Testimonial cards' },
  { kind: 'stats', label: 'Statistics cards' },
  { kind: 'faq', label: 'FAQ cards' },
  { kind: 'campaign', label: 'Campaign banner' },
];

function createCard(index: number): HomepageCard {
  return {
    id: `new-card-${Date.now()}-${index}`,
    eyebrow: '',
    title: 'New card',
    description: '',
    imageUrl: '',
    imageAlt: '',
    productId: '',
    badge: '',
    actionLabel: '',
    actionHref: '',
    price: '',
    detail: '',
  };
}

function createSection(kind: HomepageSectionKind, index: number): HomepageSection {
  return {
    id: `new-section-${Date.now()}-${index}`,
    kind,
    enabled: true,
    eyebrow: 'A new chapter',
    title: 'A thoughtful new section.',
    description: '',
    actionLabel: '',
    actionHref: '',
    imageUrl: '',
    imageAlt: '',
    cards: kind === 'campaign' ? [] : [createCard(index)],
  };
}

function TextField({
  label,
  value,
  onChange,
  multiline = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange(event.target.value);
  return (
    <label className="homepage-admin-field">
      <span>{label}</span>
      {multiline ? (
        <textarea value={value} onChange={handleChange} placeholder={placeholder} rows={3} />
      ) : (
        <input value={value} onChange={handleChange} placeholder={placeholder} />
      )}
    </label>
  );
}

export default function HomepageAdminPage() {
  const reduceMotion = useReducedMotion();
  const [content, setContent] = useState<HomepageContent | null>(null);
  const [products, setProducts] = useState<HomepageProductOption[]>([]);
  const [newSectionKind, setNewSectionKind] = useState<HomepageSectionKind>('categories');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingShopHero, setIsUploadingShopHero] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const shopHeroInputRef = useRef<HTMLInputElement>(null);

  const loadContent = useCallback(async () => {
    setIsLoading(true);
    setNotice(null);
    try {
      const [draft, catalogProducts] = await Promise.all([
        loadHomepageDraft(),
        loadHomepageProductOptions(),
      ]);
      setContent(draft);
      setProducts(catalogProducts);
    } catch (error) {
      setNotice({
        kind: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Homepage content could not be loaded. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([loadHomepageDraft(), loadHomepageProductOptions()]).then(
      ([draft, catalogProducts]) => {
        if (active) {
          setContent(draft);
          setProducts(catalogProducts);
          setIsLoading(false);
        }
      },
      (error: unknown) => {
        if (active) {
          setNotice({
            kind: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Homepage content could not be loaded. Please try again.',
          });
          setIsLoading(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const updateHero = (key: keyof HomepageContent['hero'], value: string) => {
    setContent((current) => current && { ...current, hero: { ...current.hero, [key]: value } });
  };

  const updateShopHero = (key: keyof HomepageContent['shopHero'], value: string) => {
    setContent(
      (current) => current && { ...current, shopHero: { ...current.shopHero, [key]: value } },
    );
  };

  const handleShopHeroUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsUploadingShopHero(true);
    try {
      const imageUrl = await uploadShopHeroImage(file);
      setContent(
        (current) =>
          current && {
            ...current,
            shopHero: {
              imageUrl,
              imageAlt:
                current.shopHero.imageAlt ||
                file.name.replace(/\.[^.]+$/u, '').replace(/[-_]+/gu, ' '),
            },
          },
      );
      setNotice({
        kind: 'success',
        message: 'Shop banner image uploaded. Publish to show it on the shop page.',
      });
    } catch (error) {
      setNotice({
        kind: 'error',
        message:
          error instanceof Error ? error.message : 'Shop banner image could not be uploaded.',
      });
    } finally {
      setIsUploadingShopHero(false);
    }
  };

  const updateSection = (sectionId: string, updates: Partial<HomepageSection>) => {
    setContent(
      (current) =>
        current && {
          ...current,
          sections: current.sections.map((section) =>
            section.id === sectionId ? { ...section, ...updates } : section,
          ),
        },
    );
  };

  const updateCard = (sectionId: string, cardId: string, updates: Partial<HomepageCard>) => {
    setContent(
      (current) =>
        current && {
          ...current,
          sections: current.sections.map((section) =>
            section.id === sectionId
              ? {
                  ...section,
                  cards: section.cards.map((card) =>
                    card.id === cardId ? { ...card, ...updates } : card,
                  ),
                }
              : section,
          ),
        },
    );
  };

  const moveSection = (sectionIndex: number, offset: -1 | 1) => {
    setContent((current) => {
      if (!current) return current;
      const target = sectionIndex + offset;
      if (target < 0 || target >= current.sections.length) return current;
      const sections = [...current.sections];
      [sections[sectionIndex], sections[target]] = [sections[target], sections[sectionIndex]];
      return { ...current, sections };
    });
  };

  const moveCard = (sectionId: string, cardIndex: number, offset: -1 | 1) => {
    setContent((current) => {
      if (!current) return current;
      const sections = current.sections.map((section) => {
        if (section.id !== sectionId) return section;
        const target = cardIndex + offset;
        if (target < 0 || target >= section.cards.length) return section;
        const cards = [...section.cards];
        [cards[cardIndex], cards[target]] = [cards[target], cards[cardIndex]];
        return { ...section, cards };
      });
      return { ...current, sections };
    });
  };

  const persist = async (publish: boolean) => {
    if (!content) return;
    if (publish) {
      const validationError = validateHomepageContent(content);
      if (validationError) {
        setNotice({ kind: 'error', message: validationError });
        return;
      }
      const unpublishedProduct = content.sections
        .filter((section) => section.enabled)
        .flatMap((section) => section.cards)
        .find(
          (card) =>
            card.productId &&
            !products.some(
              (product) => product.id === card.productId && product.status === 'active',
            ),
        );
      if (unpublishedProduct) {
        setNotice({
          kind: 'error',
          message: `Select an active catalog product for "${unpublishedProduct.title}" before publishing.`,
        });
        return;
      }
    }
    setIsSaving(true);
    setNotice(null);
    try {
      await saveHomepageDraft(content, publish);
      setNotice({
        kind: 'success',
        message: publish
          ? 'Homepage changes are live.'
          : 'Draft saved. Publish when you are ready for it to go live.',
      });
    } catch (error) {
      setNotice({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Homepage changes could not be saved.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addSection = () => {
    setContent(
      (current) =>
        current && {
          ...current,
          sections: [...current.sections, createSection(newSectionKind, current.sections.length)],
        },
    );
  };

  const resetToDefaults = () => {
    setContent(structuredClone(defaultHomepageContent));
    setNotice({
      kind: 'success',
      message: 'Default content restored in this editor. Save or publish to apply it.',
    });
  };

  return (
    <main className="admin-homepage">
      <header className="admin-topbar">
        <Link className="admin-brand" to="/" aria-label="AlSera home">
          <span className="admin-brand-mark">A</span>
          <span>
            <strong>AlSera</strong>
            <small>Commerce studio</small>
          </span>
        </Link>
        <div className="admin-topbar-navigation">
          <span className="admin-console-label">
            <LayoutDashboard size={14} aria-hidden="true" />
            <span>ADMIN CONSOLE</span>
          </span>
          <nav className="admin-topbar-links" aria-label="Admin navigation">
            <Link className="admin-topbar-link is-active" to="/admin/homepage" aria-current="page">
              <House size={16} aria-hidden="true" />
              <span>Homepage</span>
            </Link>
            <Link className="admin-topbar-link" to="/admin/products">
              <Package size={16} aria-hidden="true" />
              <span>Products</span>
            </Link>
            <Link className="admin-topbar-link" to="/admin/orders">
              <ClipboardList size={16} aria-hidden="true" />
              <span>Orders</span>
            </Link>
            <Link className="admin-topbar-link admin-topbar-storefront" to="/">
              <ExternalLink size={15} aria-hidden="true" />
              <span>Storefront</span>
            </Link>
          </nav>
        </div>
      </header>

      <div className="homepage-admin-content">
        <motion.header
          className="homepage-admin-heading"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div>
            <p className="admin-eyebrow">STOREFRONT CONTENT</p>
            <h1>Homepage studio</h1>
            <p>
              Edit the hero, banners, sections, and every card. Save a draft or publish the complete
              page.
            </p>
          </div>
          <div className="homepage-admin-actions">
            <button
              type="button"
              className="homepage-admin-secondary"
              onClick={() => setShowPreview((value) => !value)}
            >
              <Eye size={16} aria-hidden="true" />
              {showPreview ? 'Hide preview' : 'Preview'}
            </button>
            <button
              type="button"
              className="homepage-admin-secondary"
              onClick={resetToDefaults}
              disabled={isLoading || isSaving}
            >
              Restore defaults
            </button>
            <button
              type="button"
              className="homepage-admin-secondary"
              onClick={() => void persist(false)}
              disabled={!content || isLoading || isSaving}
            >
              {isSaving ? (
                <LoaderCircle className="homepage-admin-spinner" size={16} aria-hidden="true" />
              ) : (
                <Save size={16} aria-hidden="true" />
              )}
              Save draft
            </button>
            <button
              type="button"
              className="homepage-admin-primary"
              onClick={() => void persist(true)}
              disabled={!content || isLoading || isSaving}
            >
              {isSaving ? (
                <LoaderCircle className="homepage-admin-spinner" size={16} aria-hidden="true" />
              ) : (
                <Send size={16} aria-hidden="true" />
              )}
              Publish
            </button>
          </div>
        </motion.header>

        <AnimatePresence>
          {notice && (
            <motion.p
              className={`homepage-admin-notice is-${notice.kind}`}
              role={notice.kind === 'error' ? 'alert' : 'status'}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {notice.kind === 'error' && <AlertCircle size={17} aria-hidden="true" />}
              {notice.message}
              {notice.kind === 'error' && (
                <button type="button" onClick={() => void loadContent()}>
                  <RefreshCw size={14} />
                  Retry
                </button>
              )}
            </motion.p>
          )}
        </AnimatePresence>

        {isLoading ? (
          <div className="homepage-admin-loading" role="status">
            <LoaderCircle className="homepage-admin-spinner" />
            Loading homepage content…
          </div>
        ) : content ? (
          <>
            <section className="homepage-admin-panel">
              <div className="homepage-admin-panel-heading">
                <span className="homepage-admin-number">01</span>
                <div>
                  <h2>Hero banner</h2>
                  <p>The first message and artwork visitors see.</p>
                </div>
              </div>
              <div className="homepage-admin-fields">
                <TextField
                  label="Eyebrow"
                  value={content.hero.eyebrow}
                  onChange={(value) => updateHero('eyebrow', value)}
                />
                <TextField
                  label="Main heading"
                  value={content.hero.title}
                  onChange={(value) => updateHero('title', value)}
                />
                <TextField
                  label="Description"
                  value={content.hero.description}
                  onChange={(value) => updateHero('description', value)}
                  multiline
                />
                <TextField
                  label="Signature line"
                  value={content.hero.signature}
                  onChange={(value) => updateHero('signature', value)}
                />
                <TextField
                  label="Artwork image URL"
                  value={content.hero.imageUrl}
                  onChange={(value) => updateHero('imageUrl', value)}
                />
                <TextField
                  label="Artwork alt text"
                  value={content.hero.imageAlt}
                  onChange={(value) => updateHero('imageAlt', value)}
                />
                <TextField
                  label="Primary button label"
                  value={content.hero.primaryLabel}
                  onChange={(value) => updateHero('primaryLabel', value)}
                />
                <TextField
                  label="Primary button link"
                  value={content.hero.primaryHref}
                  onChange={(value) => updateHero('primaryHref', value)}
                />
                <TextField
                  label="Secondary button label"
                  value={content.hero.secondaryLabel}
                  onChange={(value) => updateHero('secondaryLabel', value)}
                />
                <TextField
                  label="Secondary button link"
                  value={content.hero.secondaryHref}
                  onChange={(value) => updateHero('secondaryHref', value)}
                />
              </div>
            </section>

            <section className="homepage-admin-panel">
              <div className="homepage-admin-panel-heading">
                <span className="homepage-admin-number">02</span>
                <div>
                  <h2>Shop page banner image</h2>
                  <p>Upload the artwork shown in the first banner on the shop page.</p>
                </div>
              </div>
              <div className="homepage-admin-shop-artwork">
                <div className="homepage-admin-shop-artwork-preview">
                  {content.shopHero.imageUrl ? (
                    <img src={content.shopHero.imageUrl} alt={content.shopHero.imageAlt} />
                  ) : (
                    <span>Current AlSera artwork will be used until an image is added.</span>
                  )}
                </div>
                <div className="homepage-admin-shop-artwork-controls">
                  <input
                    ref={shopHeroInputRef}
                    className="homepage-admin-file-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    aria-label="Upload shop banner image"
                    onChange={(event) => void handleShopHeroUpload(event)}
                  />
                  <button
                    type="button"
                    className="homepage-admin-secondary"
                    disabled={isUploadingShopHero}
                    onClick={() => shopHeroInputRef.current?.click()}
                  >
                    {isUploadingShopHero ? (
                      <LoaderCircle className="homepage-admin-spinner" size={15} />
                    ) : (
                      <Upload size={15} aria-hidden="true" />
                    )}
                    {isUploadingShopHero ? 'Uploading image…' : 'Upload image'}
                  </button>
                  {content.shopHero.imageUrl && (
                    <button
                      type="button"
                      className="homepage-admin-secondary"
                      disabled={isUploadingShopHero}
                      onClick={() => {
                        updateShopHero('imageUrl', '');
                        updateShopHero('imageAlt', '');
                      }}
                    >
                      Remove image
                    </button>
                  )}
                  <p>
                    JPG, PNG, WebP, or AVIF · up to 10 MB. Publish to show it publicly; saving
                    stores it as a draft.
                  </p>
                  <Link className="homepage-admin-shop-preview-link" to="/shop" target="_blank">
                    View published shop page <ExternalLink size={14} aria-hidden="true" />
                  </Link>
                </div>
              </div>
              {content.shopHero.imageUrl && (
                <div className="homepage-admin-fields homepage-admin-shop-artwork-alt">
                  <TextField
                    label="Image alternative text"
                    value={content.shopHero.imageAlt}
                    onChange={(value) => updateShopHero('imageAlt', value)}
                    placeholder="Describe the banner image for screen readers"
                  />
                </div>
              )}
            </section>

            <div className="homepage-admin-section-list">
              {content.sections.map((section, sectionIndex) => (
                <section
                  className={`homepage-admin-panel${section.enabled ? '' : ' is-disabled'}`}
                  key={section.id}
                >
                  <div className="homepage-admin-panel-heading homepage-admin-section-heading">
                    <span className="homepage-admin-number">
                      {String(sectionIndex + 3).padStart(2, '0')}
                    </span>
                    <div className="homepage-admin-section-title">
                      <h2>{section.title || 'Untitled section'}</h2>
                      <p>
                        {sectionKinds.find(({ kind }) => kind === section.kind)?.label} ·{' '}
                        {section.cards.length} cards
                      </p>
                    </div>
                    <div className="homepage-admin-row-actions">
                      <button
                        type="button"
                        aria-label="Move section up"
                        title="Move up"
                        disabled={sectionIndex === 0}
                        onClick={() => moveSection(sectionIndex, -1)}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        type="button"
                        aria-label="Move section down"
                        title="Move down"
                        disabled={sectionIndex === content.sections.length - 1}
                        onClick={() => moveSection(sectionIndex, 1)}
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button
                        type="button"
                        aria-label={section.enabled ? 'Hide section' : 'Show section'}
                        title={section.enabled ? 'Hide section' : 'Show section'}
                        onClick={() => updateSection(section.id, { enabled: !section.enabled })}
                      >
                        {section.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <button
                        type="button"
                        className="is-danger"
                        aria-label="Delete section"
                        title="Delete section"
                        onClick={() =>
                          setContent(
                            (current) =>
                              current && {
                                ...current,
                                sections: current.sections.filter(({ id }) => id !== section.id),
                              },
                          )
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="homepage-admin-fields">
                    <TextField
                      label="Section eyebrow"
                      value={section.eyebrow}
                      onChange={(value) => updateSection(section.id, { eyebrow: value })}
                    />
                    <TextField
                      label="Section heading"
                      value={section.title}
                      onChange={(value) => updateSection(section.id, { title: value })}
                    />
                    <TextField
                      label="Section description"
                      value={section.description}
                      onChange={(value) => updateSection(section.id, { description: value })}
                      multiline
                    />
                    <TextField
                      label="Section button label"
                      value={section.actionLabel}
                      onChange={(value) => updateSection(section.id, { actionLabel: value })}
                    />
                    <TextField
                      label="Section button link"
                      value={section.actionHref}
                      onChange={(value) => updateSection(section.id, { actionHref: value })}
                    />
                    {section.kind === 'campaign' && (
                      <>
                        <TextField
                          label="Banner image URL"
                          value={section.imageUrl}
                          onChange={(value) => updateSection(section.id, { imageUrl: value })}
                        />
                        <TextField
                          label="Banner image alt text"
                          value={section.imageAlt}
                          onChange={(value) => updateSection(section.id, { imageAlt: value })}
                        />
                      </>
                    )}
                  </div>
                  {section.cards.map((card, cardIndex) => (
                    <details className="homepage-admin-card-editor" key={card.id}>
                      <summary>
                        <span>
                          <strong>{String(cardIndex + 1).padStart(2, '0')}</strong>
                          {card.title || 'Untitled card'}
                        </span>
                        <span className="homepage-admin-row-actions">
                          <span role="presentation" onClick={(event) => event.preventDefault()}>
                            <button
                              type="button"
                              aria-label="Move card up"
                              title="Move up"
                              disabled={cardIndex === 0}
                              onClick={() => moveCard(section.id, cardIndex, -1)}
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              type="button"
                              aria-label="Move card down"
                              title="Move down"
                              disabled={cardIndex === section.cards.length - 1}
                              onClick={() => moveCard(section.id, cardIndex, 1)}
                            >
                              <ArrowDown size={14} />
                            </button>
                            <button
                              type="button"
                              className="is-danger"
                              aria-label="Delete card"
                              title="Delete card"
                              onClick={() =>
                                updateSection(section.id, {
                                  cards: section.cards.filter(({ id }) => id !== card.id),
                                })
                              }
                            >
                              <Trash2 size={14} />
                            </button>
                          </span>
                        </span>
                      </summary>
                      <div className="homepage-admin-fields">
                        {section.kind === 'products' && (
                          <label className="homepage-admin-field">
                            <span>Catalog product</span>
                            <select
                              value={card.productId}
                              onChange={(event) => {
                                const product = products.find(
                                  ({ id }) => id === event.target.value,
                                );
                                updateCard(section.id, card.id, {
                                  productId: product?.id ?? '',
                                  ...(product
                                    ? {
                                        title: product.name,
                                        description: product.short_description ?? '',
                                        imageUrl: product.thumbnail_url ?? '',
                                        imageAlt: product.thumbnail_url ? product.name : '',
                                        price: `$${Number(product.price).toFixed(2)}`,
                                        actionLabel: 'View product',
                                        actionHref: `/shop/${encodeURIComponent(product.slug)}`,
                                      }
                                    : {}),
                                });
                              }}
                            >
                              <option value="">Custom content</option>
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name} · {product.status}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        <TextField
                          label="Card eyebrow / category"
                          value={card.eyebrow}
                          onChange={(value) => updateCard(section.id, card.id, { eyebrow: value })}
                        />
                        <TextField
                          label="Card title"
                          value={card.title}
                          onChange={(value) => updateCard(section.id, card.id, { title: value })}
                        />
                        <TextField
                          label="Card description"
                          value={card.description}
                          onChange={(value) =>
                            updateCard(section.id, card.id, { description: value })
                          }
                          multiline
                        />
                        <TextField
                          label="Image URL"
                          value={card.imageUrl}
                          onChange={(value) => updateCard(section.id, card.id, { imageUrl: value })}
                        />
                        <TextField
                          label="Image alt text"
                          value={card.imageAlt}
                          onChange={(value) => updateCard(section.id, card.id, { imageAlt: value })}
                        />
                        <TextField
                          label="Badge"
                          value={card.badge}
                          onChange={(value) => updateCard(section.id, card.id, { badge: value })}
                        />
                        <TextField
                          label="Price / statistic"
                          value={card.price}
                          onChange={(value) => updateCard(section.id, card.id, { price: value })}
                        />
                        <TextField
                          label="Extra detail"
                          value={card.detail}
                          onChange={(value) => updateCard(section.id, card.id, { detail: value })}
                        />
                        <TextField
                          label="Button label"
                          value={card.actionLabel}
                          onChange={(value) =>
                            updateCard(section.id, card.id, { actionLabel: value })
                          }
                        />
                        <TextField
                          label="Button link"
                          value={card.actionHref}
                          onChange={(value) =>
                            updateCard(section.id, card.id, { actionHref: value })
                          }
                        />
                      </div>
                    </details>
                  ))}
                  {section.kind !== 'campaign' && (
                    <button
                      type="button"
                      className="homepage-admin-add-card"
                      onClick={() =>
                        updateSection(section.id, {
                          cards: [...section.cards, createCard(section.cards.length)],
                        })
                      }
                    >
                      <Plus size={15} aria-hidden="true" />
                      Add card
                    </button>
                  )}
                </section>
              ))}
            </div>
            <div className="homepage-admin-add-section">
              <label>
                <span>Add a section</span>
                <select
                  value={newSectionKind}
                  onChange={(event) => setNewSectionKind(event.target.value as HomepageSectionKind)}
                >
                  {sectionKinds.map(({ kind, label }) => (
                    <option value={kind} key={kind}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="homepage-admin-primary" onClick={addSection}>
                <Plus size={16} />
                Add section
              </button>
            </div>
            {showPreview && (
              <section className="homepage-admin-preview">
                <header>
                  <div>
                    <h2>Draft preview</h2>
                    <p>This is how enabled sections and cards will appear.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPreview(false)}
                    aria-label="Close preview"
                  >
                    ×
                  </button>
                </header>
                <HomepageContentView content={content} />
              </section>
            )}
          </>
        ) : (
          <div className="homepage-admin-empty">
            <p>
              Homepage content is unavailable. Check that the homepage content migration has been
              applied.
            </p>
            <button
              type="button"
              className="homepage-admin-secondary"
              onClick={() => void loadContent()}
            >
              <RefreshCw size={15} />
              Reload
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
