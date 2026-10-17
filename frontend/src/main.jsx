import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
import RealtimeConnector from './realtime/RealtimeConnector.jsx';
import { loadTheme } from './theme.js';
import './index.css';

loadTheme();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
      <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <RealtimeConnector />
          <App />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
      </HelmetProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
