import React from 'react';

/**
 * Catches render crashes anywhere in the tree and shows a friendly
 * fallback instead of a blank white page. Last-resort safety net —
 * individual pages should still handle their own API/data errors.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
          <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow">
            <p className="text-5xl">😕</p>
            <h1 className="mt-4 text-xl font-extrabold text-gray-900">Something went wrong</h1>
            <p className="mt-2 text-sm text-gray-500">
              This page hit an unexpected error. Try reloading — if it keeps happening, please contact support.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary mt-6"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
