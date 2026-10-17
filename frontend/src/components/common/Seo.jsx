import React from 'react';
import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'ShopKart';
const DEFAULT_DESC =
  "ShopKart — India's trusted online store for electronics, fashion, grocery, beauty and home essentials. Best prices, fast delivery, easy returns.";

/**
 * Seo — per-page head tags: title, meta description, canonical,
 * Open Graph / Twitter cards and optional JSON-LD structured data.
 */
export default function Seo({ title, description, path = '/', image, jsonLd, noindex = false }) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Online Shopping for Electronics, Fashion & More`;
  const desc = description || DEFAULT_DESC;
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {noindex ? <meta name="robots" content="noindex, nofollow" /> : <meta name="robots" content="index, follow" />}
      <link rel="canonical" href={path} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      {image && <meta property="og:image" content={image} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      {image && <meta name="twitter:image" content={image} />}
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  );
}

export function productJsonLd(product, image) {
  const price = product.isFlashSale && product.flashSalePrice ? product.flashSalePrice : product.price;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.sku,
    description: (product.description || product.name).slice(0, 500),
    image: image ? [image] : undefined,
    brand: product.brand?.name ? { '@type': 'Brand', name: product.brand.name } : undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: String(price),
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
    ...(product.ratingAvg > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: String(Number(product.ratingAvg).toFixed(1)),
            reviewCount: String(product.ratingCount || 0),
          },
        }
      : {}),
  };
}

export function breadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      ...(it.url ? { item: it.url } : {}),
    })),
  };
}
