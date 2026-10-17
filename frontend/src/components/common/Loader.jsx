import React from 'react';

export default function Loader({ text = 'Loading…', fullPage = false }) {
  const inner = (
    <div className="flex flex-col items-center justify-center gap-3 py-10">
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" aria-hidden />
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  );
  if (fullPage) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">{inner}</div>
      </div>
    );
  }
  return inner;
}
