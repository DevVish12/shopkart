import React from 'react';

const styles = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  outline: 'btn-outline',
  danger: 'btn-danger',
  ghost: 'btn text-gray-700 hover:bg-gray-100',
};

export default function Button({ variant = 'primary', className = '', type = 'button', loading = false, disabled, children, ...rest }) {
  return (
    <button type={type} disabled={disabled || loading} className={`${styles[variant] || styles.primary} ${className}`} {...rest}>
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      )}
      {children}
    </button>
  );
}
