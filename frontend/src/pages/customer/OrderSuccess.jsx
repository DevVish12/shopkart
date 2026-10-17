import React from 'react';
import { Link, useParams } from 'react-router-dom';

export default function OrderSuccess() {
  const { orderNumber } = useParams();
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
        <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="mt-6 text-3xl font-extrabold">Order placed successfully!</h1>
      <p className="mt-2 text-gray-600">
        Thank you for shopping with us. Your order <span className="font-bold text-sk-ink">{orderNumber}</span> is confirmed
        and we will start packing it right away.
      </p>
      <p className="mt-2 text-sm text-gray-500">You will receive order updates on this page and in your notifications.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/account/orders" className="btn-primary">Track My Orders</Link>
        <Link to="/products" className="btn-outline">Continue Shopping</Link>
      </div>
    </div>
  );
}
