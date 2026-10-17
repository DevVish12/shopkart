import React, { useState } from 'react';
import { imageUrl } from '../../services/api.js';

// Neutral SVG placeholder (data URI) for products without an image —
// never hotlinks external hosts and never shows the store logo as a product.
const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450">
      <rect width="600" height="450" fill="#EFF4FF"/>
      <g fill="none" stroke="#B9CFF5" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
        <rect x="210" y="150" width="180" height="140" rx="18"/>
        <circle cx="258" cy="196" r="16"/>
        <path d="M210 262l52-52 40 40 34-34 54 54"/>
      </g>
      <text x="300" y="330" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#8AA6D8">No image available</text>
    </svg>`
  );

export function productImageSrc(path) {
  return path ? imageUrl(path) : PLACEHOLDER;
}

export default function ProductImage({ src, alt, className, eager = false }) {
  const [failed, setFailed] = useState(false);
  const finalSrc = failed ? PLACEHOLDER : productImageSrc(src);
  return (
    <img
      src={finalSrc}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      onError={() => setFailed(true)}
      className={className}
      draggable={false}
    />
  );
}
