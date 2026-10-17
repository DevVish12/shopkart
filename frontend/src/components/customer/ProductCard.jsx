import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatPrice } from '../../utils/formatPrice.js';
import { wishlistApi } from '../../features/wishlist/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useToast } from '../common/Toast.jsx';
import Icon from '../common/Icon.jsx';
import ProductImage from '../common/ProductImage.jsx';

export function discountOf(product, effectivePrice) {
  return (
    product.discountPercent ??
    (product.mrp > effectivePrice ? Math.round(((product.mrp - effectivePrice) / product.mrp) * 100) : 0)
  );
}

export function effectivePriceOf(product) {
  return product.isFlashSale && product.flashSalePrice ? product.flashSalePrice : product.price;
}

export default function ProductCard({ product }) {
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const [wished, setWished] = useState(false);
  const [adding, setAdding] = useState(false);

  const effectivePrice = effectivePriceOf(product);
  const discountPct = discountOf(product, effectivePrice);

  const toggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/products/${product.slug}` } });
      return;
    }
    try {
      if (wished) {
        await wishlistApi.remove(product.id);
        setWished(false);
      } else {
        await wishlistApi.add(product.id);
        setWished(true);
      }
    } catch {
      /* ignore transient errors */
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock === 0) return;
    setAdding(true);
    try {
      await addItem(product.id, undefined, 1);
      toast.success('Added to cart');
    } catch (err) {
      toast.error(err?.message || 'Could not add to cart');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="group flex flex-col justify-between rounded-2xl bg-white p-4 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
      <div>
        <div className="relative mb-3 flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl bg-sk-mist">
          <div className="absolute left-2 top-2 z-10 flex flex-col gap-1">
            {discountPct > 0 && (
              <span className="rounded-full bg-sk-amber-soft px-2 py-0.5 text-[10px] font-bold text-sk-amber-text shadow-sm">
                {discountPct}% OFF
              </span>
            )}
            {product.isFlashSale && (
              <span className="rounded-full bg-sk-danger px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                Flash Sale
              </span>
            )}
            {product.isNewArrival && (
              <span className="rounded-full bg-sk-primary px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                NEW
              </span>
            )}
          </div>
          <button
            onClick={toggleWishlist}
            aria-label="Add to wishlist"
            className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow-sm transition hover:bg-white"
          >
            <Icon
              name="favorite"
              filled={wished}
              className={`text-[18px] ${wished ? 'text-sk-danger' : 'text-sk-muted hover:text-sk-danger'}`}
            />
          </button>
          <Link to={`/products/${product.slug}`} className="h-full w-full" aria-label={product.name}>
            <ProductImage
              src={product.primaryImage}
              alt={product.name}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          </Link>
        </div>

        {product.ratingAvg > 0 && (
          <div className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-sk-amber-soft px-2 py-0.5 text-[10px] font-bold text-sk-amber-text">
            <Icon name="star" filled className="text-[12px] text-sk-amber" />
            <span>
              {Number(product.ratingAvg).toFixed(1)}
              {product.ratingCount > 0 && ` • ${(product.ratingCount / 1000).toFixed(1)}k`}
            </span>
          </div>
        )}

        <Link
          to={`/products/${product.slug}`}
          className="line-clamp-2 min-h-[2.5rem] font-display text-[15px] font-bold leading-snug text-sk-ink transition hover:text-sk-primary"
        >
          {product.name}
        </Link>

        <div className="mb-3 mt-2 flex items-baseline gap-2">
          <span className="font-display text-[20px] font-extrabold text-sk-ink">{formatPrice(effectivePrice)}</span>
          {product.mrp > effectivePrice && (
            <span className="text-sm text-sk-outline line-through">{formatPrice(product.mrp)}</span>
          )}
          {discountPct > 0 && <span className="text-xs font-bold text-sk-green">{discountPct}% off</span>}
        </div>
      </div>

      {product.stock === 0 ? (
        <p className="rounded-full bg-sk-mist py-2.5 text-center text-xs font-bold text-gray-500">Out of stock</p>
      ) : (
        <button
          onClick={handleAdd}
          disabled={adding}
          className="flex w-full items-center justify-center gap-1.5 rounded-full bg-sk-primary py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sk-primary-deep active:scale-95 disabled:opacity-60"
        >
          <Icon name="shopping_bag" className="text-[18px]" />
          <span>{adding ? 'Adding…' : 'Add to Cart'}</span>
        </button>
      )}
    </div>
  );
}
