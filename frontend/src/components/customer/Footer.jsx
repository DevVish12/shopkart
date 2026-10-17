import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { apiErrorMessage, imageUrl } from '../../services/api.js';
import { useToast } from '../common/Toast.jsx';
import Icon from '../common/Icon.jsx';

const CMS_LINKS = [
  ['About Us', '/about-us'],
  ['Contact Us', '/contact-us'],
  ['Privacy Policy', '/privacy-policy'],
  ['Terms & Conditions', '/terms-conditions'],
  ['Refund Policy', '/refund-policy'],
  ['Shipping Policy', '/shipping-policy'],
  ['FAQ', '/faq'],
];

const PAYMENTS = ['UPI', 'RuPay', 'Visa', 'Mastercard', 'NetBanking', 'Cash on Delivery'];

export default function Footer() {
  const [settings, setSettings] = useState({});
  const [email, setEmail] = useState('');
  const [categories, setCategories] = useState([]);
  const toast = useToast();

  useEffect(() => {
    api.get('/settings/public').then((r) => setSettings(r.data.data || {})).catch(() => setSettings({}));
    api.get('/categories').then((r) => setCategories((r.data.data || []).slice(0, 5))).catch(() => setCategories([]));
  }, []);

  const subscribe = async (e) => {
    e.preventDefault();
    try {
      await api.post('/newsletter/subscribe', { email });
      toast.success('Thanks for subscribing! You are on the list.');
      setEmail('');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not subscribe. Please try again.'));
    }
  };

  const social = [
    ['Facebook', settings.social_facebook, 'M13.5 21v-8h2.7l.4-3.2h-3.1V7.7c0-.9.3-1.6 1.6-1.6h1.7V3.2c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.6H7.7V13h2.7v8h3.1z'],
    ['Instagram', settings.social_instagram, 'M12 8.8a3.2 3.2 0 100 6.4 3.2 3.2 0 000-6.4zm0-2.1a5.3 5.3 0 110 10.6 5.3 5.3 0 010-10.6zm6.8-.3a1.2 1.2 0 11-2.4 0 1.2 1.2 0 012.4 0zM12 4.2c-2.5 0-2.9 0-3.9.1a5.6 5.6 0 00-1.9.3 3.8 3.8 0 00-2.1 2.1 5.6 5.6 0 00-.3 1.9c-.1 1-.1 1.4-.1 3.9s0 2.9.1 3.9c.1.7.2 1.3.3 1.9a3.8 3.8 0 002.1 2.1c.6.2 1.2.3 1.9.3 1 .1 1.4.1 3.9.1s2.9 0 3.9-.1a5.6 5.6 0 001.9-.3 3.8 3.8 0 002.1-2.1c.2-.6.3-1.2.3-1.9.1-1 .1-1.4.1-3.9s0-2.9-.1-3.9a5.6 5.6 0 00-.3-1.9 3.8 3.8 0 00-2.1-2.1 5.6 5.6 0 00-1.9-.3c-1-.1-1.4-.1-3.9-.1z'],
    ['X (Twitter)', settings.social_twitter, 'M17.5 4h2.9l-6.4 7.3L21.5 20h-5.9l-4.6-6-5.3 6H2.8l6.9-7.9L2.5 4h6l4.2 5.5L17.5 4zm-1 14.3h1.6L7.6 5.5H5.9l10.6 12.8z'],
    ['YouTube', settings.social_youtube, 'M22 12s0-3.3-.4-4.8a2.5 2.5 0 00-1.8-1.8C18.3 5 12 5 12 5s-6.3 0-7.8.4A2.5 2.5 0 002.4 7.2C2 8.7 2 12 2 12s0 3.3.4 4.8c.2.9.9 1.6 1.8 1.8 1.5.4 7.8.4 7.8.4s6.3 0 7.8-.4a2.5 2.5 0 001.8-1.8c.4-1.5.4-4.8.4-4.8zM10 15.2V8.8l5.7 3.2-5.7 3.2z'],
  ];

  const linkCls = 'transition hover:text-white';
  const colTitle = 'font-display text-[18px] font-bold text-white';

  return (
    <footer className="w-full bg-sk-ink pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-12">
        <div className="grid grid-cols-1 gap-10 pb-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Shop categories */}
          <div className="space-y-4">
            <h4 className={colTitle}>Shop Categories</h4>
            <ul className="space-y-2.5 text-sm text-sk-mist-2/80">
              {categories.length > 0 ? (
                categories.map((c) => (
                  <li key={c.id}>
                    <Link to={`/products?category=${c.slug}`} className={linkCls}>{c.name}</Link>
                  </li>
                ))
              ) : (
                <>
                  <li><Link to="/products?search=Electronics" className={linkCls}>Electronics & Gadgets</Link></li>
                  <li><Link to="/products?search=Fashion" className={linkCls}>Fashion & Lifestyle</Link></li>
                  <li><Link to="/products?search=Grocery" className={linkCls}>Grocery & Essentials</Link></li>
                  <li><Link to="/products?search=Beauty" className={linkCls}>Beauty & Wellness</Link></li>
                  <li><Link to="/products?search=Home" className={linkCls}>Home & Kitchen</Link></li>
                </>
              )}
            </ul>
          </div>

          {/* Customer help */}
          <div className="space-y-4">
            <h4 className={colTitle}>Customer Help</h4>
            <ul className="space-y-2.5 text-sm text-sk-mist-2/80">
              <li><Link to="/account/orders" className={linkCls}>Track Order</Link></li>
              <li><Link to="/shipping-policy" className={linkCls}>Shipping & Delivery</Link></li>
              <li><Link to="/refund-policy" className={linkCls}>Returns & Refunds</Link></li>
              <li><Link to="/contact-us" className={linkCls}>24x7 Customer Support</Link></li>
              <li><Link to="/faq" className={linkCls}>FAQ</Link></li>
            </ul>
          </div>

          {/* About */}
          <div className="space-y-4">
            <h4 className={colTitle}>About ShopKart</h4>
            <ul className="space-y-2.5 text-sm text-sk-mist-2/80">
              {CMS_LINKS.slice(0, 4).map(([label, to]) => (
                <li key={to}><Link to={to} className={linkCls}>{label}</Link></li>
              ))}
            </ul>
            <div className="flex gap-2.5 pt-1">
              {social.map(([name, url, path]) =>
                url ? (
                  <a
                    key={name}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={name}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-sk-primary"
                  >
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d={path} /></svg>
                  </a>
                ) : null
              )}
            </div>
          </div>

          {/* Contact + newsletter */}
          <div className="space-y-4">
            <h4 className={colTitle}>Contact & Store</h4>
            <div className="space-y-2.5 text-sm text-sk-mist-2/80">
              {settings.address && (
                <p className="flex items-start gap-2">
                  <Icon name="location_on" className="mt-0.5 shrink-0 text-[18px] text-sk-amber-soft" />
                  <span>{settings.address}</span>
                </p>
              )}
              {settings.phone && (
                <p className="flex items-center gap-2">
                  <Icon name="call" className="shrink-0 text-[18px] text-sk-amber-soft" />
                  <a href={`tel:${settings.phone}`} className="font-bold text-white hover:underline">{settings.phone}</a>
                </p>
              )}
              {settings.contact_email && (
                <p className="flex items-center gap-2">
                  <Icon name="mail" className="shrink-0 text-[18px] text-sk-amber-soft" />
                  <a href={`mailto:${settings.contact_email}`} className="hover:text-white">{settings.contact_email}</a>
                </p>
              )}
            </div>
            <form onSubmit={subscribe} className="flex items-center rounded-full bg-white/10 py-1 pl-4 pr-1">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email for offers"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-sk-mist-2/60"
              />
              <button type="submit" className="shrink-0 rounded-full bg-sk-primary px-5 py-2 text-xs font-bold text-white transition hover:bg-sk-primary-deep">
                Join
              </button>
            </form>
          </div>
        </div>

        {/* Payments row */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-sk-mist-2/60">100% Secure Payment Options:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {PAYMENTS.map((m) => (
                <span key={m} className="rounded-full bg-sk-mist-3 px-3 py-1 text-xs font-bold text-sk-ink">{m}</span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-sk-amber-soft">
            <Icon name="verified_user" className="text-[18px]" />
            <span>256-Bit SSL Encrypted</span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 pt-5 text-xs text-sk-mist-2/70 md:flex-row">
          <p>© {new Date().getFullYear()} {settings.site_name || 'ShopKart'} Internet Private Limited. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link to="/privacy-policy" className={linkCls}>Privacy Notice</Link>
            <Link to="/terms-conditions" className={linkCls}>Terms of Use</Link>
            <Link to="/shipping-policy" className={linkCls}>Security</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
