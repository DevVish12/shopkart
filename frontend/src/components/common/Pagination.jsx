import React from 'react';

export default function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null;

  const go = (p) => {
    if (p >= 1 && p <= totalPages && p !== page) onChange(p);
  };

  const pages = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) pages.push(i);

  const btn = 'inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border px-2 text-sm font-medium';

  return (
    <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
      <button className={`${btn} ${page === 1 ? 'cursor-not-allowed text-gray-300' : 'text-gray-700 hover:bg-gray-100'}`} onClick={() => go(page - 1)} disabled={page === 1}>
        Prev
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => go(p)}
          className={`${btn} ${p === page ? 'border-brand-600 bg-brand-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
        >
          {p}
        </button>
      ))}
      <button className={`${btn} ${page === totalPages ? 'cursor-not-allowed text-gray-300' : 'text-gray-700 hover:bg-gray-100'}`} onClick={() => go(page + 1)} disabled={page === totalPages}>
        Next
      </button>
    </nav>
  );
}
