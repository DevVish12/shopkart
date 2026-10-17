import React from 'react';
import { Link } from 'react-router-dom';
import { imageUrl } from '../../services/api.js';
import Icon from '../common/Icon.jsx';

// Circular category tile: round image on mist background + bold label.
export default function CategoryCard({ category }) {
  return (
    <Link
      to={`/products?category=${category.slug}`}
      className="group flex flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-card transition-all hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-sk-mist p-1 transition group-hover:scale-105">
        {category.image ? (
          <img
            src={imageUrl(category.image)}
            alt={category.name}
            className="h-full w-full rounded-full object-cover"
            loading="lazy"
          />
        ) : (
          <Icon name="category" className="text-[32px] text-sk-primary" />
        )}
      </div>
      <span className="font-display text-[15px] font-bold text-sk-ink transition group-hover:text-sk-primary">
        {category.name}
      </span>
    </Link>
  );
}
