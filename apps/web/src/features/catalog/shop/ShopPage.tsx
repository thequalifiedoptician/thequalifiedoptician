import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { getSupabaseClient } from '@/lib/supabase';
import { defaultHomepageContent } from '@/features/admin/homepage/homepageContent';
import { loadPublishedShopHero } from '@/features/admin/homepage/homepageContentService';
import ShopProductCard from './ShopProductCard';
import { loadShopCatalog, type ShopCatalog, type ShopProduct } from './productListingService';
import './shop.css';

const PAGE_SIZE = 12;
const NEW_ARRIVAL_DAYS = 30;
const NEW_ARRIVAL_CUTOFF = Date.now() - NEW_ARRIVAL_DAYS * 24 * 60 * 60 * 1000;
const FILTER_KEYS = [
  'q',
  'category',
  'brand',
  'minPrice',
  'maxPrice',
  'available',
  'featured',
  'discounted',
  'new',
] as const;
const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'name-asc', label: 'Name: A to Z' },
  { value: 'name-desc', label: 'Name: Z to A' },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]['value'];
type SearchParamsSetter = ReturnType<typeof useSearchParams>[1];

function getPositiveNumber(value: string | null): number | null {
  if (!value || !value.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function updateSearchParam(
  setSearchParams: SearchParamsSetter,
  searchParams: URLSearchParams,
  key: string,
  value: string,
  resetPage = true,
) {
  const nextParams = new URLSearchParams(searchParams);
  if (value) {
    nextParams.set(key, value);
  } else {
    nextParams.delete(key);
  }
  if (resetPage && key !== 'page') {
    nextParams.delete('page');
  }
  setSearchParams(nextParams, { preventScrollReset: true });
}

function clearSearchParams(
  setSearchParams: SearchParamsSetter,
  searchParams: URLSearchParams,
  includeQuery = false,
) {
  const nextParams = new URLSearchParams(searchParams);
  for (const key of [
    ...FILTER_KEYS.filter((filter) => includeQuery || filter !== 'q'),
    'sort',
    'page',
  ]) {
    nextParams.delete(key);
  }
  setSearchParams(nextParams, { preventScrollReset: true });
}

function matchesSearch(product: ShopProduct, query: string): boolean {
  if (!query) {
    return true;
  }
  const searchableText = [
    product.name,
    product.sku,
    product.slug,
    product.brandName,
    product.categoryName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase();
  return searchableText.includes(query.toLocaleLowerCase());
}

function ShopFilters({
  catalog,
  searchParams,
  setSearchParams,
  onClear,
  onClose,
}: {
  catalog: ShopCatalog;
  searchParams: URLSearchParams;
  setSearchParams: SearchParamsSetter;
  onClear: () => void;
  onClose?: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const brands = catalog.brands;
  const activeFilterCount = [
    'category',
    'brand',
    'minPrice',
    'maxPrice',
    'available',
    'featured',
    'discounted',
    'new',
  ].filter((key) => searchParams.has(key)).length;
  const selectedMin = searchParams.get('minPrice') ?? '';
  const selectedMax = searchParams.get('maxPrice') ?? '';
  const selectedCategory = searchParams.get('category') ?? '';
  const selectedBrand = searchParams.get('brand') ?? '';
  const checked = (key: string) => searchParams.get(key) === '1';

  const setFilter = (key: string, value: string) =>
    updateSearchParam(setSearchParams, searchParams, key, value);

  return (
    <div className="shop-filter-content">
      <div className="shop-filter-heading">
        <div>
          <p className="shop-filter-eyebrow">YOUR COLLECTION, YOUR WAY</p>
          <h3>Refine your view</h3>
          <p className="shop-filter-intro">
            A few thoughtful choices to find just the right thing.
          </p>
        </div>
        {onClose && (
          <button type="button" className="shop-filter-close" onClick={onClose}>
            <span className="visually-hidden">Close filters</span>
            <X size={19} aria-hidden="true" />
          </button>
        )}
      </div>

      <motion.label
        className="shop-filter-field"
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.04 }}
      >
        <span>Category</span>
        <span className="shop-select-wrap">
          <select
            value={selectedCategory}
            onChange={(event) => setFilter('category', event.target.value)}
          >
            <option value="">All categories</option>
            {catalog.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <ChevronDown size={15} aria-hidden="true" />
        </span>
      </motion.label>

      <motion.label
        className="shop-filter-field"
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.08 }}
      >
        <span>Brand</span>
        <span className="shop-select-wrap">
          <select
            value={selectedBrand}
            onChange={(event) => setFilter('brand', event.target.value)}
          >
            <option value="">All brands</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
          <ChevronDown size={15} aria-hidden="true" />
        </span>
      </motion.label>

      <motion.fieldset
        className="shop-filter-group"
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.12 }}
      >
        <legend>Price range</legend>
        <div className="shop-price-inputs">
          <label>
            <span className="visually-hidden">Minimum price</span>
            <span>Rs</span>
            <input
              type="number"
              min="0"
              inputMode="decimal"
              placeholder="Min"
              value={selectedMin}
              onChange={(event) => setFilter('minPrice', event.target.value)}
            />
          </label>
          <span aria-hidden="true">to</span>
          <label>
            <span className="visually-hidden">Maximum price</span>
            <span>Rs</span>
            <input
              type="number"
              min="0"
              inputMode="decimal"
              placeholder="Max"
              value={selectedMax}
              onChange={(event) => setFilter('maxPrice', event.target.value)}
            />
          </label>
        </div>
      </motion.fieldset>

      <motion.fieldset
        className="shop-filter-group shop-filter-checks"
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.16 }}
      >
        <legend>Availability & style</legend>
        {[
          ['available', 'In stock'],
          ['featured', 'Featured pieces'],
          ['discounted', 'On offer'],
          ['new', `New arrivals (${NEW_ARRIVAL_DAYS} days)`],
        ].map(([key, label]) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={checked(key)}
              onChange={(event) => setFilter(key, event.target.checked ? '1' : '')}
            />
            <span>{label}</span>
          </label>
        ))}
      </motion.fieldset>

      <div className="shop-filter-actions">
        <button className="shop-clear-filters" type="button" onClick={onClear}>
          Clear all filters
        </button>
        <span className="shop-filter-active-count" aria-live="polite">
          {activeFilterCount === 0
            ? 'All pieces'
            : `${activeFilterCount} ${activeFilterCount === 1 ? 'filter' : 'filters'} selected`}
        </span>
      </div>
    </div>
  );
}

export default function ShopPage() {
  const reduceMotion = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();
  const [catalog, setCatalog] = useState<ShopCatalog | null>(null);
  const [shopHero, setShopHero] = useState(defaultHomepageContent.shopHero);
  const [shopHeroError, setShopHeroError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const filterDrawerRef = useRef<HTMLElement>(null);
  const wasFilterDrawerOpen = useRef(false);

  const loadCatalog = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const client = await getSupabaseClient();
      setCatalog(await loadShopCatalog(client));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'We could not load the collection. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadCatalog);
  }, [loadCatalog]);

  useEffect(() => {
    let active = true;
    void loadPublishedShopHero().then(
      (publishedShopHero) => {
        if (active) setShopHero(publishedShopHero);
      },
      (loadError: unknown) => {
        if (active) {
          setShopHeroError(
            loadError instanceof Error
              ? loadError.message
              : 'Shop banner could not be loaded. The default artwork is shown.',
          );
        }
      },
    );
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isFilterDrawerOpen) {
      if (wasFilterDrawerOpen.current) {
        wasFilterDrawerOpen.current = false;
        filterTriggerRef.current?.focus();
      }
      return;
    }
    wasFilterDrawerOpen.current = true;
    window.requestAnimationFrame(() => {
      filterDrawerRef.current
        ?.querySelector<HTMLElement>('button:not([disabled]), select, input')
        ?.focus();
    });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFilterDrawerOpen(false);
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isFilterDrawerOpen]);

  const query = (searchParams.get('q') ?? '').trim();
  const categoryId = searchParams.get('category') ?? '';
  const brandId = searchParams.get('brand') ?? '';
  const minimumPrice = getPositiveNumber(searchParams.get('minPrice'));
  const maximumPrice = getPositiveNumber(searchParams.get('maxPrice'));
  const sortValue = searchParams.get('sort');
  const sort: SortOption = SORT_OPTIONS.some((option) => option.value === sortValue)
    ? (sortValue as SortOption)
    : 'featured';
  const currentPage = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const categoryName = catalog?.categories.find((category) => category.id === categoryId)?.name;
  const brandName = catalog?.products.find((product) => product.brand_id === brandId)?.brandName;
  const hasActiveFilters = FILTER_KEYS.some(
    (key) => (key === 'q' && query.length > 0) || (key !== 'q' && searchParams.has(key)),
  );
  const showCuratedSections =
    !hasActiveFilters && !searchParams.has('sort') && !searchParams.has('page');

  const matchingProducts = useMemo(() => {
    if (!catalog) {
      return [];
    }
    return catalog.products
      .filter((product) => matchesSearch(product, query))
      .filter((product) => !categoryId || product.category_id === categoryId)
      .filter((product) => !brandId || product.brand_id === brandId)
      .filter((product) => minimumPrice === null || Number(product.price) >= minimumPrice)
      .filter((product) => maximumPrice === null || Number(product.price) <= maximumPrice)
      .filter((product) => searchParams.get('available') !== '1' || product.inStock)
      .filter((product) => searchParams.get('featured') !== '1' || product.featured)
      .filter(
        (product) =>
          searchParams.get('discounted') !== '1' ||
          (product.compare_price !== null && Number(product.compare_price) > Number(product.price)),
      )
      .filter((product) =>
        searchParams.get('new') !== '1'
          ? true
          : Date.parse(product.created_at) >= NEW_ARRIVAL_CUTOFF,
      )
      .sort((first, second) => {
        if (sort === 'newest') {
          return Date.parse(second.created_at) - Date.parse(first.created_at);
        }
        if (sort === 'price-asc') {
          return Number(first.price) - Number(second.price);
        }
        if (sort === 'price-desc') {
          return Number(second.price) - Number(first.price);
        }
        if (sort === 'name-asc') {
          return first.name.localeCompare(second.name);
        }
        if (sort === 'name-desc') {
          return second.name.localeCompare(first.name);
        }
        return (
          Number(second.featured) - Number(first.featured) ||
          Date.parse(second.created_at) - Date.parse(first.created_at)
        );
      });
  }, [catalog, query, categoryId, brandId, minimumPrice, maximumPrice, searchParams, sort]);

  const totalPages = Math.max(1, Math.ceil(matchingProducts.length / PAGE_SIZE));
  const products = matchingProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const featuredProducts = useMemo(
    () => catalog?.products.filter((product) => product.featured).slice(0, 4) ?? [],
    [catalog],
  );
  const newArrivals = useMemo(() => catalog?.products.slice(0, 4) ?? [], [catalog]);
  const resultCount = matchingProducts.length;

  useEffect(() => {
    if (currentPage > totalPages) {
      updateSearchParam(setSearchParams, searchParams, 'page', String(totalPages), false);
    }
  }, [currentPage, searchParams, setSearchParams, totalPages]);

  useEffect(() => {
    if (!catalog) {
      return;
    }
    const nextParams = new URLSearchParams(searchParams);
    const invalidBooleanKeys = ['available', 'featured', 'discounted', 'new'].filter(
      (key) => nextParams.has(key) && nextParams.get(key) !== '1',
    );
    for (const key of invalidBooleanKeys) {
      nextParams.delete(key);
    }
    if (nextParams.has('category') && !catalog.categories.some(({ id }) => id === categoryId)) {
      nextParams.delete('category');
    }
    const catalogBrandIds = new Set(catalog.brands.map(({ id }) => id));
    if (nextParams.has('brand') && !catalogBrandIds.has(brandId)) {
      nextParams.delete('brand');
    }
    for (const key of ['minPrice', 'maxPrice']) {
      if (nextParams.has(key) && getPositiveNumber(nextParams.get(key)) === null) {
        nextParams.delete(key);
      }
    }
    if (
      nextParams.has('sort') &&
      !SORT_OPTIONS.some(({ value }) => value === nextParams.get('sort'))
    ) {
      nextParams.delete('sort');
    }
    if (
      nextParams.has('page') &&
      (!Number.isInteger(Number(nextParams.get('page'))) || Number(nextParams.get('page')) < 1)
    ) {
      nextParams.delete('page');
    }
    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true, preventScrollReset: true });
    }
  }, [brandId, catalog, currentPage, categoryId, searchParams, setSearchParams]);

  const setParam = (key: string, value: string, resetPage = true) => {
    updateSearchParam(setSearchParams, searchParams, key, value, resetPage);
  };
  const clearFilters = () => clearSearchParams(setSearchParams, searchParams);
  const clearSearchAndFilters = () => clearSearchParams(setSearchParams, searchParams, true);
  const changePage = (page: number) => setParam('page', page > 1 ? String(page) : '', false);

  const activeChips = [
    ...(query ? [{ key: 'q', label: `Search: ${query}` }] : []),
    ...(categoryName ? [{ key: 'category', label: `Category: ${categoryName}` }] : []),
    ...(brandName ? [{ key: 'brand', label: `Brand: ${brandName}` }] : []),
    ...(minimumPrice !== null ? [{ key: 'minPrice', label: `From $${minimumPrice}` }] : []),
    ...(maximumPrice !== null ? [{ key: 'maxPrice', label: `Up to $${maximumPrice}` }] : []),
    ...(searchParams.has('available') ? [{ key: 'available', label: 'In stock' }] : []),
    ...(searchParams.has('featured') ? [{ key: 'featured', label: 'Featured' }] : []),
    ...(searchParams.has('discounted') ? [{ key: 'discounted', label: 'On offer' }] : []),
    ...(searchParams.has('new') ? [{ key: 'new', label: 'New arrivals' }] : []),
  ];

  return (
    <div className="shop-page">
      <header className="shop-hero">
        <motion.div
          className="shop-hero-copy"
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.62, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="shop-eyebrow">
            <Sparkles size={14} aria-hidden="true" /> THE AL SERA COLLECTION
          </p>
          <h1>
            Good things,
            <br />
            <em>chosen well.</em>
          </h1>
          <p className="shop-hero-description">
            Thoughtful finds for the everyday. Considered in form, made to be lived with.
          </p>
          {!isLoading && !error && catalog?.products.length ? (
            <a className="shop-hero-link" href="#all-products">
              Explore the collection <ArrowRight size={16} aria-hidden="true" />
            </a>
          ) : null}
        </motion.div>
        <div
          className={`shop-hero-art${shopHero.imageUrl ? ' shop-hero-art--image' : ''}`}
          aria-hidden={shopHero.imageUrl ? undefined : true}
        >
          {shopHero.imageUrl ? (
            <img
              className="shop-hero-art-image"
              src={shopHero.imageUrl}
              alt={shopHero.imageAlt}
              fetchPriority="high"
              decoding="async"
            />
          ) : (
            <>
              <span className="shop-hero-orbit shop-hero-orbit--one" />
              <span className="shop-hero-orbit shop-hero-orbit--two" />
              <span className="shop-hero-art-letter">A</span>
              <span className="shop-hero-art-caption">OBJECTS WITH INTENTION</span>
            </>
          )}
        </div>
      </header>
      {shopHeroError && (
        <p className="shop-banner-load-notice" role="status">
          {shopHeroError} The default artwork is shown instead.
        </p>
      )}

      {catalog?.categories.length ? (
        <nav className="shop-category-strip" aria-label="Available product categories">
          <span className="shop-category-label">IN THIS COLLECTION</span>
          <ul>
            {catalog.categories.map((category) => (
              <li key={category.id}>
                <button
                  type="button"
                  aria-pressed={categoryId === category.id}
                  onClick={() =>
                    setParam('category', categoryId === category.id ? '' : category.id)
                  }
                >
                  {category.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {isLoading ? (
        <section className="shop-loading" aria-label="Loading products" aria-busy="true">
          <div className="shop-section-heading">
            <div>
              <p className="shop-section-eyebrow">A FEW THINGS WE LOVE</p>
              <h2>Find your next favourite.</h2>
            </div>
          </div>
          <LoadingSkeleton variant="product" count={8} />
        </section>
      ) : error ? (
        <section className="shop-error" role="alert" aria-labelledby="shop-error-heading">
          <span>
            <AlertCircle size={23} aria-hidden="true" />
          </span>
          <h2 id="shop-error-heading">The collection is taking a moment.</h2>
          <p>{error}</p>
          <button type="button" onClick={() => void loadCatalog()}>
            <RefreshCw size={15} aria-hidden="true" /> Try again
          </button>
        </section>
      ) : !catalog?.products.length ? (
        <div className="shop-empty-state">
          <EmptyState type="products" />
        </div>
      ) : (
        <>
          {showCuratedSections && featuredProducts.length > 0 && (
            <section
              className="shop-collection shop-collection--featured"
              aria-labelledby="shop-featured-heading"
            >
              <div className="shop-section-heading">
                <div>
                  <p className="shop-section-eyebrow">
                    <span>01</span> THE AL SERA SELECTION
                  </p>
                  <h2 id="shop-featured-heading">Objects worth keeping.</h2>
                  <p>
                    Well-made things, chosen for the way they feel as much as the way they look.
                  </p>
                </div>
                <a href="#all-products">
                  View all <ArrowRight size={15} aria-hidden="true" />
                </a>
              </div>
              <div className="shop-product-grid">
                {featuredProducts.map((product, index) => (
                  <ShopProductCard key={`featured-${product.id}`} product={product} index={index} />
                ))}
              </div>
            </section>
          )}

          {showCuratedSections && newArrivals.length > 0 && (
            <section className="shop-collection" aria-labelledby="shop-arrivals-heading">
              <div className="shop-section-heading">
                <div>
                  <p className="shop-section-eyebrow">
                    <span>02</span> JUST FOUND THEIR WAY HERE
                  </p>
                  <h2 id="shop-arrivals-heading">A fresh point of view.</h2>
                  <p>New pieces with the feeling of something you have always known.</p>
                </div>
              </div>
              <div className="shop-product-grid">
                {newArrivals.map((product, index) => (
                  <ShopProductCard key={`arrival-${product.id}`} product={product} index={index} />
                ))}
              </div>
            </section>
          )}

          <section
            className="shop-collection shop-all shop-catalog-results"
            id="all-products"
            aria-labelledby="shop-all-heading"
          >
            <div className="shop-section-heading">
              <div>
                <p className="shop-section-eyebrow">
                  <span>{showCuratedSections ? '03' : '01'}</span>{' '}
                  {query
                    ? 'SEARCH RESULTS'
                    : hasActiveFilters
                      ? 'YOUR SELECTION'
                      : 'THE FULL COLLECTION'}
                </p>
                <h2 id="shop-all-heading">
                  {query
                    ? `Results for “${query}”`
                    : hasActiveFilters
                      ? 'Find your next favourite.'
                      : 'Find your next favourite.'}
                </h2>
              </div>
              <span className="shop-result-count" role="status" aria-live="polite">
                {resultCount} {resultCount === 1 ? 'piece' : 'pieces'}
              </span>
            </div>

            <div className="shop-result-toolbar">
              <button
                ref={filterTriggerRef}
                type="button"
                className="shop-mobile-filter-trigger"
                onClick={() => setIsFilterDrawerOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={isFilterDrawerOpen}
              >
                <SlidersHorizontal size={16} aria-hidden="true" />
                Filters
                {activeChips.length > 0 && <span>{activeChips.length}</span>}
              </button>
              <label className="shop-sort-control">
                <span>Sort by</span>
                <span className="shop-select-wrap">
                  <select
                    value={sort}
                    onChange={(event) => setParam('sort', event.target.value)}
                    aria-label="Sort products"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={15} aria-hidden="true" />
                </span>
              </label>
            </div>

            {activeChips.length > 0 && (
              <div className="shop-active-filters" aria-label="Active filters">
                {activeChips.map((chip) => (
                  <motion.button
                    key={chip.key}
                    type="button"
                    className="shop-filter-chip"
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    onClick={() => setParam(chip.key, '')}
                    aria-label={`Remove ${chip.label} filter`}
                  >
                    {chip.label} <X size={13} aria-hidden="true" />
                  </motion.button>
                ))}
                <button type="button" className="shop-clear-inline" onClick={clearFilters}>
                  Clear all
                </button>
              </div>
            )}

            <div className="shop-results-layout">
              <aside className="shop-filter-sidebar" aria-label="Product filters">
                <ShopFilters
                  catalog={catalog}
                  searchParams={searchParams}
                  setSearchParams={setSearchParams}
                  onClear={clearFilters}
                />
              </aside>

              <div className="shop-results-content">
                {products.length > 0 ? (
                  <motion.div
                    className="shop-product-grid"
                    layout
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: reduceMotion ? 0 : 0.2 }}
                  >
                    {products.map((product, index) => (
                      <ShopProductCard key={product.id} product={product} index={index} />
                    ))}
                  </motion.div>
                ) : (
                  <div className="shop-filter-empty" role="status">
                    <span className="shop-filter-empty-mark">
                      <SlidersHorizontal size={20} aria-hidden="true" />
                    </span>
                    <h3>No pieces found just yet.</h3>
                    <p>
                      Try a different search or ease a filter to discover more from the collection.
                    </p>
                    <button type="button" onClick={clearSearchAndFilters}>
                      Clear search and filters
                    </button>
                  </div>
                )}

                {resultCount > PAGE_SIZE && (
                  <nav className="shop-pagination" aria-label="Product pages">
                    <button
                      type="button"
                      onClick={() => changePage(currentPage - 1)}
                      disabled={currentPage <= 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={17} aria-hidden="true" /> Previous
                    </button>
                    <span aria-current="page">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => changePage(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                      aria-label="Next page"
                    >
                      Next <ChevronRight size={17} aria-hidden="true" />
                    </button>
                  </nav>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {!isLoading && !error && catalog?.products.length === 0 && (
        <div className="shop-return-home">
          <Link to="/">
            Back to AlSera <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      )}

      <AnimatePresence>
        {isFilterDrawerOpen && catalog && (
          <motion.div
            className="shop-filter-drawer-layer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              className="shop-filter-backdrop"
              type="button"
              aria-label="Close filters"
              onClick={() => setIsFilterDrawerOpen(false)}
            />
            <motion.aside
              ref={filterDrawerRef}
              className="shop-filter-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Filter products"
              initial={reduceMotion ? false : { x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: reduceMotion ? 0 : '100%' }}
              transition={{ duration: reduceMotion ? 0 : 0.22 }}
              onKeyDown={(event) => {
                if (event.key !== 'Tab' || !filterDrawerRef.current) {
                  return;
                }
                const focusableElements = filterDrawerRef.current.querySelectorAll<HTMLElement>(
                  'button:not([disabled]), select:not([disabled]), input:not([disabled])',
                );
                const firstElement = focusableElements.item(0);
                const lastElement = focusableElements.item(focusableElements.length - 1);
                if (event.shiftKey && document.activeElement === firstElement) {
                  event.preventDefault();
                  lastElement.focus();
                } else if (!event.shiftKey && document.activeElement === lastElement) {
                  event.preventDefault();
                  firstElement.focus();
                }
              }}
            >
              <ShopFilters
                catalog={catalog}
                searchParams={searchParams}
                setSearchParams={setSearchParams}
                onClear={clearFilters}
                onClose={() => setIsFilterDrawerOpen(false)}
              />
              <button
                type="button"
                className="shop-filter-show-results"
                onClick={() => setIsFilterDrawerOpen(false)}
              >
                Show {resultCount} {resultCount === 1 ? 'piece' : 'pieces'}
              </button>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
