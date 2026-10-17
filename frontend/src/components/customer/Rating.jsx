import React from 'react';

export default function Rating({ value = 0, count, size = 'sm', showCount = true }) {
  const sz = size === 'lg' ? 'h-5 w-5' : size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex items-center" aria-label={`Rated ${value} out of 5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <svg key={i} className={`${sz} ${i <= Math.round(value) ? 'text-amber-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 14.9l-5.3 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
          </svg>
        ))}
      </span>
      {showCount && count !== undefined && <span className="text-xs text-gray-500">({count})</span>}
    </span>
  );
}
