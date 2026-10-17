import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar.jsx';
import AdminNavbar from '../components/admin/AdminNavbar.jsx';
import { ToastProvider } from '../components/common/Toast.jsx';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-[#eef3fa]">
        <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col lg:pl-[17rem]">
          <AdminNavbar onMenuClick={() => setSidebarOpen(true)} />
          <main className="mx-auto w-full max-w-[1400px] flex-1 p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
