// Global toast notifications — neat Tailwind popups replacing window.alert().
// Wrap a layout with <ToastProvider>, then call const toast = useToast();
// toast.success('Saved'), toast.error('Failed'), toast.info('Note').
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);

let seq = 0;

const ICONS = {
  success: (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </span>
  ),
  error: (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </span>
  ),
  info: (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </span>
  ),
};

const BARS = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const tm = timers.current.get(id);
    if (tm) {
      clearTimeout(tm);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (type, message) => {
      const id = ++seq;
      setToasts((prev) => [...prev.slice(-3), { id, type, message: String(message) }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), type === 'error' ? 6000 : 4000)
      );
    },
    [dismiss]
  );

  const toast = useCallback(
    (message) => push('info', message),
    [push]
  );
  toast.success = useCallback((m) => push('success', m), [push]);
  toast.error = useCallback((m) => push('error', m), [push]);
  toast.info = useCallback((m) => push('info', m), [push]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5"
          >
            <div className={`w-1 self-stretch ${BARS[t.type]}`} />
            <div className="flex items-start gap-3 py-3 pr-2">
              {ICONS[t.type]}
              <p className="pt-1 text-sm font-medium text-gray-800">{t.message}</p>
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="ml-auto p-2 text-gray-400 hover:text-gray-600"
              aria-label="Dismiss"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) {
    // Fallback so components don't crash if provider is missing.
    const fallback = (m) => window.alert(m);
    fallback.success = fallback;
    fallback.error = fallback;
    fallback.info = fallback;
    return fallback;
  }
  return toast;
}
