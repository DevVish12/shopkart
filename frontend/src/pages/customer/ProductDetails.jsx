import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { imageUrl, apiErrorMessage } from '../../services/api.js';
import { productApi } from '../../features/products/index.js';
import { reviewApi } from '../../features/orders/index.js';
import { wishlistApi } from '../../features/wishlist/index.js';
import { checkoutApi } from '../../features/checkout/index.js';
import ProductGrid from '../../components/customer/ProductGrid.jsx';
import Loader from '../../components/common/Loader.jsx';
import Button from '../../components/common/Button.jsx';
import Modal from '../../components/common/Modal.jsx';
import Icon from '../../components/common/Icon.jsx';
import Seo, { productJsonLd, breadcrumbJsonLd } from '../../components/common/Seo.jsx';
import { productImageSrc } from '../../components/common/ProductImage.jsx';
import { formatPrice, formatDate } from '../../utils/formatPrice.js';
import { useCart } from '../../context/CartContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const RECENT_KEY = 'sk_recently_viewed';

function pushRecentlyViewed(item) {
  try {
    const cur = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    const next = [{ id: item.id, slug: item.slug, name: item.name, primaryImage: item.primaryImage, price: item.price, mrp: item.mrp }, ...cur.filter((x) => x.id !== item.id)].slice(0, 10);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}

function readRecentlyViewed() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

function ZoomImage({ src, alt }) {
  const [zoom, setZoom] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  return (
    <div
      className="relative flex min-h-[380px] cursor-zoom-in items-center justify-center overflow-hidden rounded-2xl bg-white p-6 shadow-card md:min-h-[470px]"
      onMouseEnter={() => setZoom(true)}
      onMouseLeave={() => setZoom(false)}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setPos({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
      }}
    >
      <img
        src={src}
        alt={alt}
        className="max-h-[420px] w-auto object-contain transition-transform duration-300"
        style={zoom ? { transform: 'scale(1.8)', transformOrigin: `${pos.x}% ${pos.y}%` } : undefined}
      />
      <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-sk-ink/80 px-4 py-1 text-[10px] font-medium text-white opacity-80 backdrop-blur">
        <Icon name="zoom_in" className="text-[14px]" />
        Hover to Magnify
      </div>
    </div>
  );
}

function PincodeChecker() {
  const [pin, setPin] = useState('');
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const check = async () => {
    if (!/^\d{6}$/.test(pin)) {
      setResult({ error: 'Enter a valid 6-digit pincode.' });
      return;
    }
    setChecking(true);
    try {
      const r = await checkoutApi.checkPincode(pin);
      setResult(r.serviceable ? { ok: true, ...r } : { ok: false });
    } catch {
      setResult({ error: 'Could not check this pincode right now.' });
    } finally {
      setChecking(false);
    }
  };
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-display text-[15px] font-bold text-sk-ink">
          <Icon name="local_shipping" className="text-[20px] text-sk-primary" />
          Check Delivery & Logistics Timeline
        </span>
        <span className="text-[10px] text-sk-muted">Verified Pincodes Only</span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Icon name="location_on" className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-sk-outline" />
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Enter delivery pincode"
            className="w-full rounded-full bg-sk-mist py-2.5 pl-10 pr-4 text-sm text-sk-ink outline-none placeholder:text-sk-outline focus:ring-2 focus:ring-sk-primary"
            inputMode="numeric"
          />
        </div>
        <button
          onClick={check}
          disabled={checking}
          className="rounded-full bg-sk-mist-3 px-6 py-2.5 text-xs font-bold text-sk-primary transition hover:bg-sk-mist-2 disabled:opacity-60"
        >
          {checking ? 'Checking…' : 'Check'}
        </button>
      </div>
      {result?.ok && (
        <div className="mt-2 flex items-start gap-1.5 text-sm">
          <Icon name="check_circle" filled className="mt-0.5 shrink-0 text-[18px] text-sk-primary" />
          <div>
            <span className="font-bold text-sk-primary">
              Delivery available{result.estimatedDays ? ` — ${result.estimatedDays}` : ''}
            </span>
            {result.freeAbove ? (
              <p className="text-xs text-sk-muted">Free shipping above {formatPrice(result.freeAbove)} (charge {formatPrice(result.charge)})</p>
            ) : (
              <p className="text-xs text-sk-muted">Delivery charge {formatPrice(result.charge)}</p>
            )}
          </div>
        </div>
      )}
      {result && !result.ok && !result.error && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-sk-danger">
          <Icon name="error" className="text-[18px]" /> Sorry, we do not deliver to this pincode yet.
        </p>
      )}
      {result?.error && <p className="mt-2 text-sm text-sk-danger">{result.error}</p>}
    </div>
  );
}

function couponLabel(c) {
  if (c.type === 'percentage') return `${c.value}% off${c.max_discount ? ` up to ${formatPrice(c.max_discount)}` : ''}`;
  return `${formatPrice(c.value)} off`;
}

export default function ProductDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [activeImg, setActiveImg] = useState(0);
  const [selSize, setSelSize] = useState('');
  const [selColor, setSelColor] = useState('');
  const [qty, setQty] = useState(1);
  const [recently, setRecently] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(null);
  const [revPage, setRevPage] = useState(1);
  const [revPagination, setRevPagination] = useState(null);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState('specs');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '' });
  const [reviewFiles, setReviewFiles] = useState([]);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewMsg, setReviewMsg] = useState('');
  const [activeCoupons, setActiveCoupons] = useState([]);
  const carouselRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setActiveImg(0);
    setSelSize('');
    setSelColor('');
    setQty(1);
    setRevPage(1);
    setActiveTab('specs');
    productApi
      .detail(slug)
      .then((data) => {
        setProduct(data.product);
        setRelated(data.related || []);
        setBreadcrumbs(data.breadcrumbs || []);
        pushRecentlyViewed({ id: data.product.id, slug: data.product.slug, name: data.product.name, primaryImage: data.product.images?.[0]?.image_url || data.product.primaryImage, price: data.product.price, mrp: data.product.mrp });
        setRecently(readRecentlyViewed().filter((x) => x.slug !== data.product.slug).slice(0, 8));
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    api
      .get('/coupons/active')
      .then((r) => setActiveCoupons(Array.isArray(r.data?.data) ? r.data.data : []))
      .catch(() => setActiveCoupons([]));
  }, []);

  useEffect(() => {
    if (!slug) return;
    productApi
      .reviews(slug, { page: revPage })
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : [];
        setReviews(revPage === 1 ? list : [...reviews, ...list]);
        setRevPagination(r.pagination || null);
        setSummary(r.summary || null);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, revPage]);

  if (loading) return <Loader fullPage />;
  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-sk-ink">Product not found</h1>
        <p className="mt-2 text-sk-muted">This product may have been removed.</p>
        <Link to="/products" className="sk-btn-primary mt-6 inline-flex">Browse products</Link>
      </div>
    );
  }

  const images = product.images?.length ? product.images : [{ id: 0, image_url: product.primaryImage }];
  const variants = product.variants || [];
  const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))];
  const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))];

  let matchedVariant = null;
  if (variants.length) {
    matchedVariant = variants.find(
      (v) => (!selSize || v.size === selSize) && (!selColor || v.color === selColor)
    ) || null;
  }

  const basePrice = product.isFlashSale && product.flashSalePrice ? product.flashSalePrice : product.price;
  const unitPrice = matchedVariant?.price ?? basePrice;
  const unitMrp = matchedVariant?.mrp ?? product.mrp;
  const stock = matchedVariant ? matchedVariant.stock : product.stock;
  const discountPct = unitMrp > unitPrice ? Math.round(((unitMrp - unitPrice) / unitMrp) * 100) : 0;
  const savings = unitMrp > unitPrice ? unitMrp - unitPrice : 0;

  const guardLogin = (fn) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/products/${slug}` } });
      return;
    }
    fn();
  };

  const doAdd = async (goToCart) => {
    guardLogin(async () => {
      if (variants.length && sizes.length && !selSize) {
        setToast('Please select a size first.');
        return;
      }
      if (variants.length && colors.length && !selColor) {
        setToast('Please select a colour first.');
        return;
      }
      setAdding(true);
      const r = await addItem(product.id, matchedVariant?.id, qty);
      setAdding(false);
      if (r.ok) {
        if (goToCart) navigate('/cart');
        else setToast('Added to cart.');
      } else {
        setToast(r.message);
      }
    });
  };

  const doWishlist = () =>
    guardLogin(async () => {
      try {
        await wishlistApi.add(product.id);
        setToast('Added to wishlist.');
      } catch (err) {
        setToast(apiErrorMessage(err, 'Already in wishlist.'));
      }
    });

  const submitReview = async () => {
    guardLogin(async () => {
      setReviewSaving(true);
      setReviewMsg('');
      try {
        const fd = new FormData();
        fd.append('productId', product.id);
        fd.append('rating', reviewForm.rating);
        fd.append('title', reviewForm.title);
        fd.append('comment', reviewForm.comment);
        reviewFiles.forEach((f) => fd.append('images[]', f));
        await reviewApi.create(fd);
        setReviewMsg('Review submitted — it will appear after approval.');
        setReviewOpen(false);
        setReviewForm({ rating: 5, title: '', comment: '' });
        setReviewFiles([]);
      } catch (err) {
        setReviewMsg(apiErrorMessage(err, 'Could not submit review.'));
      } finally {
        setReviewSaving(false);
      }
    });
  };

  const highlights = [
    ['storefront', product.brand?.name || 'Genuine Brand', product.category?.name || 'Quality assured'],
    ['verified', 'GST Invoice Available', 'For business claims'],
    ['published_with_changes', '7-Day Replacement', 'No-question returns'],
    ['local_shipping', stock > 0 ? 'In Stock — Fast Dispatch' : 'Currently Out of Stock', 'Ships across India'],
  ];

  const specGroups = [
    ['General Details', [
      ['SKU', product.sku],
      ['Brand', product.brand?.name],
      ['Category', product.category?.name],
      ['Model', product.model || product.sku],
    ]],
    ['Pricing & Tax', [
      ['Price', formatPrice(product.price)],
      ['MRP', formatPrice(product.mrp)],
      ['GST', product.gst_percent != null ? `${product.gst_percent}%` : null],
    ]],
    ['Physical', [
      ['Weight', product.weight_kg ? `${product.weight_kg} kg` : null],
      ['Dimensions', product.dimensions],
    ]],
  ];

  const tabs = [
    ['specs', 'Technical Specifications'],
    ['description', 'Product Story & Overview'],
    ['reviews', `Customer Reviews${summary?.count ? ` (${summary.count})` : ''}`],
  ];

  return (
    <div className="flex w-full flex-col pb-16 md:pb-0">
      <Seo
        title={product.name}
        description={`${product.name} — buy online at ${formatPrice(unitPrice)}${discountPct > 0 ? ` (${discountPct}% off)` : ''}. ${product.brand?.name ? `Brand: ${product.brand.name}. ` : ''}Free delivery options, easy returns on ShopKart.`}
        path={`/products/${product.slug}`}
        image={imageUrl(images[0]?.image_url)}
        jsonLd={[
          productJsonLd(product, imageUrl(images[0]?.image_url)),
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            ...breadcrumbs.map((b) => ({ name: b.name, url: `/products?category=${b.slug}` })),
            { name: product.name },
          ]),
        ]}
      />
      {/* Micro breadcrumb strip */}
      <section className="w-full bg-white shadow-[0_1px_4px_rgba(11,28,48,0.05)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2.5">
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-xs text-sk-muted">
            <Link to="/" className="transition hover:text-sk-primary">Home</Link>
            <Icon name="chevron_right" className="text-[14px]" />
            {breadcrumbs.map((b) => (
              <React.Fragment key={b.slug}>
                <Link to={`/products?category=${b.slug}`} className="transition hover:text-sk-primary">{b.name}</Link>
                <Icon name="chevron_right" className="text-[14px]" />
              </React.Fragment>
            ))}
            <span className="max-w-[220px] truncate font-semibold text-sk-ink md:max-w-none">{product.name}</span>
          </nav>
          <div className="hidden items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-sk-muted md:flex">
            {product.isFlashSale && (
              <span className="flex items-center gap-1 text-sk-amber-text">
                <Icon name="bolt" filled className="text-[16px]" />
                Flash Sale{stock <= 15 && `: ${stock} units left`}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Icon name="verified" filled className="text-[16px] text-sk-amber" />
              100% Genuine Assured
            </span>
          </div>
        </div>
      </section>

      {/* Main two-column */}
      <section className="w-full py-6">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-6 px-4 lg:grid-cols-12">
          {/* Left — sticky gallery */}
          <div className="space-y-4 lg:col-span-5 lg:sticky lg:top-40">
            <div className="flex flex-col-reverse gap-3 md:flex-row">
              {images.length > 1 && (
                <div className="flex shrink-0 gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
                  {images.map((img, i) => (
                    <button
                      key={img.id || i}
                      onClick={() => setActiveImg(i)}
                      className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-sk-mist p-1 shadow-card transition ${
                        i === activeImg ? 'ring-2 ring-sk-primary' : 'hover:ring-2 hover:ring-sk-mist-3'
                      }`}
                      aria-label={`View image ${i + 1}`}
                    >
                      <img src={imageUrl(img.image_url)} alt="" className="h-full w-full object-contain" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
              <div className="relative flex-1">
                <div className="absolute left-4 top-4 z-10 flex flex-col gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-sk-mist-2 px-3 py-1 text-[10px] font-bold text-sk-primary shadow-sm">
                    <Icon name="verified" filled className="text-[14px]" />
                    ShopKart Assured
                  </span>
                  {discountPct > 0 && (
                    <span className="inline-flex w-fit items-center rounded-full bg-sk-amber-soft px-3 py-0.5 text-[10px] font-bold text-sk-amber-text">
                      {discountPct}% OFF
                    </span>
                  )}
                </div>
                <div className="absolute right-4 top-4 z-10 flex flex-col gap-2">
                  <button
                    onClick={doWishlist}
                    aria-label="Add to wishlist"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-sk-mist text-sk-muted shadow-sm transition hover:text-sk-danger"
                  >
                    <Icon name="favorite" className="text-[20px]" />
                  </button>
                  <button
                    aria-label="Share product"
                    onClick={() => {
                      try {
                        navigator.clipboard?.writeText(window.location.href);
                        setToast('Product link copied to clipboard.');
                      } catch {
                        setToast('Could not copy link.');
                      }
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-sk-mist text-sk-muted shadow-sm transition hover:text-sk-primary"
                  >
                    <Icon name="share" className="text-[20px]" />
                  </button>
                </div>
                <ZoomImage src={productImageSrc(images[activeImg]?.image_url)} alt={product.name} />
              </div>
            </div>

            <div className="rounded-xl bg-white p-4 shadow-card">
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  ['verified_user', '1-Year Warranty', 'Brand India'],
                  ['sync', '7-Day Return', 'Hassle Free Swap'],
                  ['security', '100% Safe Pay', 'Encrypted Vault'],
                ].map(([icon, t, s]) => (
                  <div key={t} className="flex flex-col items-center gap-1">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sk-mist-3 text-sk-primary">
                      <Icon name={icon} className="text-[20px]" />
                    </div>
                    <span className="text-xs font-semibold text-sk-ink">{t}</span>
                    <span className="text-[10px] text-sk-muted">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right — info column */}
          <div className="space-y-4 lg:col-span-7">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {product.brand?.name && (
                  <Link
                    to={`/products?brand=${product.brand.slug}`}
                    className="inline-flex items-center gap-1 rounded-full bg-sk-mist-2 px-3 py-0.5 text-[10px] font-bold text-sk-primary transition hover:bg-sk-primary hover:text-white"
                  >
                    {product.brand.name}
                    <Icon name="check_circle" filled className="text-[14px]" />
                  </Link>
                )}
                <span className="text-[10px] uppercase tracking-wider text-sk-muted">SKU: {product.sku}</span>
              </div>
              <h1 className="font-display text-[26px] font-bold leading-snug text-sk-ink">{product.name}</h1>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {product.ratingAvg > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-sk-green px-2 py-0.5 text-xs font-bold text-white">
                    {Number(product.ratingAvg).toFixed(1)}
                    <Icon name="star" filled className="text-[14px]" />
                  </span>
                ) : (
                  <span className="rounded-full bg-sk-mist px-3 py-0.5 text-xs font-bold text-sk-muted">New</span>
                )}
                <a href="#reviews" onClick={() => setActiveTab('reviews')} className="text-xs font-medium text-sk-primary hover:underline">
                  {product.ratingCount || 0} ratings
                </a>
                <span className="text-sk-mist-3">•</span>
                <span className="flex items-center gap-1 text-xs font-medium text-sk-green">
                  <Icon name="trending_up" className="text-[16px]" />
                  In demand this week
                </span>
              </div>
            </div>

            {/* Price card */}
            <div className="space-y-2 rounded-2xl bg-white p-5 shadow-card">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="font-display text-[28px] font-extrabold tracking-tight text-sk-ink">{formatPrice(unitPrice)}</span>
                {unitMrp > unitPrice && (
                  <>
                    <span className="font-display text-[18px] text-sk-outline line-through">{formatPrice(unitMrp)}</span>
                    <span className="inline-flex items-center rounded-full bg-sk-mist-2 px-3 py-0.5 font-display text-[15px] font-bold text-sk-primary">
                      {discountPct}% OFF (Save {formatPrice(savings)})
                    </span>
                  </>
                )}
              </div>
              <p className="text-[10px] text-sk-muted">Inclusive of all taxes & free express shipping</p>
              <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
                <div className="flex items-center gap-2 rounded-xl bg-sk-mist p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-sk-primary shadow-sm">
                    <Icon name="credit_card" className="text-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-sk-ink">No Cost EMI available</p>
                    <p className="text-[10px] text-sk-muted">Across major banks</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-sk-mist p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-sk-amber shadow-sm">
                    <Icon name="monetization_on" className="text-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-sk-ink">Earn SuperCoins</p>
                    <p className="text-[10px] text-sk-muted">Redeem on next orders</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Variants */}
            {(sizes.length > 0 || colors.length > 0) && (
              <div className="space-y-4 rounded-2xl bg-white p-5 shadow-card">
                {colors.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-display text-[15px] font-bold text-sk-ink">
                        Select Colour{selColor ? <span className="font-normal text-sk-muted">: {selColor}</span> : ''}
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {colors.map((c) => (
                        <button
                          key={c}
                          onClick={() => setSelColor(selColor === c ? '' : c)}
                          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition ${
                            selColor === c
                              ? 'bg-sk-mist-2 font-bold text-sk-primary shadow-sm ring-2 ring-sk-primary'
                              : 'bg-sk-mist text-sk-ink hover:bg-sk-mist-2'
                          }`}
                        >
                          <span className="h-4 w-4 rounded-full bg-sk-outline/40" />
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {sizes.length > 0 && (
                  <div className="space-y-2">
                    <label className="font-display text-[15px] font-bold text-sk-ink">
                      Select Size{selSize ? <span className="font-normal text-sk-muted">: {selSize}</span> : ''}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {sizes.map((s) => (
                        <button
                          key={s}
                          onClick={() => setSelSize(selSize === s ? '' : s)}
                          className={`rounded-xl p-3 text-left transition ${
                            selSize === s ? 'bg-sk-mist-2 ring-2 ring-sk-primary' : 'bg-sk-mist hover:bg-sk-mist-2'
                          }`}
                        >
                          <span className={`block font-display text-[15px] font-bold ${selSize === s ? 'text-sk-primary' : 'text-sk-ink'}`}>{s}</span>
                          <span className="text-[10px] text-sk-muted">{stock > 0 ? 'In Stock' : 'Out of stock'}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Qty + CTAs */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <div className="flex items-center rounded-full bg-sk-mist p-1 shadow-sm">
                    <button onClick={() => setQty((n) => Math.max(1, n - 1))} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sk-ink transition hover:bg-sk-mist-2" aria-label="Decrease quantity">
                      <Icon name="remove" className="text-[18px]" />
                    </button>
                    <span className="w-10 text-center font-display text-[15px] font-bold text-sk-ink">{qty}</span>
                    <button onClick={() => setQty((n) => Math.min(stock || 99, n + 1))} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sk-ink transition hover:bg-sk-mist-2" aria-label="Increase quantity">
                      <Icon name="add" className="text-[18px]" />
                    </button>
                  </div>
                  <div className="flex min-w-[280px] flex-1 items-center gap-3">
                    <button
                      onClick={() => doAdd(false)}
                      disabled={adding || stock === 0}
                      className="sk-btn-mist h-12 flex-1 disabled:opacity-60"
                    >
                      <Icon name="shopping_cart" className="text-[20px]" />
                      <span>{adding ? 'Adding…' : 'Add to Cart'}</span>
                    </button>
                    <button
                      onClick={() => doAdd(true)}
                      disabled={adding || stock === 0}
                      className="sk-btn-primary h-12 flex-1 shadow-[0_4px_14px_rgba(0,86,195,0.3)] disabled:opacity-60"
                    >
                      <Icon name="bolt" filled className="text-[20px]" />
                      <span>Buy Now</span>
                    </button>
                  </div>
                </div>
                {stock > 0 && stock <= 10 && (
                  <p className="text-xs font-bold text-sk-danger">Hurry — only {stock} left in stock!</p>
                )}
                {stock === 0 && <p className="text-sm font-bold text-sk-danger">Out of stock</p>}
              </div>
            )}

            {/* Qty + CTAs when no variants */}
            {sizes.length === 0 && colors.length === 0 && (
              <div className="rounded-2xl bg-white p-5 shadow-card">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center rounded-full bg-sk-mist p-1 shadow-sm">
                    <button onClick={() => setQty((n) => Math.max(1, n - 1))} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sk-ink transition hover:bg-sk-mist-2" aria-label="Decrease quantity">
                      <Icon name="remove" className="text-[18px]" />
                    </button>
                    <span className="w-10 text-center font-display text-[15px] font-bold text-sk-ink">{qty}</span>
                    <button onClick={() => setQty((n) => Math.min(stock || 99, n + 1))} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sk-ink transition hover:bg-sk-mist-2" aria-label="Increase quantity">
                      <Icon name="add" className="text-[18px]" />
                    </button>
                  </div>
                  <div className="flex min-w-[280px] flex-1 items-center gap-3">
                    <button onClick={() => doAdd(false)} disabled={adding || stock === 0} className="sk-btn-mist h-12 flex-1 disabled:opacity-60">
                      <Icon name="shopping_cart" className="text-[20px]" />
                      <span>{adding ? 'Adding…' : 'Add to Cart'}</span>
                    </button>
                    <button onClick={() => doAdd(true)} disabled={adding || stock === 0} className="sk-btn-primary h-12 flex-1 shadow-[0_4px_14px_rgba(0,86,195,0.3)] disabled:opacity-60">
                      <Icon name="bolt" filled className="text-[20px]" />
                      <span>Buy Now</span>
                    </button>
                  </div>
                </div>
                {stock > 0 && stock <= 10 && (
                  <p className="mt-2 text-xs font-bold text-sk-danger">Hurry — only {stock} left in stock!</p>
                )}
                {stock === 0 && <p className="mt-2 text-sm font-bold text-sk-danger">Out of stock</p>}
              </div>
            )}

            {toast && (
              <div className="rounded-xl bg-sk-ink px-4 py-2.5 text-sm text-white" role="status">
                {toast}
              </div>
            )}

            <PincodeChecker />

            {/* Offers — real: product discount + live coupon codes */}
            <div className="space-y-2 rounded-2xl bg-white p-5 shadow-card">
              <h3 className="flex items-center gap-2 font-display text-[15px] font-bold text-sk-ink">
                <Icon name="sell" className="text-[20px] text-sk-amber" />
                Available Offers
              </h3>
              <div className="space-y-2">
                {discountPct > 0 && (
                  <div className="flex items-start gap-2 rounded-xl bg-sk-mist p-3">
                    <Icon name="percent" className="mt-0.5 shrink-0 text-[20px] text-sk-primary" />
                    <div>
                      <p className="text-xs font-bold text-sk-ink">Special Price: {discountPct}% off</p>
                      <p className="text-[10px] text-sk-muted">Limited-time deal on this product. T&amp;C apply.</p>
                    </div>
                  </div>
                )}
                {activeCoupons.map((c) => (
                  <div key={c.code} className="flex items-start justify-between gap-3 rounded-xl bg-sk-mist p-3">
                    <div className="flex items-start gap-2">
                      <Icon name="confirmation_number" className="mt-0.5 shrink-0 text-[20px] text-sk-primary" />
                      <div>
                        <p className="text-xs font-bold text-sk-ink">{couponLabel(c)}</p>
                        <p className="text-[10px] text-sk-muted">
                          {c.min_order_amount > 0 ? `On orders above ${formatPrice(c.min_order_amount)}. ` : ''}
                          {c.first_order_only ? 'First order only. ' : ''}T&amp;C apply.
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-md border border-dashed border-sk-primary bg-white px-2 py-0.5 font-mono text-xs font-bold text-sk-primary">
                      {c.code}
                    </span>
                  </div>
                ))}
                {discountPct === 0 && activeCoupons.length === 0 && (
                  <p className="rounded-xl bg-sk-mist p-3 text-xs text-sk-muted">No special offers on this product right now — check back during sale events.</p>
                )}
              </div>
            </div>

            {/* Highlights */}
            <div className="space-y-2 rounded-2xl bg-white p-5 shadow-card">
              <h3 className="font-display text-[15px] font-bold text-sk-ink">Product Highlights</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {highlights.map(([icon, t, s]) => (
                  <div key={t} className="flex items-center gap-2 rounded-xl bg-sk-mist p-3">
                    <Icon name={icon} className="text-[22px] text-sk-primary" />
                    <div>
                      <span className="block text-xs font-bold text-sk-ink">{t}</span>
                      <span className="text-[10px] text-sk-muted">{s}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section id="reviews" className="w-full bg-sk-mist py-8">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center gap-6 overflow-x-auto border-b-2 border-sk-mist-3" role="tablist">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={activeTab === id}
                onClick={() => setActiveTab(id)}
                className={`whitespace-nowrap pb-3 font-display text-[15px] font-bold transition ${
                  activeTab === id ? '-mb-[2px] border-b-2 border-sk-primary text-sk-primary' : 'text-sk-muted hover:text-sk-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {activeTab === 'specs' && (
              <div className="rounded-2xl bg-white p-6 shadow-card md:p-8">
                <h2 className="mb-4 font-display text-[18px] font-bold text-sk-ink">Full Technical Specifications</h2>
                <div className="grid grid-cols-1 gap-x-12 gap-y-6 md:grid-cols-2">
                  {specGroups.map(([group, rows]) => (
                    <div key={group} className="border-b border-sk-mist-2 pb-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sk-muted">{group}</span>
                      {rows.filter(([, v]) => v).map(([k, v]) => (
                        <div key={k} className="mt-2 flex justify-between gap-4">
                          <span className="text-xs text-sk-muted">{k}</span>
                          <span className="text-right text-xs font-semibold text-sk-ink">{v}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                  {variants.length > 0 && (
                    <div className="border-b border-sk-mist-2 pb-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sk-muted">Variants</span>
                      {variants.slice(0, 6).map((v) => (
                        <div key={v.id} className="mt-2 flex justify-between gap-4">
                          <span className="text-xs text-sk-muted">{[v.color, v.size].filter(Boolean).join(' / ')}</span>
                          <span className="text-right text-xs font-semibold text-sk-ink">{formatPrice(v.price ?? product.price)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'description' && (
              <div className="space-y-4 rounded-2xl bg-white p-6 shadow-card md:p-8">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sk-primary">Product Story</span>
                  <h3 className="mt-1 font-display text-[26px] font-bold text-sk-ink">{product.name}</h3>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-sk-muted">
                    {product.description || product.short_description || 'No description available for this product.'}
                  </p>
                </div>
                {product.short_description && product.description && (
                  <p className="rounded-xl bg-sk-mist p-4 text-sm leading-relaxed text-sk-ink">{product.short_description}</p>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="rounded-2xl bg-white p-6 shadow-card md:p-8">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                  <div className="space-y-4 lg:col-span-4">
                    <div className="rounded-2xl bg-sk-mist p-4 text-center">
                      <span className="font-display text-[40px] font-extrabold text-sk-ink">
                        {Number(summary?.avg || product.ratingAvg || 0).toFixed(1)}
                      </span>
                      <div className="my-1 flex items-center justify-center gap-0.5 text-sk-amber">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Icon key={i} name={i <= Math.round(summary?.avg || product.ratingAvg || 0) ? 'star' : 'star'} filled={i <= Math.round(summary?.avg || product.ratingAvg || 0)} className="text-[20px]" />
                        ))}
                      </div>
                      <span className="text-xs text-sk-muted">Based on {summary?.count ?? product.ratingCount ?? 0} verified ratings</span>
                    </div>
                    {summary && (
                      <div className="space-y-1.5">
                        {[5, 4, 3, 2, 1].map((s) => {
                          const n = summary.buckets?.[s] || 0;
                          const pct = summary.count ? (n / summary.count) * 100 : 0;
                          return (
                            <div key={s} className="flex items-center gap-2 text-xs">
                              <span className="w-8 font-semibold text-sk-ink">{s} ★</span>
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-sk-mist-3">
                                <div className="h-full rounded-full bg-sk-primary" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="w-10 text-right text-sk-muted">{pct.toFixed(0)}%</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <button onClick={() => setReviewOpen(true)} className="sk-btn-mist w-full !py-2.5">
                      Write a Customer Review
                    </button>
                  </div>

                  <div className="space-y-4 lg:col-span-8">
                    <div className="flex items-center justify-between border-b border-sk-mist-2 pb-2">
                      <span className="font-display text-[15px] font-bold text-sk-ink">Top Verified Reviews</span>
                    </div>
                    {reviews.map((r) => (
                      <div key={r.id} className="space-y-1.5 rounded-xl bg-sk-mist p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sk-primary text-[10px] font-bold text-white">
                              {(r.userName || 'S').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="block font-display text-[15px] font-bold text-sk-ink">{r.userName}</span>
                              <span className="flex items-center gap-1 text-[10px] text-sk-primary">
                                <Icon name="verified" filled className="text-[14px]" /> Verified Buyer
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] text-sk-muted">{formatDate(r.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${r.rating >= 4 ? 'bg-sk-green' : r.rating >= 3 ? 'bg-sk-amber' : 'bg-sk-danger'}`}>
                            {r.rating} ★
                          </span>
                          {r.title && <span className="font-display text-[15px] font-bold text-sk-ink">{r.title}</span>}
                        </div>
                        <p className="text-sm leading-relaxed text-sk-ink/80">{r.comment}</p>
                        {r.images?.length > 0 && (
                          <div className="flex gap-2">
                            {r.images.map((img) => (
                              <img key={img.id} src={imageUrl(img.image_url)} alt="Review" className="h-16 w-16 rounded-lg object-cover" loading="lazy" />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {reviews.length === 0 && (
                      <p className="text-sm text-sk-muted">No reviews yet. Be the first to review this product.</p>
                    )}
                    {revPagination && revPagination.page < revPagination.totalPages && (
                      <button onClick={() => setRevPage((p) => p + 1)} className="sk-btn-mist !py-2.5">
                        Load more reviews
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Related carousel */}
      {related.length > 0 && (
        <section className="w-full bg-white py-8">
          <div className="mx-auto max-w-7xl space-y-5 px-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sk-primary">Curated For You</span>
                <h2 className="sk-h2">Customers Also Bought</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  aria-label="Scroll left"
                  onClick={() => carouselRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-sk-mist text-sk-ink transition hover:bg-sk-mist-2"
                >
                  <Icon name="chevron_left" className="text-[20px]" />
                </button>
                <button
                  aria-label="Scroll right"
                  onClick={() => carouselRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-sk-mist text-sk-ink transition hover:bg-sk-mist-2"
                >
                  <Icon name="chevron_right" className="text-[20px]" />
                </button>
              </div>
            </div>
            <div ref={carouselRef} className="no-scrollbar grid auto-cols-[240px] grid-flow-col gap-4 overflow-x-auto scroll-smooth pb-1">
              {related.map((p) => (
                <Link key={p.id} to={`/products/${p.slug}`} className="group rounded-2xl bg-sk-mist p-4 transition hover:shadow-card">
                  <div className="flex min-h-[160px] items-center justify-center overflow-hidden rounded-xl bg-white p-3">
                    <img src={imageUrl(p.primaryImage)} alt={p.name} loading="lazy" className="max-h-[140px] w-auto object-contain transition group-hover:scale-105" />
                  </div>
                  <p className="mt-3 line-clamp-1 font-display text-[15px] font-bold text-sk-ink">{p.name}</p>
                  <div className="mt-2 flex items-center justify-between border-t border-sk-mist-3 pt-2">
                    <span className="font-display text-[15px] font-extrabold text-sk-ink">{formatPrice(p.price)}</span>
                    <span className="flex items-center gap-1 rounded-full bg-sk-primary px-3 py-1.5 text-[10px] font-bold text-white">
                      <Icon name="visibility" className="text-[14px]" /> View
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recently viewed */}
      {recently.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 py-8">
          <h2 className="sk-h2 mb-5">Recently Viewed</h2>
          <ProductGrid products={recently.map((r) => ({ ...r, ratingAvg: 0, ratingCount: 0 }))} />
        </section>
      )}

      {/* Sticky mobile buy bar */}
      <div className="fixed inset-x-0 bottom-[64px] z-30 border-t border-sk-mist-2 bg-white/95 px-4 py-2.5 backdrop-blur md:hidden" style={{ marginBottom: 0 }}>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-sk-ink">{product.name}</p>
            <p className="font-display text-[18px] font-extrabold text-sk-ink">{formatPrice(unitPrice)}</p>
          </div>
          <button onClick={() => doAdd(false)} disabled={adding || stock === 0} className="sk-btn-primary flex-1 !py-2.5 disabled:opacity-60">
            {adding ? 'Adding…' : 'Add to Cart'}
          </button>
          <button onClick={() => doAdd(true)} disabled={adding || stock === 0} className="sk-btn-mist flex-1 !py-2.5 disabled:opacity-60">
            Buy Now
          </button>
        </div>
      </div>

      <Modal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title="Write a Review"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReviewOpen(false)}>Cancel</Button>
            <Button onClick={submitReview} loading={reviewSaving}>Submit Review</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="label">Your rating</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button key={i} onClick={() => setReviewForm((f) => ({ ...f, rating: i }))} aria-label={`${i} stars`}>
                  <Icon name="star" filled={i <= reviewForm.rating} className={`text-[32px] ${i <= reviewForm.rating ? 'text-sk-amber' : 'text-gray-300'}`} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Title (optional)</label>
            <input value={reviewForm.title} onChange={(e) => setReviewForm((f) => ({ ...f, title: e.target.value }))} className="input" placeholder="Sum it up in a line" />
          </div>
          <div>
            <label className="label">Review</label>
            <textarea value={reviewForm.comment} onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))} className="input" rows={4} placeholder="What did you like or dislike?" />
          </div>
          <div>
            <label className="label">Photos (optional)</label>
            <input type="file" accept="image/*" multiple onChange={(e) => setReviewFiles([...e.target.files].slice(0, 3))} className="input" />
            {reviewFiles.length > 0 && <p className="mt-1 text-xs text-gray-500">{reviewFiles.length} file(s) selected</p>}
          </div>
          {reviewMsg && <p className="text-sm text-gray-600">{reviewMsg}</p>}
        </div>
      </Modal>
    </div>
  );
}
