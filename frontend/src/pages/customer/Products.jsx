import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api.js';
import ProductGrid from '../../components/customer/ProductGrid.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import Icon from '../../components/common/Icon.jsx';
import Seo from '../../components/common/Seo.jsx';
import { onRealtime } from '../../realtime/socket.js';

const SORTS = [
  ['popular', 'Popularity'],
  ['price_asc', 'Price: Low to High'],
  ['price_desc', 'Price: High to Low'],
  ['newest', 'Newest First'],
  ['rating', 'Customer Rating'],
];

const RATING_OPTS = [
  ['', 'Any rating'],
  ['4', '4★ & above'],
  ['3', '3★ & above'],
];

const PRICE_RANGES = [
  ['', 'All', '', ''],
  ['0-999', 'Under ₹999', '0', '999'],
  ['1000-4999', '₹1k – ₹5k', '1000', '4999'],
  ['5000-19999', '₹5k – ₹20k', '5000', '19999'],
  ['20000-', '₹20k & above', '20000', ''],
];

function FilterHeading({ children }) {
  return (
    <span className="text-xs font-bold uppercase tracking-wider text-sk-muted">{children}</span>
  );
}

function CheckRow({ label, count, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-lg p-1.5 transition hover:bg-sk-mist">
      <span className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="h-4 w-4 rounded border-gray-300 accent-sk-primary"
        />
        <span className={`text-sm ${checked ? 'font-semibold text-sk-ink' : 'text-sk-muted'}`}>{label}</span>
      </span>
      {count != null && (
        <span className="rounded-full bg-sk-mist px-2 py-0.5 text-[10px] font-semibold text-sk-muted">{count}</span>
      )}
    </label>
  );
}

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [pincode, setPincode] = useState(() => {
    try {
      return localStorage.getItem('sk_pincode') || '560103';
    } catch {
      return '560103';
    }
  });
  const [pinEdit, setPinEdit] = useState(false);
  const [pinDraft, setPinDraft] = useState('');

  const q = Object.fromEntries(searchParams.entries());

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data.data || [])).catch(() => {});
    api.get('/brands').then((r) => setBrands(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const cat = categories.find((c) => c.slug === q.category);
    if (cat?.slug) {
      api.get(`/categories/${cat.slug}`).then((r) => setSubcategories(r.data.data.subcategories || [])).catch(() => setSubcategories([]));
    } else {
      setSubcategories([]);
    }
  }, [q.category, categories]);

  useEffect(() => {
    loadProducts();
    const off = onRealtime('product:changed', () => loadProducts(true));
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const loadProducts = (silent = false) => {
    if (!silent) setLoading(true);
    const params = new URLSearchParams({ ...q, limit: q.limit || '20' });
    api
      .get(`/products?${params.toString()}`)
      .then((r) => {
        setProducts(r.data.data || []);
        setPagination(r.data.pagination || null);
      })
      .catch(() => {
        setProducts([]);
        setPagination(null);
      })
      .finally(() => setLoading(false));
  };

  const update = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value === '' || value === undefined || value === null) next.delete(key);
    else next.set(key, value);
    next.delete('page');
    setSearchParams(next);
  };

  const toggleMulti = (key, value) => {
    const current = (q[key] || '').split(',').filter(Boolean);
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    update(key, next.join(','));
  };

  const clearAll = () => setSearchParams({});

  const savePincode = () => {
    const v = pinDraft.trim();
    if (/^\d{6}$/.test(v)) {
      setPincode(v);
      try {
        localStorage.setItem('sk_pincode', v);
      } catch {}
    }
    setPinEdit(false);
    setPinDraft('');
  };

  // Applied filter chips
  const chips = [];
  if (q.category) {
    const c = categories.find((x) => x.slug === q.category);
    chips.push(['Category', c?.name || q.category, () => { update('category', ''); update('subcategory', ''); }]);
  }
  if (q.subcategory) {
    const s = subcategories.find((x) => x.slug === q.subcategory);
    chips.push(['Sub-category', s?.name || q.subcategory, () => update('subcategory', '')]);
  }
  (q.brand || '').split(',').filter(Boolean).forEach((slug) => {
    const b = brands.find((x) => x.slug === slug);
    chips.push(['Brand', b?.name || slug, () => toggleMulti('brand', slug)]);
  });
  if (q.minPrice || q.maxPrice) {
    chips.push(['Price', `₹${q.minPrice || '0'} – ₹${q.maxPrice || '∞'}`, () => { update('minPrice', ''); update('maxPrice', ''); }]);
  }
  if (q.rating) chips.push(['Rating', `${q.rating}★ & above`, () => update('rating', '')]);
  if (q.inStock === 'true') chips.push(['Availability', 'In stock only', () => update('inStock', '')]);
  if (q.color) chips.push(['Colour', q.color, () => update('color', '')]);
  if (q.size) chips.push(['Size', q.size, () => update('size', '')]);

  const activeCat = categories.find((c) => c.slug === q.category);

  const Filters = (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon name="tune" className="text-[20px] text-sk-primary" />
          <span className="font-display text-[15px] font-bold text-sk-ink">Filters</span>
        </div>
        <button onClick={clearAll} className="text-xs font-semibold text-sk-primary hover:underline">
          Clear All
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <FilterHeading>Category</FilterHeading>
        <div className="space-y-0.5">
          {categories.map((c) => (
            <CheckRow
              key={c.id}
              label={c.name}
              count={c.productCount ?? c.count}
              checked={q.category === c.slug}
              onChange={() => {
                update('category', q.category === c.slug ? '' : c.slug);
                update('subcategory', '');
              }}
            />
          ))}
        </div>
      </div>

      {subcategories.length > 0 && (
        <div className="flex flex-col gap-2">
          <FilterHeading>Sub-category</FilterHeading>
          <select value={q.subcategory || ''} onChange={(e) => update('subcategory', e.target.value)} className="input">
            <option value="">All Sub-categories</option>
            {subcategories.map((s) => (
              <option key={s.id} value={s.slug}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <FilterHeading>Brands</FilterHeading>
        <div className="max-h-48 space-y-0.5 overflow-y-auto">
          {brands.map((b) => (
            <CheckRow
              key={b.id}
              label={b.name}
              count={b.productCount ?? b.count}
              checked={(q.brand || '').split(',').includes(b.slug)}
              onChange={() => toggleMulti('brand', b.slug)}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <FilterHeading>Price Window</FilterHeading>
          {(q.minPrice || q.maxPrice) && (
            <span className="text-[10px] font-bold text-sk-primary">₹{q.minPrice || '0'} – ₹{q.maxPrice || '∞'}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            placeholder="Min"
            value={q.minPrice || ''}
            onChange={(e) => update('minPrice', e.target.value)}
            className="input"
            aria-label="Minimum price"
          />
          <span className="text-sk-outline">–</span>
          <input
            type="number"
            min="0"
            placeholder="Max"
            value={q.maxPrice || ''}
            onChange={(e) => update('maxPrice', e.target.value)}
            className="input"
            aria-label="Maximum price"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRICE_RANGES.map(([key, label, mn, mx]) => {
            const active = (q.minPrice || '') === mn && (q.maxPrice || '') === mx;
            return (
              <button
                key={key}
                onClick={() => {
                  update('minPrice', mn);
                  update('maxPrice', mx);
                }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  active ? 'bg-sk-mist-3 font-bold text-sk-primary' : 'bg-sk-mist text-sk-muted hover:bg-sk-mist-2'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <FilterHeading>Customer Rating</FilterHeading>
        <div className="space-y-0.5">
          {RATING_OPTS.map(([v, l]) => (
            <label key={v} className="flex cursor-pointer items-center gap-2 rounded-lg p-1.5 transition hover:bg-sk-mist">
              <input
                type="radio"
                name="rating"
                checked={(q.rating || '') === v}
                onChange={() => update('rating', v)}
                className="h-4 w-4 accent-sk-primary"
              />
              <span className={`flex items-center gap-1 text-sm ${(q.rating || '') === v ? 'font-semibold text-sk-ink' : 'text-sk-muted'}`}>
                {l}
                {v && <Icon name="star" filled className="text-[16px] text-sk-amber" />}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <FilterHeading>Availability</FilterHeading>
        <CheckRow
          label="In stock only"
          checked={q.inStock === 'true'}
          onChange={() => update('inStock', q.inStock === 'true' ? '' : 'true')}
        />
      </div>

      <div className="flex flex-col gap-2">
        <FilterHeading>Colour</FilterHeading>
        <input placeholder="e.g. Black, Blue" value={q.color || ''} onChange={(e) => update('color', e.target.value)} className="input" />
      </div>

      <div className="flex flex-col gap-2">
        <FilterHeading>Size</FilterHeading>
        <input placeholder="e.g. M, 42, 6GB" value={q.size || ''} onChange={(e) => update('size', e.target.value)} className="input" />
      </div>
    </div>
  );

  return (
    <div className="flex w-full flex-col">
      <Seo
        title={activeCat?.name || (q.search ? `Results for "${q.search}"` : 'All Products')}
        description={activeCat?.name ? `Shop ${activeCat.name} online at best prices on ShopKart. ${pagination?.total || ''} products with fast delivery and easy returns.`.trim() : undefined}
        path={`/products${window.location.search}`}
      />
      {/* Breadcrumb + trust strip */}
      <section className="w-full bg-sk-mist">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-sk-muted">
            <Link to="/" className="flex items-center gap-1 transition hover:text-sk-primary">
              <Icon name="home" className="text-[16px]" />
              <span>Home</span>
            </Link>
            <Icon name="chevron_right" className="text-[14px] text-sk-outline" />
            <span className="font-semibold text-sk-ink">{activeCat?.name || 'All Products'}</span>
          </nav>
          <div className="flex w-fit items-center gap-1.5 rounded-full bg-white px-4 py-1 shadow-card">
            <Icon name="verified" filled className="text-[18px] text-sk-amber" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-sk-muted">
              100% Genuine Products • 7-Day Replacement Guarantee
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 py-6">
        <div className="flex flex-col items-start gap-6 lg:flex-row">
          {/* Sidebar */}
          <aside className="hidden w-[280px] shrink-0 lg:block">
            <div className="sk-card sticky top-40 p-5">{Filters}</div>
          </aside>

          {/* Main */}
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {/* Controls card */}
            <div className="sk-card flex flex-col gap-4 p-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h1 className="font-display text-[18px] font-bold text-sk-ink">
                    {activeCat?.name || (q.search ? `Results for "${q.search}"` : 'All Products')}
                  </h1>
                  {pagination && (
                    <p className="text-sm text-sk-muted">
                      Showing {(pagination.page - 1) * (pagination.limit || 20) + 1}–
                      {Math.min(pagination.page * (pagination.limit || 20), pagination.total)} of {pagination.total} items
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-sk-mist px-4 py-1.5">
                  <Icon name="pin_drop" className="text-[18px] text-sk-muted" />
                  {pinEdit ? (
                    <span className="flex items-center gap-1">
                      <input
                        value={pinDraft}
                        onChange={(e) => setPinDraft(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Pincode"
                        className="w-20 bg-transparent text-xs font-semibold text-sk-ink outline-none"
                        autoFocus
                      />
                      <button onClick={savePincode} className="text-[10px] font-bold uppercase text-sk-primary">
                        Save
                      </button>
                    </span>
                  ) : (
                    <>
                      <span className="text-xs font-semibold text-sk-ink">Deliver to {pincode}</span>
                      <button
                        onClick={() => {
                          setPinDraft(pincode);
                          setPinEdit(true);
                        }}
                        className="text-[10px] font-bold uppercase text-sk-primary hover:underline"
                      >
                        Change
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-xs font-bold uppercase tracking-wider text-sk-muted">Sort By:</span>
                {SORTS.map(([v, l]) => (
                  <button
                    key={v}
                    onClick={() => update('sort', v)}
                    className={`rounded-full px-4 py-1.5 text-xs transition ${
                      (q.sort || 'popular') === v
                        ? 'bg-sk-primary font-bold text-white shadow-sm'
                        : 'bg-sk-mist font-medium text-sk-ink hover:bg-sk-mist-2'
                    }`}
                  >
                    {l}
                  </button>
                ))}
                <button
                  onClick={() => setMobileFilters(true)}
                  className="ml-auto rounded-full bg-sk-mist px-4 py-1.5 text-xs font-bold text-sk-primary lg:hidden"
                >
                  Filters{chips.length > 0 && ` (${chips.length})`}
                </button>
              </div>

              {chips.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-sk-muted">Applied:</span>
                  {chips.map(([group, label, clear], i) => (
                    <span
                      key={`${group}-${label}-${i}`}
                      className="flex items-center gap-1.5 rounded-full bg-sk-mist-3 px-3 py-1 text-xs font-medium text-sk-ink"
                    >
                      {label}
                      <button onClick={clear} aria-label={`Remove ${label} filter`} className="transition hover:text-sk-danger">
                        <Icon name="close" className="text-[16px]" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Grid */}
            <ProductGrid
              products={products}
              loading={loading}
              emptyTitle="No products match your filters"
              emptyDescription="Try removing some filters or search for something else."
            />

            {/* Exchange callout */}
            <div className="sk-card flex flex-col items-center justify-between gap-4 p-5 md:flex-row">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sk-mist-2 text-sk-primary-deep">
                  <Icon name="published_with_changes" className="text-[28px]" />
                </div>
                <div>
                  <h3 className="font-display text-[15px] font-bold text-sk-ink">Doorstep Smartphone Exchange Program</h3>
                  <p className="text-sm text-sk-muted">Instant diagnostic evaluation with doorstep valuation pickup in 40+ Indian metros.</p>
                </div>
              </div>
              <Link to="/products?search=smartphone" className="sk-btn-mist shrink-0 !py-2.5">
                Check Old Phone Value
              </Link>
            </div>

            {pagination && pagination.totalPages > 1 && (
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                onChange={(p) => {
                  const next = new URLSearchParams(searchParams);
                  next.set('page', String(p));
                  setSearchParams(next);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter bottom sheet */}
      {mobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileFilters(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-sk-ink">Filters</h3>
              <button onClick={() => setMobileFilters(false)} className="rounded-lg p-1.5 hover:bg-sk-mist" aria-label="Close filters">
                <Icon name="close" className="text-[20px]" />
              </button>
            </div>
            {Filters}
            <button className="sk-btn-primary mt-4 w-full" onClick={() => setMobileFilters(false)}>
              Show results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
