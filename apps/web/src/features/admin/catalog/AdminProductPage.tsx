import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  ImagePlus,
  LoaderCircle,
  Package,
  Pencil,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import { getSupabaseClient } from '@/lib/supabase';
import { useBrandSettings } from '@/features/brand/brandSettingsContext';
import CatalogTaxonomyPanel from './CatalogTaxonomyPanel';
import {
  deleteProduct,
  loadProductDashboard,
  loadProductDetails,
  saveProduct,
  type CatalogBrand,
  type CatalogCategory,
  type CatalogProduct,
  type ProductDetails,
  type ProductEditorInput,
  type ProductListItem,
  type ProductVariantInput,
} from './productService';
import './admin-products.css';

type Notice = { kind: 'success' | 'error'; message: string };

function createBlankProduct(): ProductEditorInput {
  return {
    id: null,
    name: '',
    slug: '',
    shortDescription: '',
    description: '',
    categoryId: '',
    brandId: '',
    sku: '',
    price: '',
    comparePrice: '',
    status: 'draft',
    featured: false,
    quantityOnHand: '0',
    quantityReserved: '0',
    images: [],
    variants: [],
  };
}

function toEditorInput(details: ProductDetails): ProductEditorInput {
  const baseInventory = details.inventory.find((inventory) => inventory.variant_id === null);
  const inventoryByVariant = new Map(
    details.inventory
      .filter((inventory) => inventory.variant_id)
      .map((inventory) => [inventory.variant_id as string, inventory]),
  );

  return {
    id: details.product.id,
    name: details.product.name,
    slug: details.product.slug,
    shortDescription: details.product.short_description ?? '',
    description: details.product.description ?? '',
    categoryId: details.product.category_id ?? '',
    brandId: details.product.brand_id ?? '',
    sku: details.product.sku,
    price: String(details.product.price),
    comparePrice:
      details.product.compare_price === null ? '' : String(details.product.compare_price),
    status: details.product.status,
    featured: details.product.featured,
    quantityOnHand: String(baseInventory?.quantity_on_hand ?? 0),
    quantityReserved: String(baseInventory?.quantity_reserved ?? 0),
    images: details.images.map((image) => ({
      id: image.id,
      imageUrl: image.image_url,
      storagePath: image.storage_path,
      altText: image.alt_text,
      file: null,
    })),
    variants: details.variants.map((variant) => {
      const inventory = inventoryByVariant.get(variant.id);
      return {
        id: variant.id,
        sku: variant.sku,
        color: variant.color ?? '',
        size: variant.size ?? '',
        material: variant.material ?? '',
        price: variant.price === null ? '' : String(variant.price),
        quantityOnHand: String(inventory?.quantity_on_hand ?? 0),
        quantityReserved: String(inventory?.quantity_reserved ?? 0),
      };
    }),
  };
}

export default function AdminProductPage() {
  const { settings: brand } = useBrandSettings();
  const reduceMotion = useReducedMotion();
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [brands, setBrands] = useState<CatalogBrand[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEditor, setIsLoadingEditor] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editorInput, setEditorInput] = useState<ProductEditorInput | null>(null);
  const [preview, setPreview] = useState<ProductDetails | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CatalogProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [catalogView, setCatalogView] = useState<'products' | 'categories' | 'brands'>('products');

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const client = await getSupabaseClient();
      const dashboard = await loadProductDashboard(client);
      setProducts(dashboard.products);
      setCategories(dashboard.categories);
      setBrands(dashboard.brands);
      return true;
    } catch (error) {
      setNotice({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Products could not be loaded.',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.slug.toLowerCase().includes(query);
      return matchesSearch && (statusFilter === 'all' || product.status === statusFilter);
    });
  }, [products, search, statusFilter]);

  const openNewProduct = () => {
    setNotice(null);
    setEditorInput(createBlankProduct());
  };

  const openEditProduct = async (product: CatalogProduct) => {
    setIsLoadingEditor(true);
    setNotice(null);
    try {
      const client = await getSupabaseClient();
      const details = await loadProductDetails(client, product.id);
      setEditorInput(toEditorInput(details));
    } catch (error) {
      setNotice({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Product details could not be loaded.',
      });
    } finally {
      setIsLoadingEditor(false);
    }
  };

  const openPreview = async (product: CatalogProduct) => {
    setIsLoadingEditor(true);
    try {
      const client = await getSupabaseClient();
      setPreview(await loadProductDetails(client, product.id));
    } catch (error) {
      setNotice({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Product preview could not be loaded.',
      });
    } finally {
      setIsLoadingEditor(false);
    }
  };

  const handleSave = async (input: ProductEditorInput) => {
    setIsSaving(true);
    setNotice(null);
    try {
      const client = await getSupabaseClient();
      const result = await saveProduct(client, input);
      setEditorInput(null);
      const refreshed = await refresh();
      if (result.warning) {
        setNotice({ kind: 'error', message: result.warning });
      } else if (refreshed) {
        setNotice({ kind: 'success', message: 'Product saved successfully.' });
      }
    } catch (error) {
      setNotice({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Product could not be saved.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) {
      return;
    }
    setIsDeleting(true);
    setNotice(null);
    try {
      const client = await getSupabaseClient();
      const warning = await deleteProduct(client, pendingDelete.id);
      setPendingDelete(null);
      const refreshed = await refresh();
      if (warning) {
        setNotice({ kind: 'error', message: warning });
      } else if (refreshed) {
        setNotice({ kind: 'success', message: `${pendingDelete.name} was deleted.` });
      }
    } catch (error) {
      setNotice({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Product could not be deleted.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const activeCount = products.filter((product) => product.status === 'active').length;
  const draftCount = products.filter((product) => product.status === 'draft').length;
  const lowStockCount = products.filter(
    (product) => product.status === 'active' && product.availableQuantity < 5,
  ).length;

  return (
    <main className="admin-products">
      <header className="admin-topbar">
        <Link className="admin-brand" to="/" aria-label={`${brand.brand_name} home`}>
          <span className="admin-brand-mark">
            {brand.logo_url ? <img src={brand.logo_url} alt="" /> : brand.brand_name.charAt(0)}
          </span>
          <span>
            <strong>{brand.brand_name}</strong>
            <small>{brand.brand_tagline || 'Admin console'}</small>
          </span>
        </Link>
        <div className="admin-topbar-right">
          <span className="admin-console-label">ADMIN CONSOLE</span>
          <Link className="admin-back-link" to="/admin/homepage">
            Homepage studio
          </Link>
          <Link className="admin-back-link" to="/admin/orders">
            Orders
          </Link>
          <Link className="admin-back-link" to="/admin/settings/brand">
            <Settings size={15} aria-hidden="true" />
            Settings
          </Link>
          <Link className="admin-back-link" to="/">
            <ArrowLeft size={16} aria-hidden="true" />
            Storefront
          </Link>
        </div>
      </header>

      <div className="admin-content">
        <motion.section
          className="admin-page-heading"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div>
            <p className="admin-eyebrow">
              <Sparkles size={14} aria-hidden="true" /> CATALOG MANAGEMENT
            </p>
            <h1>
              {catalogView === 'products'
                ? 'Products'
                : catalogView === 'categories'
                  ? 'Categories'
                  : 'Brands'}
            </h1>
            <p className="admin-heading-copy">
              {catalogView === 'products'
                ? 'Curate the collection, keep details polished, and stay close to inventory.'
                : catalogView === 'categories'
                  ? 'Organize your storefront collections and shop filters.'
                  : 'Manage the brands available across your product catalog.'}
            </p>
          </div>
          {catalogView === 'products' && (
            <button className="admin-primary-button" type="button" onClick={openNewProduct}>
              <Plus size={18} aria-hidden="true" />
              Add product
            </button>
          )}
        </motion.section>

        <nav className="admin-catalog-nav" aria-label="Catalog management">
          {(['products', 'categories', 'brands'] as const).map((view) => (
            <button
              key={view}
              type="button"
              className={catalogView === view ? 'is-active' : ''}
              aria-current={catalogView === view ? 'page' : undefined}
              onClick={() => {
                setCatalogView(view);
                setNotice(null);
              }}
            >
              {view === 'products' ? 'Products' : view === 'categories' ? 'Categories' : 'Brands'}
              <span>
                {view === 'products'
                  ? products.length
                  : view === 'categories'
                    ? categories.length
                    : brands.length}
              </span>
            </button>
          ))}
        </nav>

        {notice && (
          <div
            className={`admin-notice admin-notice--${notice.kind}`}
            role={notice.kind === 'error' ? 'alert' : 'status'}
          >
            {notice.kind === 'success' ? (
              <Check size={17} aria-hidden="true" />
            ) : (
              <X size={17} aria-hidden="true" />
            )}
            <span>{notice.message}</span>
            <button type="button" aria-label="Dismiss notification" onClick={() => setNotice(null)}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        )}

        {catalogView === 'products' && (
          <>
            <section className="admin-metrics" aria-label="Product summary">
              <Metric label="All products" value={products.length} icon={<Package />} />
              <Metric label="Published" value={activeCount} tone="green" />
              <Metric label="Drafts" value={draftCount} tone="sand" />
              <Metric label="Low stock" value={lowStockCount} tone="rose" />
            </section>

            <section className="admin-product-panel" aria-labelledby="product-list-heading">
              <div className="admin-panel-header">
                <div>
                  <h2 id="product-list-heading">Product library</h2>
                  <p>
                    {filteredProducts.length}{' '}
                    {filteredProducts.length === 1 ? 'product' : 'products'} in view
                  </p>
                </div>
                <div className="admin-filters">
                  <label className="admin-search">
                    <Search size={17} aria-hidden="true" />
                    <span className="visually-hidden">Search products</span>
                    <input
                      type="search"
                      placeholder="Search name, SKU, or slug"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </label>
                  <label className="admin-select-wrap">
                    <span className="visually-hidden">Filter by status</span>
                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                    >
                      <option value="all">All status</option>
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                      <option value="archived">Archived</option>
                    </select>
                    <ChevronDown size={15} aria-hidden="true" />
                  </label>
                </div>
              </div>

              {isLoading ? (
                <div className="admin-loading" role="status">
                  <LoaderCircle className="admin-spinner" size={22} aria-hidden="true" />
                  Loading product library…
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="admin-empty">
                  <span>
                    <Package size={23} aria-hidden="true" />
                  </span>
                  <h3>
                    {products.length ? 'No matching products' : 'Your product library is ready'}
                  </h3>
                  <p>
                    {products.length
                      ? 'Try another search or status filter.'
                      : 'Add your first product to begin building the catalog.'}
                  </p>
                  {!products.length && (
                    <button className="admin-primary-button" type="button" onClick={openNewProduct}>
                      <Plus size={17} aria-hidden="true" /> Add your first product
                    </button>
                  )}
                </div>
              ) : (
                <div className="admin-table-scroll">
                  <table className="admin-product-table">
                    <thead>
                      <tr>
                        <th scope="col">Product</th>
                        <th scope="col">SKU</th>
                        <th scope="col">Price</th>
                        <th scope="col">Inventory</th>
                        <th scope="col">Status</th>
                        <th scope="col">
                          <span className="visually-hidden">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => (
                        <tr key={product.id}>
                          <td>
                            <button
                              className="admin-product-identity"
                              type="button"
                              onClick={() => void openPreview(product)}
                            >
                              <span className="admin-product-thumb">
                                {product.thumbnail_url ? (
                                  <img src={product.thumbnail_url} alt="" loading="lazy" />
                                ) : (
                                  <ImagePlus size={19} aria-hidden="true" />
                                )}
                              </span>
                              <span>
                                <strong>{product.name}</strong>
                                <small>
                                  {product.featured ? 'Featured · ' : ''}
                                  {product.slug}
                                </small>
                              </span>
                            </button>
                          </td>
                          <td className="admin-mono">{product.sku}</td>
                          <td className="admin-price">${product.price.toFixed(2)}</td>
                          <td>
                            <span
                              className={
                                product.availableQuantity < 5
                                  ? 'admin-stock admin-stock--low'
                                  : 'admin-stock'
                              }
                            >
                              {product.availableQuantity} available
                            </span>
                          </td>
                          <td>
                            <StatusBadge status={product.status} />
                          </td>
                          <td>
                            <div
                              className="admin-row-actions"
                              role="group"
                              aria-label={`Actions for ${product.name}`}
                            >
                              <button
                                type="button"
                                aria-label={`Preview ${product.name}`}
                                onClick={() => void openPreview(product)}
                              >
                                Preview
                              </button>
                              <button
                                type="button"
                                aria-label={`Edit ${product.name}`}
                                onClick={() => void openEditProduct(product)}
                              >
                                <Pencil size={15} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                aria-label={`Delete ${product.name}`}
                                className="admin-delete-icon"
                                onClick={() => setPendingDelete(product)}
                              >
                                <Trash2 size={15} aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
        {catalogView !== 'products' &&
          (isLoading ? (
            <section className="admin-product-panel">
              <div className="admin-loading" role="status">
                <LoaderCircle className="admin-spinner" size={22} aria-hidden="true" />
                Loading catalog…
              </div>
            </section>
          ) : (
            <CatalogTaxonomyPanel
              kind={catalogView}
              categories={categories}
              brands={brands}
              products={products}
              onChanged={refresh}
            />
          ))}
      </div>

      <AnimatePresence>
        {isLoadingEditor && (
          <ModalShell onClose={() => undefined} label="Loading product">
            <div className="admin-loading admin-modal-loading" role="status">
              <LoaderCircle className="admin-spinner" size={24} aria-hidden="true" />
              Loading product…
            </div>
          </ModalShell>
        )}
        {editorInput && (
          <ProductEditor
            initialValue={editorInput}
            categories={categories}
            brands={brands}
            isSaving={isSaving}
            onClose={() => !isSaving && setEditorInput(null)}
            onSave={handleSave}
          />
        )}
        {preview && (
          <ProductPreview
            details={preview}
            categories={categories}
            brands={brands}
            onClose={() => setPreview(null)}
          />
        )}
        {pendingDelete && (
          <ModalShell
            onClose={() => !isDeleting && setPendingDelete(null)}
            label="Confirm product deletion"
          >
            <div className="admin-confirm-dialog">
              <span className="admin-confirm-icon">
                <Trash2 size={21} aria-hidden="true" />
              </span>
              <button
                className="admin-modal-close"
                type="button"
                aria-label="Close dialog"
                onClick={() => setPendingDelete(null)}
                disabled={isDeleting}
              >
                <X size={19} aria-hidden="true" />
              </button>
              <h2>Delete this product?</h2>
              <p>
                <strong>{pendingDelete.name}</strong> and its variants, inventory, and image records
                will be permanently removed.
              </p>
              <div className="admin-confirm-actions">
                <button
                  className="admin-secondary-button"
                  type="button"
                  onClick={() => setPendingDelete(null)}
                  disabled={isDeleting}
                >
                  Keep product
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
                  Delete product
                </button>
              </div>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>
    </main>
  );
}

function Metric({
  label,
  value,
  icon,
  tone = 'default',
}: {
  label: string;
  value: number;
  icon?: ReactNode;
  tone?: 'default' | 'green' | 'sand' | 'rose';
}) {
  return (
    <article className={`admin-metric admin-metric--${tone}`}>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
      {icon && <span className="admin-metric-icon">{icon}</span>}
    </article>
  );
}

function StatusBadge({ status }: { status: CatalogProduct['status'] }) {
  return <span className={`admin-status admin-status--${status}`}>{status}</span>;
}

function ModalShell({
  children,
  onClose,
  label,
  wide = false,
}: {
  children: ReactNode;
  onClose: () => void;
  label: string;
  wide?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const focusFrame = window.requestAnimationFrame(() => {
      const firstFocusable =
        dialog?.querySelector<HTMLElement>('[data-dialog-autofocus]') ??
        dialog?.querySelector<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]',
        );
      (firstFocusable ?? dialog)?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]',
        ),
      );
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, []);

  return (
    <motion.div
      className="admin-modal-backdrop"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.section
        ref={dialogRef}
        className={`admin-modal${wide ? ' admin-modal--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.99 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.section>
    </motion.div>
  );
}

function ProductEditor({
  initialValue,
  categories,
  brands,
  isSaving,
  onClose,
  onSave,
}: {
  initialValue: ProductEditorInput;
  categories: CatalogCategory[];
  brands: CatalogBrand[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (input: ProductEditorInput) => Promise<void>;
}) {
  const [value, setValue] = useState(initialValue);
  const [formError, setFormError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(Boolean(initialValue.id));
  const [draggedImage, setDraggedImage] = useState<number | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const previewUrls = useRef(new Set<string>());
  const isEditing = Boolean(initialValue.id);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  useEffect(
    () => () => {
      for (const url of previewUrls.current) URL.revokeObjectURL(url);
    },
    [],
  );

  const update = <K extends keyof ProductEditorInput>(key: K, next: ProductEditorInput[K]) => {
    setValue((previous) => ({ ...previous, [key]: next }));
  };

  const updateVariant = (index: number, patch: Partial<ProductVariantInput>) => {
    update(
      'variants',
      value.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, ...patch } : variant,
      ),
    );
  };

  const addImages = (files: FileList | File[]) => {
    const selected = Array.from(files);
    const next = [...value.images];
    for (const file of selected) {
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
        setFormError(`${file.name} is not an image.`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        setFormError(`${file.name} is larger than 10 MB.`);
        continue;
      }
      const imageUrl = URL.createObjectURL(file);
      previewUrls.current.add(imageUrl);
      next.push({
        id: crypto.randomUUID(),
        imageUrl,
        storagePath: null,
        altText: '',
        file,
      });
    }
    update('images', next);
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= value.images.length || fromIndex === toIndex) return;
    const images = [...value.images];
    const [image] = images.splice(fromIndex, 1);
    images.splice(toIndex, 0, image);
    update('images', images);
  };

  const removeImage = (index: number) => {
    const image = value.images[index];
    if (image?.file && image.imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(image.imageUrl);
      previewUrls.current.delete(image.imageUrl);
    }
    update(
      'images',
      value.images.filter((_, imageIndex) => imageIndex !== index),
    );
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (event.dataTransfer.files.length > 0) addImages(event.dataTransfer.files);
  };

  const validate = (): string | null => {
    if (!value.name.trim()) return 'Enter a product name.';
    if (!value.slug.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value.slug.trim())) {
      return 'Use a unique slug with lowercase letters, numbers, and hyphens.';
    }
    if (!value.sku.trim()) return 'Enter a product SKU.';
    if (value.price === '' || !Number.isFinite(Number(value.price)) || Number(value.price) < 0) {
      return 'Enter a valid product price.';
    }
    if (value.comparePrice && Number(value.comparePrice) < Number(value.price)) {
      return 'Compare price must be greater than or equal to the product price.';
    }
    if (!value.variants.length) {
      const stock = Number(value.quantityOnHand);
      const reserved = Number(value.quantityReserved);
      if (!Number.isInteger(stock) || stock < 0 || !Number.isInteger(reserved) || reserved < 0) {
        return 'Inventory quantities must be whole numbers and cannot be negative.';
      }
      if (reserved > stock) return 'Reserved quantity cannot exceed stock quantity.';
    }
    const variantSkus = new Set<string>();
    for (const variant of value.variants) {
      if (!variant.sku.trim()) return 'Every variant needs a SKU.';
      const normalizedSku = variant.sku.trim().toLowerCase();
      if (variantSkus.has(normalizedSku)) return 'Variant SKUs must be unique.';
      variantSkus.add(normalizedSku);
      if (variant.price && (!Number.isFinite(Number(variant.price)) || Number(variant.price) < 0)) {
        return 'Variant price overrides must be valid non-negative amounts.';
      }
      const stock = Number(variant.quantityOnHand);
      const reserved = Number(variant.quantityReserved);
      if (!Number.isInteger(stock) || stock < 0 || !Number.isInteger(reserved) || reserved < 0) {
        return 'Variant inventory quantities must be whole numbers and cannot be negative.';
      }
      if (reserved > stock) return 'Variant reserved quantity cannot exceed its stock quantity.';
    }
    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError(null);
    await onSave(value);
  };

  return (
    <ModalShell onClose={onClose} label={isEditing ? 'Edit product' : 'Add product'} wide>
      <div className="admin-editor-header">
        <div>
          <p className="admin-eyebrow">{isEditing ? 'CATALOG · EDIT' : 'CATALOG · NEW ITEM'}</p>
          <h2>{isEditing ? 'Edit product' : 'Create a product'}</h2>
          <p>Thoughtful details make the collection easier to discover.</p>
        </div>
        <button
          className="admin-modal-close"
          type="button"
          aria-label="Close editor"
          onClick={onClose}
          disabled={isSaving}
        >
          <X size={19} aria-hidden="true" />
        </button>
      </div>

      <form className="admin-editor-form" onSubmit={(event) => void handleSubmit(event)}>
        {formError && (
          <p className="admin-form-error" role="alert">
            {formError}
          </p>
        )}

        <section className="admin-form-section" aria-labelledby="product-details-title">
          <div className="admin-section-heading">
            <span>01</span>
            <div>
              <h3 id="product-details-title">Product details</h3>
              <p>Core information visible across the catalog.</p>
            </div>
          </div>
          <div className="admin-form-grid">
            <Field label="Product name" required className="admin-field--wide">
              <input
                ref={firstInputRef}
                data-dialog-autofocus
                value={value.name}
                onChange={(event) => {
                  const name = event.target.value;
                  setValue((previous) => ({
                    ...previous,
                    name,
                    slug: slugTouched ? previous.slug : toSlug(name),
                  }));
                }}
                maxLength={160}
                required
              />
            </Field>
            <Field label="Slug" hint="Lowercase words separated by hyphens" required>
              <input
                value={value.slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  update('slug', event.target.value.toLowerCase().replace(/[^a-z0-9-]/gu, ''));
                }}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                required
              />
            </Field>
            <Field label="SKU" required>
              <input
                value={value.sku}
                onChange={(event) => update('sku', event.target.value)}
                maxLength={80}
                required
              />
            </Field>
            <Field label="Short description" className="admin-field--wide">
              <textarea
                value={value.shortDescription}
                onChange={(event) => update('shortDescription', event.target.value)}
                rows={2}
                maxLength={280}
              />
            </Field>
            <Field label="Full description" className="admin-field--wide">
              <textarea
                value={value.description}
                onChange={(event) => update('description', event.target.value)}
                rows={4}
              />
            </Field>
            <Field label="Category">
              <select
                value={value.categoryId}
                onChange={(event) => update('categoryId', event.target.value)}
              >
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Brand">
              <select
                value={value.brandId}
                onChange={(event) => update('brandId', event.target.value)}
              >
                <option value="">No brand</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Price" required>
              <div className="admin-input-affix">
                <span>$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={value.price}
                  onChange={(event) => update('price', event.target.value)}
                  required
                />
              </div>
            </Field>
            <Field label="Compare price" hint="Optional reference price">
              <div className="admin-input-affix">
                <span>$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={value.comparePrice}
                  onChange={(event) => update('comparePrice', event.target.value)}
                />
              </div>
            </Field>
            <Field label="Status">
              <select
                value={value.status}
                onChange={(event) =>
                  update('status', event.target.value as CatalogProduct['status'])
                }
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
            <label className="admin-feature-toggle">
              <input
                type="checkbox"
                checked={value.featured}
                onChange={(event) => update('featured', event.target.checked)}
              />
              <span className="admin-toggle-ui" aria-hidden="true" />
              <span>
                <strong>Featured product</strong>
                <small>Highlight this item in curated placements.</small>
              </span>
            </label>
          </div>
        </section>

        <section className="admin-form-section" aria-labelledby="product-images-title">
          <div className="admin-section-heading">
            <span>02</span>
            <div>
              <h3 id="product-images-title">Product imagery</h3>
              <p>First image is used as the primary image and thumbnail.</p>
            </div>
          </div>
          <label
            className="admin-upload-zone"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                if (event.target.files) addImages(event.target.files);
                event.target.value = '';
              }}
            />
            <span className="admin-upload-icon">
              <ImagePlus size={21} aria-hidden="true" />
            </span>
            <span>
              <strong>Drop images here or browse</strong>
              <small>JPG, PNG, WebP or AVIF · Up to 10 MB each</small>
            </span>
          </label>
          {value.images.length > 0 && (
            <div className="admin-image-grid">
              {value.images.map((image, index) => (
                <article
                  className={`admin-image-card${draggedImage === index ? ' is-dragging' : ''}`}
                  key={image.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', String(index));
                    setDraggedImage(index);
                  }}
                  onDragEnd={() => setDraggedImage(null)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (draggedImage !== null) moveImage(draggedImage, index);
                    setDraggedImage(null);
                  }}
                >
                  <img
                    src={image.imageUrl}
                    alt={image.altText || `Product image ${index + 1} preview`}
                  />
                  <span className="admin-image-order">
                    {index === 0 ? 'PRIMARY' : `0${index + 1}`}
                  </span>
                  <div className="admin-image-controls">
                    <button
                      type="button"
                      aria-label={`Move image ${index + 1} earlier`}
                      disabled={index === 0}
                      onClick={() => moveImage(index, index - 1)}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move image ${index + 1} later`}
                      disabled={index === value.images.length - 1}
                      onClick={() => moveImage(index, index + 1)}
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove image ${index + 1}`}
                      onClick={() => removeImage(index)}
                    >
                      <X size={15} />
                    </button>
                  </div>
                  <label className="admin-image-alt">
                    <span className="visually-hidden">Alt text for image {index + 1}</span>
                    <input
                      value={image.altText}
                      placeholder="Describe this image"
                      onChange={(event) =>
                        update(
                          'images',
                          value.images.map((current, imageIndex) =>
                            imageIndex === index
                              ? { ...current, altText: event.target.value }
                              : current,
                          ),
                        )
                      }
                    />
                  </label>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="admin-form-section" aria-labelledby="product-variants-title">
          <div className="admin-section-heading admin-section-heading--with-action">
            <span>03</span>
            <div>
              <h3 id="product-variants-title">Variants & inventory</h3>
              <p>Manage stock for the product or for each option.</p>
            </div>
            <button
              className="admin-subtle-button"
              type="button"
              onClick={() =>
                update('variants', [
                  ...value.variants,
                  {
                    id: crypto.randomUUID(),
                    sku: '',
                    color: '',
                    size: '',
                    material: '',
                    price: '',
                    quantityOnHand: '0',
                    quantityReserved: '0',
                  },
                ])
              }
            >
              <Plus size={15} aria-hidden="true" /> Add variant
            </button>
          </div>

          {value.variants.length === 0 ? (
            <div className="admin-base-inventory">
              <div>
                <strong>Base inventory</strong>
                <p>No variants — inventory is tracked at product level.</p>
              </div>
              <div className="admin-form-grid admin-form-grid--inventory">
                <Field label="Stock quantity" required>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={value.quantityOnHand}
                    onChange={(event) => update('quantityOnHand', event.target.value)}
                  />
                </Field>
                <Field label="Reserved quantity">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={value.quantityReserved}
                    onChange={(event) => update('quantityReserved', event.target.value)}
                  />
                </Field>
                <div className="admin-available">
                  <span>Available</span>
                  <strong>
                    {Math.max(
                      0,
                      Number(value.quantityOnHand || 0) - Number(value.quantityReserved || 0),
                    )}
                  </strong>
                </div>
              </div>
            </div>
          ) : (
            <div className="admin-variants-list">
              {value.variants.map((variant, index) => (
                <fieldset className="admin-variant-card" key={variant.id}>
                  <legend>Variant {String(index + 1).padStart(2, '0')}</legend>
                  <button
                    className="admin-variant-remove"
                    type="button"
                    aria-label={`Remove variant ${index + 1}`}
                    onClick={() =>
                      update(
                        'variants',
                        value.variants.filter((_, variantIndex) => variantIndex !== index),
                      )
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                  <div className="admin-form-grid">
                    <Field label="Variant SKU" required>
                      <input
                        value={variant.sku}
                        onChange={(event) => updateVariant(index, { sku: event.target.value })}
                      />
                    </Field>
                    <Field label="Color">
                      <input
                        value={variant.color}
                        onChange={(event) => updateVariant(index, { color: event.target.value })}
                      />
                    </Field>
                    <Field label="Size">
                      <input
                        value={variant.size}
                        onChange={(event) => updateVariant(index, { size: event.target.value })}
                      />
                    </Field>
                    <Field label="Material">
                      <input
                        value={variant.material}
                        onChange={(event) => updateVariant(index, { material: event.target.value })}
                      />
                    </Field>
                    <Field label="Price override">
                      <div className="admin-input-affix">
                        <span>$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder={value.price || 'Product price'}
                          value={variant.price}
                          onChange={(event) => updateVariant(index, { price: event.target.value })}
                        />
                      </div>
                    </Field>
                    <Field label="Stock quantity">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={variant.quantityOnHand}
                        onChange={(event) =>
                          updateVariant(index, { quantityOnHand: event.target.value })
                        }
                      />
                    </Field>
                    <Field label="Reserved quantity">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={variant.quantityReserved}
                        onChange={(event) =>
                          updateVariant(index, { quantityReserved: event.target.value })
                        }
                      />
                    </Field>
                    <div className="admin-available">
                      <span>Available</span>
                      <strong>
                        {Math.max(
                          0,
                          Number(variant.quantityOnHand || 0) -
                            Number(variant.quantityReserved || 0),
                        )}
                      </strong>
                    </div>
                  </div>
                </fieldset>
              ))}
            </div>
          )}
        </section>

        <div className="admin-editor-footer">
          <p>
            <span className="admin-required-mark">*</span> Required fields
          </p>
          <div>
            <button
              className="admin-secondary-button"
              type="button"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button className="admin-primary-button" type="submit" disabled={isSaving}>
              {isSaving ? (
                <LoaderCircle className="admin-spinner" size={17} />
              ) : (
                <Check size={17} aria-hidden="true" />
              )}
              {isSaving ? 'Saving product…' : isEditing ? 'Save changes' : 'Create product'}
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  );
}

function Field({
  label,
  children,
  required = false,
  hint,
  className = '',
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={`admin-field ${className}`}>
      <span>
        {label}
        {required && <span className="admin-required-mark"> *</span>}
      </span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function ProductPreview({
  details,
  categories,
  brands,
  onClose,
}: {
  details: ProductDetails;
  categories: CatalogCategory[];
  brands: CatalogBrand[];
  onClose: () => void;
}) {
  const { product, images, variants, inventory } = details;
  const available = inventory.reduce((total, row) => total + row.available_quantity, 0);
  const categoryName = categories.find((category) => category.id === product.category_id)?.name;
  const brandName = brands.find((brand) => brand.id === product.brand_id)?.name;
  return (
    <ModalShell onClose={onClose} label={`Preview ${product.name}`} wide>
      <div className="admin-preview-header">
        <div>
          <p className="admin-eyebrow">PRODUCT PREVIEW</p>
          <h2>{product.name}</h2>
        </div>
        <button
          className="admin-modal-close"
          type="button"
          aria-label="Close preview"
          onClick={onClose}
        >
          <X size={19} />
        </button>
      </div>
      <div className="admin-preview-content">
        <div className="admin-preview-gallery">
          {(images.length
            ? images
            : [{ id: 'empty', image_url: '', alt_text: '', is_primary: true }]
          ).map((image) => (
            <div className="admin-preview-image" key={image.id}>
              {image.image_url ? (
                <img src={image.image_url} alt={image.alt_text} />
              ) : (
                <ImagePlus size={32} aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
        <div className="admin-preview-info">
          <div className="admin-preview-badges">
            <StatusBadge status={product.status} />
            {product.featured && (
              <span className="admin-featured-pill">
                <Sparkles size={13} /> Featured
              </span>
            )}
          </div>
          <h3>{product.name}</h3>
          <p className="admin-preview-description">
            {product.short_description || 'No short description provided.'}
          </p>
          <div className="admin-preview-prices">
            <strong>${product.price.toFixed(2)}</strong>
            {product.compare_price !== null && <del>${product.compare_price.toFixed(2)}</del>}
          </div>
          <dl className="admin-preview-meta">
            <div>
              <dt>SKU</dt>
              <dd>{product.sku}</dd>
            </div>
            <div>
              <dt>Slug</dt>
              <dd>{product.slug}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{categoryName ?? '—'}</dd>
            </div>
            <div>
              <dt>Brand</dt>
              <dd>{brandName ?? '—'}</dd>
            </div>
            <div>
              <dt>Available stock</dt>
              <dd>{available}</dd>
            </div>
          </dl>
          {product.description && (
            <div className="admin-preview-full-description">
              <h4>Description</h4>
              <p>{product.description}</p>
            </div>
          )}
          {variants.length > 0 && (
            <div className="admin-preview-variants">
              <h4>Variants ({variants.length})</h4>
              {variants.map((variant) => (
                <span key={variant.id}>
                  {[variant.color, variant.size, variant.material].filter(Boolean).join(' · ') ||
                    variant.sku}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

function toSlug(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
}
