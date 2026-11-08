import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import {
  deleteBrand,
  deleteCategory,
  saveBrand,
  saveCategory,
  setBrandActive,
  setCategoryActive,
  type BrandEditorInput,
  type CatalogBrand,
  type CatalogCategory,
  type CatalogProduct,
  type CategoryEditorInput,
} from './productService';

type Props = {
  kind: 'categories' | 'brands';
  categories: CatalogCategory[];
  brands: CatalogBrand[];
  products: CatalogProduct[];
  onChanged: () => Promise<boolean>;
};

type EditorState =
  { kind: 'category'; value: CategoryEditorInput } | { kind: 'brand'; value: BrandEditorInput };

type Notice = { kind: 'success' | 'error'; message: string };

function makeSlug(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function blankEditor(kind: Props['kind']): EditorState {
  return kind === 'categories'
    ? {
        kind: 'category',
        value: {
          id: null,
          parentId: null,
          name: '',
          slug: '',
          description: '',
          imageUrl: '',
          isActive: true,
          sortOrder: 0,
        },
      }
    : {
        kind: 'brand',
        value: {
          id: null,
          name: '',
          slug: '',
          description: '',
          logoUrl: '',
          isActive: true,
        },
      };
}

export default function CatalogTaxonomyPanel({
  kind,
  categories,
  brands,
  products,
  onChanged,
}: Props) {
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CatalogCategory | CatalogBrand | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'hidden'>('all');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isCategory = kind === 'categories';

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (editor || pendingDelete) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [editor, pendingDelete]);

  const productCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      const id = isCategory ? product.category_id : product.brand_id;
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }, [isCategory, products]);

  const editCategory = (category?: CatalogCategory) => {
    setNotice(null);
    setEditor(
      category
        ? {
            kind: 'category',
            value: {
              id: category.id,
              parentId: category.parent_id,
              name: category.name,
              slug: category.slug,
              description: category.description ?? '',
              imageUrl: category.image_url ?? '',
              isActive: category.is_active,
              sortOrder: category.sort_order,
            },
          }
        : blankEditor('categories'),
    );
  };

  const editBrand = (brand?: CatalogBrand) => {
    setNotice(null);
    setEditor(
      brand
        ? {
            kind: 'brand',
            value: {
              id: brand.id,
              name: brand.name,
              slug: brand.slug,
              description: brand.description ?? '',
              logoUrl: brand.logo_url ?? '',
              isActive: brand.is_active,
            },
          }
        : blankEditor('brands'),
    );
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor) return;
    setIsSaving(true);
    setNotice(null);
    try {
      const client = await getSupabaseClient();
      if (editor.kind === 'category') {
        await saveCategory(client, editor.value);
      } else {
        await saveBrand(client, editor.value);
      }
      setEditor(null);
      if (await onChanged()) {
        setNotice({
          kind: 'success',
          message: `${editor.kind === 'category' ? 'Category' : 'Brand'} saved successfully.`,
        });
      }
    } catch (error) {
      setNotice({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Catalog details could not be saved.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    setNotice(null);
    try {
      const client = await getSupabaseClient();
      if (isCategory) {
        await deleteCategory(client, pendingDelete.id);
      } else {
        await deleteBrand(client, pendingDelete.id);
      }
      setPendingDelete(null);
      if (await onChanged()) {
        setNotice({
          kind: 'success',
          message: `${isCategory ? 'Category' : 'Brand'} deleted. Products remain in the catalog.`,
        });
      }
    } catch (error) {
      setNotice({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Catalog item could not be deleted.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async (item: CatalogCategory | CatalogBrand) => {
    const active = !item.is_active;
    setUpdatingId(item.id);
    setNotice(null);
    try {
      const client = await getSupabaseClient();
      if (isCategory) {
        await setCategoryActive(client, item.id, active);
      } else {
        await setBrandActive(client, item.id, active);
      }
      if (await onChanged()) {
        setNotice({
          kind: 'success',
          message: `${item.name} is now ${active ? 'visible' : 'hidden'}.`,
        });
      }
    } catch (error) {
      setNotice({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Visibility could not be updated.',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const categoriesToRender = [...categories].sort(
    (first, second) =>
      first.sort_order - second.sort_order || first.name.localeCompare(second.name),
  );
  const brandsToRender = [...brands].sort((first, second) => first.name.localeCompare(second.name));
  const itemCount = isCategory ? categories.length : brands.length;
  const query = search.trim().toLowerCase();
  const filteredItems = (isCategory ? categoriesToRender : brandsToRender).filter((item) => {
    const matchesSearch =
      !query || item.name.toLowerCase().includes(query) || item.slug.toLowerCase().includes(query);
    const matchesStatus =
      statusFilter === 'all' || (statusFilter === 'active' ? item.is_active : !item.is_active);
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      {notice && (
        <div
          className={`admin-notice admin-notice--${notice.kind}`}
          role={notice.kind === 'error' ? 'alert' : 'status'}
        >
          {notice.kind === 'success' ? (
            <Check size={17} aria-hidden="true" />
          ) : (
            <AlertCircle size={17} aria-hidden="true" />
          )}
          <span>{notice.message}</span>
          <button type="button" aria-label="Dismiss notification" onClick={() => setNotice(null)}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      <section className="admin-product-panel" aria-labelledby={`${kind}-heading`}>
        <div className="admin-panel-header catalog-taxonomy-header">
          <div>
            <h2 id={`${kind}-heading`}>{isCategory ? 'Category library' : 'Brand library'}</h2>
            <p>
              {itemCount} {isCategory ? 'categories' : 'brands'} ·{' '}
              {isCategory
                ? 'organize the storefront and shop filters'
                : 'manage the brands shown across your catalog'}
            </p>
          </div>
          <button
            type="button"
            className="admin-primary-button"
            onClick={() => (isCategory ? editCategory() : editBrand())}
          >
            <Plus size={17} aria-hidden="true" />
            Add {isCategory ? 'category' : 'brand'}
          </button>
        </div>

        {itemCount > 0 && (
          <div className="catalog-taxonomy-tools">
            <label className="admin-search">
              <Search size={17} aria-hidden="true" />
              <span className="visually-hidden">Search {kind}</span>
              <input
                type="search"
                placeholder={`Search ${kind}`}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <label className="admin-select-wrap">
              <span className="visually-hidden">Filter by visibility</span>
              <select
                value={statusFilter}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === 'all' || value === 'active' || value === 'hidden') {
                    setStatusFilter(value);
                  }
                }}
              >
                <option value="all">All visibility</option>
                <option value="active">Active</option>
                <option value="hidden">Hidden</option>
              </select>
            </label>
          </div>
        )}

        {itemCount === 0 ? (
          <div className="admin-empty">
            <span>
              <Tag size={23} aria-hidden="true" />
            </span>
            <h3>No {isCategory ? 'categories' : 'brands'} yet</h3>
            <p>
              Add your first {isCategory ? 'category' : 'brand'} to use it when creating products.
            </p>
            <button
              className="admin-primary-button"
              type="button"
              onClick={() => (isCategory ? editCategory() : editBrand())}
            >
              <Plus size={17} aria-hidden="true" /> Add {isCategory ? 'category' : 'brand'}
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="admin-empty">
            <span>
              <Search size={22} aria-hidden="true" />
            </span>
            <h3>No matching {kind}</h3>
            <p>Try another search or visibility filter.</p>
          </div>
        ) : (
          <div className="catalog-taxonomy-grid">
            {filteredItems.map((item) => {
              const category = isCategory ? (item as CatalogCategory) : null;
              const brand = isCategory ? null : (item as CatalogBrand);
              const linkedProducts = productCounts.get(item.id) ?? 0;
              const active = category?.is_active ?? brand?.is_active ?? false;
              const description = category?.description ?? brand?.description ?? '';
              const imageUrl = category?.image_url ?? brand?.logo_url ?? '';

              return (
                <article className="catalog-taxonomy-card" key={item.id}>
                  <div className="catalog-taxonomy-card-top">
                    <span className="catalog-taxonomy-icon">
                      {imageUrl ? (
                        <img src={imageUrl} alt="" />
                      ) : (
                        <Tag size={20} aria-hidden="true" />
                      )}
                    </span>
                    <span className={`catalog-taxonomy-status${active ? ' is-active' : ''}`}>
                      {active ? 'Active' : 'Hidden'}
                    </span>
                  </div>
                  <h3>{item.name}</h3>
                  <p className="catalog-taxonomy-slug">/{item.slug}</p>
                  {description && <p className="catalog-taxonomy-description">{description}</p>}
                  <div className="catalog-taxonomy-card-footer">
                    <span>
                      {linkedProducts} {linkedProducts === 1 ? 'product' : 'products'}
                    </span>
                    <div
                      className="admin-row-actions"
                      role="group"
                      aria-label={`Actions for ${item.name}`}
                    >
                      <button
                        type="button"
                        aria-label={`${active ? 'Hide' : 'Show'} ${item.name}`}
                        title={active ? 'Hide from storefront' : 'Show in storefront'}
                        disabled={updatingId === item.id}
                        onClick={() => void handleToggleActive(item)}
                      >
                        {updatingId === item.id ? (
                          <LoaderCircle className="admin-spinner" size={15} aria-hidden="true" />
                        ) : active ? (
                          <EyeOff size={15} aria-hidden="true" />
                        ) : (
                          <Eye size={15} aria-hidden="true" />
                        )}
                      </button>
                      <button
                        type="button"
                        aria-label={`Edit ${item.name}`}
                        title="Edit"
                        onClick={() =>
                          category ? editCategory(category) : editBrand(brand ?? undefined)
                        }
                      >
                        <Pencil size={15} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="is-danger"
                        aria-label={`Delete ${item.name}`}
                        title="Delete"
                        onClick={() => setPendingDelete(item)}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <dialog
        ref={dialogRef}
        className="admin-taxonomy-dialog"
        onCancel={(event) => {
          event.preventDefault();
          setEditor(null);
          setPendingDelete(null);
        }}
        onClose={() => {
          setEditor(null);
          setPendingDelete(null);
        }}
      >
        {editor && (
          <form onSubmit={(event) => void handleSave(event)}>
            <div className="admin-editor-header">
              <div>
                <p className="admin-eyebrow">
                  {editor.kind === 'category' ? 'CATALOG ORGANIZATION' : 'BRAND DIRECTORY'}
                </p>
                <h2>
                  {editor.value.id ? 'Edit' : 'Add'} {editor.kind}
                </h2>
                <p>These details will be available in the product editor.</p>
              </div>
              <button
                className="admin-modal-close"
                type="button"
                aria-label="Close"
                onClick={() => setEditor(null)}
              >
                <X size={19} aria-hidden="true" />
              </button>
            </div>
            <div className="admin-taxonomy-form">
              <label className="admin-field">
                <span>
                  Name <span className="admin-required-mark">*</span>
                </span>
                <input
                  required
                  autoFocus
                  value={editor.value.name}
                  onChange={(event) => {
                    const name = event.target.value;
                    setEditor((current) => {
                      if (!current) return current;
                      return current.kind === 'category'
                        ? {
                            ...current,
                            value: {
                              ...current.value,
                              name,
                              slug:
                                !current.value.id || !current.value.slug
                                  ? makeSlug(name)
                                  : current.value.slug,
                            },
                          }
                        : {
                            ...current,
                            value: {
                              ...current.value,
                              name,
                              slug:
                                !current.value.id || !current.value.slug
                                  ? makeSlug(name)
                                  : current.value.slug,
                            },
                          };
                    });
                  }}
                />
              </label>
              <label className="admin-field">
                <span>
                  URL slug <span className="admin-required-mark">*</span>
                </span>
                <input
                  required
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  title="Use lowercase letters, numbers, and hyphens."
                  value={editor.value.slug}
                  onChange={(event) => {
                    const slug = event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                    setEditor((current) => {
                      if (!current) return current;
                      return current.kind === 'category'
                        ? { ...current, value: { ...current.value, slug } }
                        : { ...current, value: { ...current.value, slug } };
                    });
                  }}
                />
              </label>
              <label className="admin-field admin-field--wide">
                <span>Description</span>
                <textarea
                  rows={3}
                  value={editor.value.description}
                  onChange={(event) => {
                    const description = event.target.value;
                    setEditor((current) => {
                      if (!current) return current;
                      return current.kind === 'category'
                        ? { ...current, value: { ...current.value, description } }
                        : { ...current, value: { ...current.value, description } };
                    });
                  }}
                />
              </label>
              {editor.kind === 'category' ? (
                <>
                  <label className="admin-field">
                    <span>Parent category</span>
                    <select
                      value={editor.value.parentId ?? ''}
                      onChange={(event) =>
                        setEditor((current) =>
                          current?.kind === 'category'
                            ? {
                                ...current,
                                value: { ...current.value, parentId: event.target.value || null },
                              }
                            : current,
                        )
                      }
                    >
                      <option value="">No parent</option>
                      {categories
                        .filter((category) => category.id !== editor.value.id)
                        .map((category) => (
                          <option value={category.id} key={category.id}>
                            {category.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="admin-field">
                    <span>Sort order</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editor.value.sortOrder}
                      onChange={(event) =>
                        setEditor((current) =>
                          current?.kind === 'category'
                            ? {
                                ...current,
                                value: {
                                  ...current.value,
                                  sortOrder: Math.max(0, Number(event.target.value) || 0),
                                },
                              }
                            : current,
                        )
                      }
                    />
                  </label>
                  <label className="admin-field admin-field--wide">
                    <span>Category image URL</span>
                    <input
                      type="url"
                      value={editor.value.imageUrl}
                      onChange={(event) =>
                        setEditor((current) =>
                          current?.kind === 'category'
                            ? {
                                ...current,
                                value: { ...current.value, imageUrl: event.target.value },
                              }
                            : current,
                        )
                      }
                    />
                  </label>
                  <label className="admin-field admin-field--wide admin-taxonomy-active">
                    <input
                      type="checkbox"
                      checked={editor.value.isActive}
                      onChange={(event) =>
                        setEditor((current) =>
                          current?.kind === 'category'
                            ? {
                                ...current,
                                value: { ...current.value, isActive: event.target.checked },
                              }
                            : current,
                        )
                      }
                    />
                    <span>Visible in the storefront and product editor</span>
                  </label>
                </>
              ) : (
                <>
                  <label className="admin-field admin-field--wide">
                    <span>Brand logo URL</span>
                    <input
                      type="url"
                      value={editor.value.logoUrl}
                      onChange={(event) =>
                        setEditor((current) =>
                          current?.kind === 'brand'
                            ? {
                                ...current,
                                value: { ...current.value, logoUrl: event.target.value },
                              }
                            : current,
                        )
                      }
                    />
                  </label>
                  <label className="admin-field admin-field--wide admin-taxonomy-active">
                    <input
                      type="checkbox"
                      checked={editor.value.isActive}
                      onChange={(event) =>
                        setEditor((current) =>
                          current?.kind === 'brand'
                            ? {
                                ...current,
                                value: { ...current.value, isActive: event.target.checked },
                              }
                            : current,
                        )
                      }
                    />
                    <span>Visible in the storefront and product editor</span>
                  </label>
                </>
              )}
            </div>
            <div className="admin-editor-footer">
              <p>
                <span className="admin-required-mark">*</span> Required fields
              </p>
              <div>
                <button
                  className="admin-secondary-button"
                  type="button"
                  onClick={() => setEditor(null)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button className="admin-primary-button" type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <LoaderCircle className="admin-spinner" size={17} />
                  ) : (
                    <Check size={17} />
                  )}
                  {isSaving ? 'Saving…' : `Save ${editor.kind}`}
                </button>
              </div>
            </div>
          </form>
        )}
        {pendingDelete && (
          <div className="admin-confirm-dialog">
            <div className="admin-confirm-icon">
              <Trash2 size={21} />
            </div>
            <button
              className="admin-modal-close"
              type="button"
              aria-label="Close confirmation"
              onClick={() => setPendingDelete(null)}
            >
              <X size={19} aria-hidden="true" />
            </button>
            <p className="admin-eyebrow">REMOVE FROM CATALOG</p>
            <h2>Delete {pendingDelete.name}?</h2>
            <p>
              This cannot be undone. Existing products will remain, but their{' '}
              {isCategory ? 'category' : 'brand'} assignment will be cleared.
            </p>
            <div className="admin-confirm-actions">
              <button
                className="admin-secondary-button"
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={isDeleting}
              >
                Keep it
              </button>
              <button
                className="admin-danger-button"
                type="button"
                onClick={() => void handleDelete()}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <LoaderCircle className="admin-spinner" size={16} />
                ) : (
                  <Trash2 size={16} />
                )}
                {isDeleting ? 'Deleting…' : `Delete ${isCategory ? 'category' : 'brand'}`}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
