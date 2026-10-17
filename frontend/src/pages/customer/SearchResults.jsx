import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api.js';
import SearchBar from '../../components/customer/SearchBar.jsx';
import ProductGrid from '../../components/customer/ProductGrid.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import Loader from '../../components/common/Loader.jsx';

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = (searchParams.get('q') || '').trim();
  const page = Number(searchParams.get('page') || 1);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!q) {
      setProducts([]);
      setPagination(null);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    api
      .get(`/products?search=${encodeURIComponent(q)}&page=${page}&limit=20`)
      .then((r) => {
        setProducts(r.data.data || []);
        setPagination(r.data.pagination || null);
      })
      .catch(() => {
        setProducts([]);
        setPagination(null);
      })
      .finally(() => setLoading(false));
  }, [q, page]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <SearchBar initialValue={q} autoFocus />
      </div>

      {!searched && (
        <div className="mx-auto mt-10 max-w-2xl text-center">
          <h1 className="text-2xl font-extrabold">Search the store</h1>
          <p className="mt-2 text-sm text-gray-500">Try a product name, a brand like the ones below, or a category such as Electronics or Fashion.</p>
        </div>
      )}

      {searched && (
        <div className="mt-8">
          {loading ? (
            <Loader />
          ) : products.length > 0 ? (
            <>
              <p className="mb-4 text-sm text-gray-600">
                <span className="font-bold text-sk-ink">{pagination?.total ?? products.length}</span> result{(pagination?.total ?? products.length) === 1 ? '' : 's'} for <span className="font-semibold">“{q}”</span>
              </p>
              <ProductGrid products={products} />
              {pagination && (
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
            </>
          ) : (
            <div className="mx-auto max-w-xl rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
              <svg className="mx-auto mb-4 h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h2 className="text-lg font-bold">No results for “{q}”</h2>
              <p className="mt-2 text-sm text-gray-500">Check your spelling, try a shorter or more general word, or browse by category.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {['Electronics', 'Fashion', 'Grocery', 'Beauty', 'Home'].map((c) => (
                  <Link key={c} to={`/products?category=${c.toLowerCase()}`} className="btn-outline">
                    {c}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
