import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/customer/Navbar.jsx';
import AnnouncementBar from '../components/customer/AnnouncementBar.jsx';
import Footer from '../components/customer/Footer.jsx';
import MobileBottomNav from '../components/customer/MobileBottomNav.jsx';
import { ToastProvider } from '../components/common/Toast.jsx';

export default function CustomerLayout() {
  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col">
        <AnnouncementBar />
        <Navbar />
        <main className="flex-1 pb-20 md:pb-0">
          <Outlet />
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    </ToastProvider>
  );
}
