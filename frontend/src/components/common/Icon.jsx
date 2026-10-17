import React from 'react';

// Material Symbols Outlined icon wrapper.
// <Icon name="shopping_bag" className="text-[20px]" filled />
export default function Icon({ name, className = '', filled = false, style = {} }) {
  return (
    <span
      className={`material-symbols-outlined${filled ? ' fill' : ''} ${className}`}
      style={style}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
