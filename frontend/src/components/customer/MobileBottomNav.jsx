import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useCart } from '../../context/CartContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { wishlistApi } from '../../features/wishlist/index.js';

// App-style bottom navigation for mobile — visible only below md.
export default function MobileBottomNav() {
  const { cart } = useCart();
  const { isAuthenticated } = useAuth();
  const [wishCount, setWishCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      setWishCount(0);
      return;
    }
    let mounted = true;
    wishlistApi.list()
      .then((items) => {
        if (mounted) setWishCount(Array.isArray(items) ? items.length : 0);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [isAuthenticated]);

  const items = [
    ['Home', '/', 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'],
    ['Shop', '/products', 'M20 7l-8-4-8 4m16 0v10l-8 4m8-14l-8 4m0 10V11m0 10l-8-4V7m8 4L4 7'],
    ['Cart', '/cart', 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z', cart.itemCount],
    ['Wishlist', '/account/wishlist', 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', wishCount],
    [isAuthenticated ? 'Account' : 'Login', isAuthenticated ? '/account' : '/login', 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'],
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-sk-mist-2 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur md:hidden">
      <div className="grid grid-cols-5">
        {items.map(([label, to, path, count]) => (
          <NavLink
            key={label}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition ${isActive ? 'text-sk-primary' : 'text-sk-muted'}`
            }
          >
            <span className="relative">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={path} />
              </svg>
              {count > 0 && (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-sk-primary px-1 text-[9px] font-bold text-white">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </span>
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
