// Keeps the realtime socket connected whenever a customer or admin token exists.
// Mount once in main.jsx. Reconnects automatically on login, disconnects on logout.
import { useEffect } from 'react';
import { connectRealtime, disconnectRealtime } from './socket.js';

const hasToken = () =>
  Boolean(
    localStorage.getItem('sk_admin_token') || localStorage.getItem('sk_customer_token')
  );

export default function RealtimeConnector() {
  useEffect(() => {
    const sync = () => {
      if (hasToken()) connectRealtime();
      else disconnectRealtime();
    };
    sync();
    // Login/logout in another tab, plus our own login/logout flows.
    window.addEventListener('storage', sync);
    const timer = setInterval(sync, 5000);
    return () => {
      window.removeEventListener('storage', sync);
      clearInterval(timer);
    };
  }, []);

  return null;
}
