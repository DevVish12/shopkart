import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { wishlistApi } from '../../features/wishlist/index.js';
import { notificationApi } from '../../features/orders/index.js';
import api, { imageUrl } from '../../services/api.js';
import { formatPrice } from '../../utils/formatPrice.js';
import SearchBar from './SearchBar.jsx';
import Icon from '../common/Icon.jsx';

const NAV_CATS = ['Electronics', 'Fashion', 'Grocery', 'Beauty', 'Home', 'Appliances', 'Offers'];

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { cart } = useCart();
  const [categories, setCategories] = useState([]);
  const [unread, setUnread] = useState(0);
  const [wishCount, setWishCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [siteName, setSiteName] = useState('ShopKart');
  const [logo, setLogo] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data.data || [])).catch(() => setCategories([]));
    api.get('/settings/public').then((r) => {
      const s = r.data?.data || {};
      if (s.site_name) setSiteName(s.site_name);
      if (s.logo) setLogo(s.logo);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnread(0);
      setWishCount(0);
      return;
    }
    let mounted = true;
    const load = () => {
      notificationApi.list(1).then((r) => {
        if (mounted) setUnread(r.data?.unreadCount || 0);
      }).catch(() => {});
      wishlistApi.list().then((items) => {
        if (mounted) setWishCount(Array.isArray(items) ? items.length : 0);
      }).catch(() => {});
    };
    load();
    const t = setInterval(load, 60000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  // Map category names to slugs from the API when possible.
  const catLink = (label) => {
    const hit = categories.find((c) => c.name.toLowerCase() === label.toLowerCase());
    if (hit) return `/products?category=${hit.slug}`;
    if (label === 'Offers') return '/products?sort=popular';
    return `/products?search=${encodeURIComponent(label)}`;
  };

  const badge =
    'absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ring-2 ring-white';

  const renderWordmark = () => {
    const m = siteName.match(/^(.*)(kart)$/i);
    if (m) {
      return (
        <>
          {m[1]}
          <span className="text-sk-primary">Kart</span>
        </>
      );
    }
    return <span className="text-sk-primary">{siteName}</span>;
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 shadow-[0_8px_20px_-4px_rgba(11,28,48,0.08)] backdrop-blur-md">
      {/* Tier 1 — navy utility bar */}
      <div className="bg-sk-ink text-white">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-4 text-xs font-medium">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <Icon name="local_shipping" className="shrink-0 text-[16px] text-sk-amber-soft" />
            <span className="truncate">Free delivery on orders over ₹499 across India</span>
          </div>
          <div className="hidden items-center gap-4 text-sk-mist-2 sm:flex">
            <Link to="/account/orders" className="transition hover:text-white">Track Order</Link>
            <span className="text-sk-muted">•</span>
            <Link to="/faq" className="transition hover:text-white">Help</Link>
            <span className="text-sk-muted">•</span>
            <Link to="/contact-us" className="transition hover:text-white">Contact</Link>
          </div>
        </div>
      </div>

      {/* Tier 2 — main header row */}
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between gap-3 md:h-20 md:gap-6">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            {logo ? (
              <img src={imageUrl(logo)} alt={siteName} className="h-8 w-auto object-contain" />
            ) : null}
            <span className="font-display text-xl font-bold tracking-tight text-sk-ink md:text-[26px]">
              {renderWordmark()}
            </span>
          </Link>

          <div className="hidden min-w-0 flex-1 md:block md:max-w-2xl md:px-2">
            <SearchBar />
          </div>

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
            {isAuthenticated && (
              <Link
                to="/notifications"
                aria-label="Notifications"
                className="relative hidden rounded-full p-2 text-sk-ink transition hover:text-sk-primary sm:block"
              >
                <Icon name="notifications" className="text-[24px]" />
                {unread > 0 && <span className={`${badge} bg-sk-danger`}>{unread > 99 ? '99+' : unread}</span>}
              </Link>
            )}

            <Link
              to="/account/wishlist"
              aria-label="Wishlist"
              className="relative rounded-full p-2 text-sk-ink transition hover:text-sk-primary"
            >
              <Icon name="favorite" className="text-[24px]" />
              {wishCount > 0 && (
                <span className={`${badge} bg-sk-amber`}>{wishCount > 99 ? '99+' : wishCount}</span>
              )}
            </Link>

            <Link
              to="/cart"
              aria-label="Shopping Cart"
              className="group flex items-center gap-2 rounded-full bg-sk-mist px-3 py-2 transition hover:bg-sk-mist-2"
            >
              <span className="relative">
                <Icon name="shopping_bag" className="text-[24px] text-sk-ink transition group-hover:text-sk-primary" />
                {cart.itemCount > 0 && (
                  <span className={`${badge} bg-sk-primary`}>{cart.itemCount > 99 ? '99+' : cart.itemCount}</span>
                )}
              </span>
              {cart.total > 0 && (
                <span className="hidden text-sm font-bold text-sk-ink sm:inline-block">
                  {formatPrice(cart.total)}
                </span>
              )}
            </Link>

            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="Account menu"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-sk-primary text-white transition hover:bg-sk-primary-deep"
                >
                  <Icon name="person" className="text-[20px]" />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-sk-mist-2 bg-white py-2 shadow-lift">
                      <p className="truncate px-4 pb-2 pt-1 text-sm font-bold text-sk-ink">{user?.name}</p>
                      {[
                        ['My Account', '/account'],
                        ['My Orders', '/account/orders'],
                        ['My Wishlist', '/account/wishlist'],
                        ['My Addresses', '/account/addresses'],
                      ].map(([label, to]) => (
                        <Link
                          key={to}
                          to={to}
                          onClick={() => setMenuOpen(false)}
                          className="block px-4 py-2.5 text-sm text-sk-ink transition hover:bg-sk-mist hover:text-sk-primary"
                        >
                          {label}
                        </Link>
                      ))}
                      <button
                        onClick={handleLogout}
                        className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-sk-danger hover:bg-sk-danger-soft"
                      >
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link to="/login" aria-label="Login" className="flex h-9 w-9 items-center justify-center rounded-full bg-sk-primary text-white transition hover:bg-sk-primary-deep">
                <Icon name="person" className="text-[20px]" />
              </Link>
            )}
          </div>
        </div>

        {/* Mobile search row */}
        <div className="pb-3 md:hidden">
          <SearchBar />
        </div>
      </div>

      {/* Tier 3 — category strip */}
      <div className="bg-white shadow-[0_1px_8px_rgba(11,28,48,0.05)]">
        <div className="mx-auto max-w-7xl px-4">
          <nav className="no-scrollbar flex h-11 items-center gap-8 overflow-x-auto">
            {NAV_CATS.map((label) => (
              <NavLink
                key={label}
                to={catLink(label)}
                className={({ isActive }) =>
                  `flex h-full shrink-0 items-center whitespace-nowrap text-sm font-medium transition ${
                    isActive
                      ? 'border-b-2 border-sk-amber-soft font-bold text-sk-primary'
                      : 'border-b-2 border-transparent text-sk-muted hover:text-sk-ink'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
