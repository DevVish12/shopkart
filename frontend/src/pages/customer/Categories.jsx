import React, { useEffect, useState } from 'react';
import api from '../../services/api.js';
import CategoryCard from '../../components/customer/CategoryCard.jsx';
import Loader from '../../components/common/Loader.jsx';
import Seo from '../../components/common/Seo.jsx';

export default function Categories() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data.data || [])).catch(() => setCategories([])).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader fullPage />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Seo title="All Categories" path="/categories" />
      <h1 className="text-2xl font-extrabold">All Categories</h1>
      <p className="mt-1 text-sm text-gray-500">Browse everything we sell, organised for you.</p>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {categories.map((c) => (
          <CategoryCard key={c.id} category={c} />
        ))}
      </div>
    </div>
  );
}
