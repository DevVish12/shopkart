import React from 'react';
import ProductCard from './ProductCard.jsx';

export default function ProductGrid({ products = [], loading = false, emptyTitle = 'No products found', emptyDescription }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card animate-pulse overflow-hidden">
            <div className="aspect-square bg-gray-200" />
            <div className="space-y-2 p-3">
              <div className="h-3 rounded bg-gray-200" />
              <div className="h-3 w-2/3 rounded bg-gray-200" />
              <div className="h-4 w-1/2 rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (!products.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
        <h3 className="text-lg font-semibold">{emptyTitle}</h3>
        {emptyDescription && <p className="mt-1 text-sm text-gray-500">{emptyDescription}</p>}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
