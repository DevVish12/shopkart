import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { wishlistApi } from '../../../features/wishlist/index.js';
import { apiErrorMessage } from '../../../services/api.js';
import ProductGrid from '../../../components/customer/ProductGrid.jsx';
import Loader from '../../../components/common/Loader.jsx';
import EmptyState from '../../../components/common/EmptyState.jsx';
import { useToast } from '../../../components/common/Toast.jsx';

export default function Wishlist() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  useEffect(() => {
    wishlistApi
      .list()
      .then((list) => setItems(list || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const removeAll = async () => {
    try {
      await Promise.all(items.map((p) => wishlistApi.remove(p.id).catch(() => {})));
      setItems([]);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  if (loading) return <Loader fullPage />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">My Wishlist ({items.length})</h1>
        {items.length > 0 && (
          <button onClick={removeAll} className="text-sm font-medium text-red-600 hover:text-red-800">Clear all</button>
        )}
      </div>
      <div className="mt-6">
        {items.length === 0 ? (
          <EmptyState
            title="Your wishlist is empty"
            description="Tap the heart on any product to save it here for later."
            action={<Link to="/products" className="btn-primary">Discover Products</Link>}
          />
        ) : (
          <ProductGrid products={items} />
        )}
      </div>
    </div>
  );
}
