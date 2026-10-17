import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { productApi } from '../../features/products/index.js';

export function useRecentSearches() {
  const KEY = 'sk_recent_searches';
  const read = () => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch {
      return [];
    }
  };
  return { read, KEY };
}

const ROTATING_PLACEHOLDERS = [
  'Search for "Speakers"',
  'Search for "Smart Watches"',
  'Search for "Earbuds"',
  'Search for "Sneakers"',
  'Search for "Kurti"',
  'Search for "Mixer Grinder"',
];

export default function SearchBar({ initialValue = '', autoFocus = false, onSubmitExtra }) {
  const [q, setQ] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [recent, setRecent] = useState([]);
  const [phIdx, setPhIdx] = useState(0);
  const navigate = useNavigate();
  const wrapRef = useRef(null);
  const timer = useRef(null);

  // boAt-style rotating placeholder hint.
  useEffect(() => {
    if (q) return;
    const t = setInterval(() => setPhIdx((i) => (i + 1) % ROTATING_PLACEHOLDERS.length), 3000);
    return () => clearInterval(t);
  }, [q]);

  useEffect(() => {
    try {
      setRecent(JSON.parse(localStorage.getItem('sk_recent_searches') || '[]'));
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const fetchSuggestions = (value) => {
    clearTimeout(timer.current);
    if (!value || value.trim().length < 2) {
      setSuggestions(null);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const data = await productApi.suggestions(value.trim());
        setSuggestions(data || null);
      } catch {
        setSuggestions(null);
      }
    }, 250);
  };

  const saveRecent = (term) => {
    const t = term.trim();
    if (!t) return;
    try {
      const cur = JSON.parse(localStorage.getItem('sk_recent_searches') || '[]');
      const next = [t, ...cur.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 8);
      localStorage.setItem('sk_recent_searches', JSON.stringify(next));
      setRecent(next);
    } catch { /* ignore */ }
  };

  const submit = (term) => {
    const t = (term ?? q).trim();
    if (!t) return;
    saveRecent(t);
    setOpen(false);
    onSubmitExtra?.(t);
    navigate(`/search?q=${encodeURIComponent(t)}`);
  };

  return (
    <div ref={wrapRef} className="relative w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex w-full items-center rounded-full bg-sk-mist py-1 pl-4 pr-1 transition focus-within:bg-sk-mist-2"
      >
        <span className="material-symbols-outlined mr-2 text-[20px] text-sk-outline">search</span>
        <input
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            fetchSuggestions(e.target.value);
          }}
          onFocus={() => setOpen(true)}
          placeholder={ROTATING_PLACEHOLDERS[phIdx]}
          className="w-full bg-transparent text-sm text-sk-ink outline-none placeholder:text-sk-outline"
          aria-label="Search products"
        />
        <button type="submit" className="flex shrink-0 items-center rounded-full bg-sk-primary px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-sk-primary-deep" aria-label="Search">
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </form>

      {open && (suggestions || recent.length > 0) && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-lg border border-sk-mist-2 bg-white shadow-xl">
          {suggestions && (
            <div className="py-2">
              {suggestions.data?.length > 0 && (
                <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Products</p>
              )}
              {suggestions.data?.slice(0, 6).map((s) => (
                <button key={s.slug} onClick={() => submit(s.name)} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {s.name}
                </button>
              ))}
              {suggestions.categories?.length > 0 && (
                <>
                  <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Categories</p>
                  {suggestions.categories.map((c) => (
                    <Link key={c.slug} to={`/products?category=${c.slug}`} onClick={() => setOpen(false)} className="block px-4 py-2 text-sm hover:bg-gray-50">
                      in <span className="font-medium text-brand-700">{c.name}</span>
                    </Link>
                  ))}
                </>
              )}
              {suggestions.brands?.length > 0 && (
                <>
                  <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Brands</p>
                  {suggestions.brands.map((b) => (
                    <Link key={b.slug} to={`/products?brand=${b.slug}`} onClick={() => setOpen(false)} className="block px-4 py-2 text-sm hover:bg-gray-50">
                      by <span className="font-medium text-brand-700">{b.name}</span>
                    </Link>
                  ))}
                </>
              )}
            </div>
          )}
          {!suggestions && recent.length > 0 && (
            <div className="py-2">
              <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Recent searches</p>
              {recent.map((r) => (
                <button key={r} onClick={() => submit(r)} className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
