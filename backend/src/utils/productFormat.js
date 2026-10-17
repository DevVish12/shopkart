// Shared product-list-item formatter (contract: "Product list item shape").
// Row must carry joined aliases: primary_image, category_id/name/slug, brand_id/name/slug.
export const toListItem = (row) => {
  const price = Number(row.price);
  const mrp = Number(row.mrp);
  const now = new Date();
  const flashActive =
    Number(row.is_flash_sale) === 1 &&
    row.flash_sale_price != null &&
    row.flash_sale_ends_at &&
    new Date(row.flash_sale_ends_at) > now;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    price,
    mrp,
    discountPercent: mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0,
    ratingAvg: Number(row.rating_avg || 0),
    ratingCount: Number(row.rating_count || 0),
    stock: Number(row.stock || 0),
    primaryImage: row.primary_image || null,
    category: row.category_id
      ? { id: row.category_id, name: row.category_name, slug: row.category_slug }
      : null,
    brand: row.brand_id ? { id: row.brand_id, name: row.brand_name, slug: row.brand_slug } : null,
    isNewArrival: Number(row.is_new_arrival) === 1,
    isBestSeller: Number(row.is_best_seller) === 1,
    isFlashSale: !!flashActive,
    flashSalePrice: flashActive ? Number(row.flash_sale_price) : null,
    flashSaleEndsAt: flashActive ? row.flash_sale_ends_at : null,
  };
};

// Effective selling price: variant override wins, else active flash-sale price, else base price.
export const effectivePrice = (productRow, variantRow = null) => {
  if (variantRow && variantRow.price != null) return Number(variantRow.price);
  const now = new Date();
  if (
    Number(productRow.is_flash_sale) === 1 &&
    productRow.flash_sale_price != null &&
    productRow.flash_sale_ends_at &&
    new Date(productRow.flash_sale_ends_at) > now
  ) {
    return Number(productRow.flash_sale_price);
  }
  return Number(productRow.price);
};
