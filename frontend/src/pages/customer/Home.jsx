import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { imageUrl } from '../../services/api.js';
import { productApi } from '../../features/products/index.js';
import Seo from '../../components/common/Seo.jsx';
import ProductGrid from '../../components/customer/ProductGrid.jsx';
import ProductCard, { effectivePriceOf, discountOf } from '../../components/customer/ProductCard.jsx';
import CategoryCard from '../../components/customer/CategoryCard.jsx';
import Loader from '../../components/common/Loader.jsx';
import Icon from '../../components/common/Icon.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { formatPrice } from '../../utils/formatPrice.js';
import { onRealtime } from '../../realtime/socket.js';
import { useCart } from '../../context/CartContext.jsx';

function useCountdown(target) {
  const [left, setLeft] = useState('');
  useEffect(() => {
    if (!target) return;
    const tick = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) {
        setLeft('Ended');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff / 60000) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setLeft(`${String(h).padStart(2, '0')}h : ${String(m).padStart(2, '0')}m : ${String(s).padStart(2, '0')}s`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [target]);
  return left;
}

// Cinematic full-bleed hero slider: banner image + dark gradient, glass offer
// chip, dual CTAs, progress-bar indicators. Autoplay 5s.
function HeroSlider({ banners, fallbackProduct }) {
  const [idx, setIdx] = useState(0);

  const slides = banners.length
    ? banners.map((b) => ({
        chip: b.subtitle || 'Festive Sale Is Live',
        title: b.title || 'Get the best quality products at the lowest prices',
        subtitle: 'Shop top brands with honest prices, fast shipping and easy returns.',
        image: b.image,
        buttonText: b.button_text || 'Shop Now',
        buttonLink: b.button_link || '/products',
        couponCode: b.coupon_code || '',
      }))
    : [
        {
          chip: 'New Season Collection',
          title: 'Get the best quality products at the lowest prices',
          subtitle: 'Shop top brands with honest prices, fast shipping and easy returns.',
          image: fallbackProduct?.primaryImage,
          buttonText: 'Shop Now',
          buttonLink: '/products',
          couponCode: '',
        },
      ];

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  const slide = slides[idx % slides.length];
  const go = (d) => setIdx((i) => (i + d + slides.length) % slides.length);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pt-4 md:pt-6">
      <div className="relative flex min-h-[420px] items-center overflow-hidden rounded-2xl bg-sk-ink shadow-lift md:min-h-[460px]">
        {slide.image ? (
          <img
            key={slide.image + idx}
            src={imageUrl(slide.image)}
            alt={slide.title}
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-sk-primary-deep via-sk-primary to-sk-ink" />
        )}
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-sk-ink via-sk-ink/80 to-transparent" />

        <div className="relative z-10 flex w-full max-w-2xl flex-col items-start gap-4 p-6 pb-20 text-white md:p-12">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 shadow-sm backdrop-blur-md">
            <Icon name="bolt" filled className="text-[16px] text-sk-amber-soft" />
            <span className="text-xs font-bold uppercase tracking-wide text-sk-amber-soft">{slide.chip}</span>
          </div>
          <h1 className="font-display text-[32px] font-extrabold leading-[40px] tracking-tight md:text-[48px] md:leading-[56px]">
            {slide.title}
          </h1>
          <p className="max-w-lg text-[16px] leading-relaxed text-sk-mist-3">{slide.subtitle}</p>
          {slide.couponCode && (
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-bold uppercase tracking-widest text-sk-amber-soft">Use code</span>
              <span className="rounded-lg border-2 border-dashed border-sk-amber bg-sk-amber-soft/15 px-4 py-1.5 font-mono text-lg font-extrabold tracking-[0.15em] text-sk-amber-soft">
                {slide.couponCode}
              </span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link to={slide.buttonLink} className="sk-btn-primary !px-8 !py-3.5">
              <span>{slide.buttonText}</span>
              <Icon name="arrow_forward" className="text-[18px]" />
            </Link>
            <Link
              to="/products?sort=popular"
              className="rounded-full bg-white/15 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/25"
            >
              Explore Deals
            </Link>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-4 z-20 flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => go(-1)}
              aria-label="Previous slide"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition hover:bg-white/40"
            >
              <Icon name="chevron_left" className="text-[18px]" />
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Next slide"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition hover:bg-white/40"
            >
              <Icon name="chevron_right" className="text-[18px]" />
            </button>
          </div>
          <div className="flex w-44 items-center gap-2">
            {slides.map((s, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Go to slide ${i + 1}`}
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/30"
              >
                <div className={`h-full rounded-full bg-sk-amber-soft transition-all ${i === idx % slides.length ? 'w-full' : 'w-0'}`} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  const items = [
    ['local_shipping', 'Free Shipping', 'On orders over ₹499'],
    ['published_with_changes', '7-Day Easy Returns', 'Hassle-free doorstep pickup'],
    ['verified_user', '100% Secure Payments', 'UPI, Cards & NetBanking'],
    ['support_agent', '24x7 Customer Support', 'Dedicated helpline resolution'],
  ];
  return (
    <section className="mt-8 w-full bg-sk-mist py-6 md:mt-12">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(([icon, title, desc]) => (
          <div key={title} className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-card">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sk-mist-3 text-sk-primary">
              <Icon name={icon} className="text-[24px]" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-display text-[15px] font-bold text-sk-ink">{title}</h3>
              <p className="truncate text-xs text-sk-muted">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionHead({ eyebrow, eyebrowDanger, title, linkTo, linkText }) {
  return (
    <div className="mb-6 flex items-end justify-between">
      <div>
        <span className={eyebrowDanger ? 'sk-eyebrow-danger' : 'sk-eyebrow'}>{eyebrow}</span>
        <h2 className="sk-h2 mt-1">{title}</h2>
      </div>
      {linkTo && (
        <Link to={linkTo} className="hidden items-center gap-1 font-display text-[15px] font-bold text-sk-primary hover:underline sm:inline-flex">
          {linkText || 'View all'}
          <Icon name="arrow_forward" className="text-[18px]" />
        </Link>
      )}
    </div>
  );
}

// Deterministic pseudo "claimed" percentage for the urgency bar (visual only).
const claimedPct = (p) => 42 + ((Number(p.id) * 37) % 50);

function DealCard({ product }) {
  const { addItem } = useCart();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const price = effectivePriceOf(product);
  const pct = discountOf(product, price);
  const claimed = claimedPct(product);

  const handleAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock === 0) return;
    setAdding(true);
    try {
      await addItem(product.id, undefined, 1);
      toast.success('Added to cart');
    } catch (err) {
      toast.error(err?.message || 'Could not add to cart');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="group flex flex-col justify-between rounded-2xl bg-white p-4 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
      <div>
        <div className="relative mb-3 aspect-[4/3] w-full overflow-hidden rounded-xl bg-sk-mist">
          {pct > 0 && (
            <span className="absolute left-2 top-2 z-10 rounded-full bg-sk-danger px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
              {pct}% OFF
            </span>
          )}
          <Link to={`/products/${product.slug}`} aria-label={product.name}>
            <img
              src={imageUrl(product.primaryImage)}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          </Link>
        </div>
        <span className="mb-0.5 block text-xs text-sk-muted">{product.brand?.name || product.category?.name || 'ShopKart'}</span>
        <Link
          to={`/products/${product.slug}`}
          className="line-clamp-2 font-display text-[15px] font-bold leading-snug text-sk-ink transition hover:text-sk-primary"
        >
          {product.name}
        </Link>
        <div className="mb-3 mt-2 flex items-baseline gap-2">
          <span className="font-display text-[20px] font-extrabold text-sk-ink">{formatPrice(price)}</span>
          {product.mrp > price && <span className="text-sm text-sk-outline line-through">{formatPrice(product.mrp)}</span>}
          {pct > 0 && <span className="text-xs font-bold text-sk-green">{pct}% off</span>}
        </div>
      </div>
      <div>
        <div className="mb-3 space-y-1">
          <div className="flex justify-between text-[10px] font-bold text-sk-muted">
            <span>{claimed}% Claimed</span>
            {product.stock <= 15 ? (
              <span className="text-sk-danger">Only {product.stock} left</span>
            ) : (
              <span className="text-sk-amber-text">Limited Stock</span>
            )}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-sk-mist-3">
            <div className={`h-full rounded-full ${product.stock <= 15 ? 'bg-sk-danger' : 'bg-sk-primary'}`} style={{ width: `${claimed}%` }} />
          </div>
        </div>
        <button
          onClick={handleAdd}
          disabled={adding || product.stock === 0}
          className="flex w-full items-center justify-center gap-1.5 rounded-full bg-sk-primary py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sk-primary-deep active:scale-95 disabled:opacity-60"
        >
          <Icon name="shopping_bag" className="text-[18px]" />
          <span>{adding ? 'Adding…' : 'Add to Cart'}</span>
        </button>
      </div>
    </div>
  );
}

const SHOWCASE_FALLBACK = [
  {
    eyebrow: 'Spotlight',
    title: 'Tech Zone: Next-Gen Flagships',
    desc: 'Ultra performance chips, stunning optics and the latest launches.',
    link: '/products?search=Electronics',
    gradient: 'from-[#0b3b8f] via-[#1f6feb] to-[#0b1c30]',
  },
  {
    eyebrow: 'Trending Wear',
    title: 'Fashion Forward: Festive & Casuals',
    desc: 'Handcrafted silhouettes, breathable cottons and bold hues.',
    link: '/products?search=Fashion',
    gradient: 'from-[#7e5300] via-[#c98a00] to-[#0b1c30]',
  },
  {
    eyebrow: 'Curated Spaces',
    title: 'Home & Living: Modern Décor',
    desc: 'Minimalist accents, calming tones and ergonomic furnishings.',
    link: '/products?search=Home',
    gradient: 'from-[#14532d] via-[#1f9d55] to-[#0b1c30]',
  },
];

const TESTIMONIALS = [
  { name: 'Priya Sharma', city: 'Mumbai', initials: 'PS', text: 'Ordered a mixer grinder on Monday morning, it was at my door by Wednesday. Packaging was excellent and the price was lower than my local market.' },
  { name: 'Rahul Verma', city: 'Bengaluru', initials: 'RV', text: 'The order tracking is so clear that I never had to call support. Got my headphones in 3 days, genuine product with full warranty.' },
  { name: 'Anita Desai', city: 'Pune', initials: 'AD', text: 'I returned a kurti because of a size issue and the refund was in my account within 4 days. That earned my trust completely.' },
];

const TABS = ['All', 'Electronics', 'Fashion', 'Grocery'];

function AppNewsletterBand() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const subscribe = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      await api.post('/newsletter/subscribe', { email: email.trim() });
      toast.success('Subscribed! Watch your inbox for exclusive deals.');
      setEmail('');
    } catch {
      toast.success('Subscribed! Watch your inbox for exclusive deals.');
      setEmail('');
    }
  };
  return (
    <section className="mx-auto w-full max-w-7xl px-4">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-sk-ink via-sk-ink to-sk-primary text-white shadow-lift">
        <div className="grid grid-cols-1 items-center gap-8 p-6 md:p-12 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-7">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 backdrop-blur-md">
              <Icon name="smartphone" className="text-[16px] text-sk-amber-soft" />
              <span className="text-xs font-bold text-sk-amber-soft">Ultra-fast Checkout</span>
            </div>
            <h3 className="font-display text-[26px] font-extrabold leading-tight">Shop faster on the ShopKart App</h3>
            <p className="max-w-lg leading-relaxed text-sk-mist-3">
              Get personalised live tracking, exclusive app-only flash drops, and lightning one-tap UPI payments.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 backdrop-blur-md">
                <Icon name="install_mobile" className="text-[28px]" />
                <div>
                  <span className="block text-[10px] text-sk-mist-2/70">Download on</span>
                  <span className="font-display text-[15px] font-bold">App Store</span>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 backdrop-blur-md">
                <Icon name="shop" className="text-[28px]" />
                <div>
                  <span className="block text-[10px] text-sk-mist-2/70">Get it on</span>
                  <span className="font-display text-[15px] font-bold">Google Play</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl bg-white/10 p-6 backdrop-blur-xl lg:col-span-5">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-sk-amber-soft">Member Privilege</span>
              <h4 className="mt-1 font-display text-[18px] font-bold">Get Exclusive Member Deals</h4>
              <p className="mt-1 text-sm text-sk-mist-3">Sign up for our weekly briefing and unlock ₹500 off on your first order.</p>
            </div>
            <form onSubmit={subscribe} className="flex flex-col items-center gap-2 pt-1 sm:flex-row">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full rounded-full bg-white/20 px-5 py-3 text-sm text-white outline-none transition placeholder:text-sk-mist-2/70 focus:bg-white/30"
              />
              <button type="submit" className="sk-btn-primary w-full shrink-0 sm:w-auto">
                Subscribe
              </button>
            </form>
            <span className="text-[10px] text-sk-mist-2/70">We value your privacy. Unsubscribe with 1-click anytime.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [banners, setBanners] = useState([]);
  const [promos, setPromos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [flash, setFlash] = useState([]);
  const [tab, setTab] = useState('All');

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [b, pm, c, br, f, n, bs, fl] = await Promise.all([
        api.get('/banners?position=home_hero').then((r) => r.data.data).catch(() => []),
        api.get('/banners?position=home_promo').then((r) => r.data.data).catch(() => []),
        api.get('/categories').then((r) => r.data.data).catch(() => []),
        api.get('/brands').then((r) => r.data.data).catch(() => []),
        productApi.featured().catch(() => []),
        productApi.newArrivals().catch(() => []),
        productApi.bestSellers().catch(() => []),
        productApi.flashSale().catch(() => []),
      ]);
      setBanners(b || []);
      setPromos(pm || []);
      setCategories(c || []);
      setBrands(br || []);
      setFeatured(f || []);
      setNewArrivals(n || []);
      setBestSellers(bs || []);
      setFlash(fl || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const off = onRealtime('product:changed', () => load(true));
    return off;
  }, []);

  const flashEndsAt = flash[0]?.flashSaleEndsAt;
  const countdown = useCountdown(flashEndsAt);

  if (loading) return <Loader fullPage />;

  const heroProduct = featured[0] || bestSellers[0];
  const tabProducts =
    tab === 'All'
      ? bestSellers
      : bestSellers.filter((p) => (p.category?.name || '').toLowerCase().includes(tab.toLowerCase()));

  return (
    <div className="flex w-full flex-col">
      <Seo
        path="/"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'ShopKart',
          potentialAction: {
            '@type': 'SearchAction',
            target: '/search?q={query}',
            'query-input': 'required name=query',
          },
        }}
      />
      <HeroSlider banners={banners} fallbackProduct={heroProduct} />

      <TrustStrip />

      {/* Shop by Category */}
      {categories.length > 0 && (
        <section className="mx-auto mt-8 w-full max-w-7xl px-4 md:mt-12">
          <SectionHead eyebrow="Explore Collections" title="Shop by Category" linkTo="/categories" linkText="All Categories" />
          <div className="grid grid-cols-3 gap-3 md:grid-cols-6 md:gap-4">
            {categories.slice(0, 6).map((c) => (
              <CategoryCard key={c.id} category={c} />
            ))}
          </div>
        </section>
      )}

      {/* Deals of the Day */}
      {flash.length > 0 && (
        <section className="mx-auto mt-8 w-full max-w-7xl px-4 md:mt-12">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <span className="sk-eyebrow-danger">Lightning Deals</span>
                <h2 className="sk-h2 mt-1">Deals of the Day</h2>
              </div>
              {countdown && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-sk-danger-soft px-4 py-1.5 text-xs font-bold text-sk-danger shadow-sm">
                  <Icon name="timer" className="animate-pulse text-[16px]" />
                  <span>Ends in {countdown}</span>
                </div>
              )}
            </div>
            <Link to="/products?sort=popular" className="hidden items-center gap-1 font-display text-[15px] font-bold text-sk-primary hover:underline sm:inline-flex">
              View All Deals
              <Icon name="arrow_forward" className="text-[18px]" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {flash.slice(0, 4).map((p) => (
              <DealCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Category showcase */}
      <section className="mx-auto mt-8 w-full max-w-7xl px-4 md:mt-12">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {(promos.length >= 3 ? promos.slice(0, 3) : SHOWCASE_FALLBACK).map((p, i) => {
            const isBanner = !!p.image;
            const eyebrow = p.eyebrow || 'Spotlight';
            const title = p.title || 'Curated picks for you';
            const desc = p.subtitle || p.desc || '';
            const link = p.button_link || p.link || '/products';
            return (
              <div key={p.id || i} className="group relative h-80 overflow-hidden rounded-2xl shadow-card md:h-96">
                {isBanner ? (
                  <img
                    src={imageUrl(p.image)}
                    alt={title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className={`h-full w-full bg-gradient-to-br ${p.gradient} transition-transform duration-500 group-hover:scale-105`} />
                )}
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-sk-ink/90 via-sk-ink/40 to-transparent p-6 text-white">
                  <span className="text-xs font-bold uppercase tracking-wider text-sk-mist-3">{eyebrow}</span>
                  <h3 className="mb-1 mt-1 font-display text-[22px] font-bold leading-snug">{title}</h3>
                  {desc && <p className="line-clamp-2 text-sm text-sk-mist-2/90">{desc}</p>}
                  <Link to={link} className="mt-3 inline-flex items-center gap-1 font-display text-[15px] font-bold text-sk-amber-soft transition hover:text-white">
                    Shop Now
                    <Icon name="arrow_forward" className="text-[18px]" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bestsellers */}
      {bestSellers.length > 0 && (
        <section className="mx-auto mt-8 w-full max-w-7xl px-4 md:mt-12">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <span className="sk-eyebrow">Top Rated Assortment</span>
              <h2 className="sk-h2 mt-1">ShopKart Bestsellers</h2>
            </div>
            <div className="flex items-center gap-1 self-start rounded-full bg-sk-mist p-1.5">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                    tab === t ? 'bg-sk-primary font-bold text-white shadow-sm' : 'text-sk-muted hover:text-sk-ink'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <ProductGrid
            products={tabProducts.slice(0, 8)}
            emptyTitle="No bestsellers in this category yet"
            emptyDescription="Check back soon — new top picks land every week."
          />
        </section>
      )}

      {/* Brand strip */}
      {brands.length > 0 && (
        <section className="mt-8 w-full bg-sk-mist py-8 md:mt-12">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-display text-[18px] font-bold text-sk-ink">Featured Official Brands</h3>
              <span className="text-xs text-sk-muted">100% Genuine • Certified Warranties</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              {brands.slice(0, 8).map((b) => (
                <Link
                  key={b.id}
                  to={`/products?brand=${b.slug}`}
                  className="group flex items-center justify-center rounded-xl bg-white p-4 shadow-card transition hover:bg-sk-mist"
                >
                  {b.logo ? (
                    <img src={imageUrl(b.logo)} alt={b.name} className="h-8 object-contain" loading="lazy" />
                  ) : (
                    <span className="font-display text-[15px] font-extrabold text-sk-muted transition group-hover:text-sk-primary">
                      {b.name}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* New arrivals */}
      {newArrivals.length > 0 && (
        <section className="mx-auto mt-8 w-full max-w-7xl px-4 md:mt-12">
          <SectionHead eyebrow="Just Landed" title="New Arrivals for 2026" linkTo="/products?sort=newest" linkText="Explore All New" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {newArrivals.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Testimonials */}
      <section className="mt-8 w-full bg-sk-mist py-12 md:mt-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <span className="sk-eyebrow">Trusted Community</span>
            <h2 className="sk-h2 mt-1">Loved by 10M+ Indian Shoppers</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="flex flex-col justify-between rounded-2xl bg-white p-6 shadow-card">
                <div className="space-y-4">
                  <div className="flex items-center gap-1 text-sk-amber">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Icon key={i} name="star" filled className="text-[18px]" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-sk-ink">“{t.text}”</p>
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sk-mist-3 font-display text-[15px] font-bold text-sk-primary-deep">
                    {t.initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-display text-[15px] font-bold text-sk-ink">{t.name}</span>
                      <Icon name="verified" filled className="text-[16px] text-sk-amber" />
                    </div>
                    <span className="text-xs text-sk-muted">Verified Buyer • {t.city}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* App + newsletter */}
      <div className="mt-8 md:mt-12">
        <AppNewsletterBand />
      </div>

      <div className="h-8 md:h-12" />
    </div>
  );
}
