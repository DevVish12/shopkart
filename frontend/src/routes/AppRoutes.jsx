import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import CustomerLayout from '../layouts/CustomerLayout.jsx';
import AdminLayout from '../layouts/AdminLayout.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import AdminRoute, { AdminAuthProvider, RequirePermission } from './AdminRoute.jsx';

import Home from '../pages/customer/Home.jsx';
import Products from '../pages/customer/Products.jsx';
import ProductDetails from '../pages/customer/ProductDetails.jsx';
import Categories from '../pages/customer/Categories.jsx';
import SearchResults from '../pages/customer/SearchResults.jsx';
import Cart from '../pages/customer/Cart.jsx';
import Checkout from '../pages/customer/Checkout.jsx';
import OrderSuccess from '../pages/customer/OrderSuccess.jsx';
import CmsPage from '../pages/customer/CmsPage.jsx';
import Notifications from '../pages/customer/Notifications.jsx';
import Login from '../pages/customer/auth/Login.jsx';
import Register from '../pages/customer/auth/Register.jsx';
import ForgotPassword from '../pages/customer/auth/ForgotPassword.jsx';
import ResetPassword from '../pages/customer/auth/ResetPassword.jsx';
import Profile from '../pages/customer/account/Profile.jsx';
import Orders from '../pages/customer/account/Orders.jsx';
import OrderDetails from '../pages/customer/account/OrderDetails.jsx';
import Wishlist from '../pages/customer/account/Wishlist.jsx';
import Addresses from '../pages/customer/account/Addresses.jsx';
import ChangePassword from '../pages/customer/account/ChangePassword.jsx';

import AdminLogin from '../pages/admin/Login.jsx';
import Dashboard from '../pages/admin/Dashboard.jsx';
import AdminProducts from '../pages/admin/Products.jsx';
import ProductForm from '../pages/admin/ProductForm.jsx';
import AdminCategories from '../pages/admin/Categories.jsx';
import AdminBrands from '../pages/admin/Brands.jsx';
import AdminOrders from '../pages/admin/Orders.jsx';
import OrderDetail from '../pages/admin/OrderDetail.jsx';
import Customers from '../pages/admin/Customers.jsx';
import CustomerDetail from '../pages/admin/CustomerDetail.jsx';
import Coupons from '../pages/admin/Coupons.jsx';
import Reviews from '../pages/admin/Reviews.jsx';
import Banners from '../pages/admin/Banners.jsx';
import Shipping from '../pages/admin/Shipping.jsx';
import AdminNotifications from '../pages/admin/Notifications.jsx';
import Reports from '../pages/admin/Reports.jsx';
import CMS from '../pages/admin/CMS.jsx';
import CmsForm from '../pages/admin/CmsForm.jsx';
import Settings from '../pages/admin/Settings.jsx';
import AdminUsers from '../pages/admin/AdminUsers.jsx';
import Roles from '../pages/admin/Roles.jsx';
import RoleForm from '../pages/admin/RoleForm.jsx';

const CMS_SLUGS = ['about-us', 'contact-us', 'privacy-policy', 'terms-conditions', 'refund-policy', 'shipping-policy', 'faq'];

export default function AppRoutes() {
  return (
    <Routes>
      {/* Customer storefront */}
      <Route element={<CustomerLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:slug" element={<ProductDetails />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
        <Route path="/order-success/:orderNumber" element={<ProtectedRoute><OrderSuccess /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/account" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/account/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
        <Route path="/account/orders/:id" element={<ProtectedRoute><OrderDetails /></ProtectedRoute>} />
        <Route path="/account/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
        <Route path="/account/addresses" element={<ProtectedRoute><Addresses /></ProtectedRoute>} />
        <Route path="/account/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
        {CMS_SLUGS.map((slug) => (
          <Route key={slug} path={`/${slug}`} element={<CmsPage slug={slug} />} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>

      {/* Admin panel */}
      <Route path="/admin/login" element={<AdminAuthProvider><AdminLogin /></AdminAuthProvider>} />
      <Route
        path="/admin"
        element={
          <AdminAuthProvider>
            <AdminRoute><AdminLayout /></AdminRoute>
          </AdminAuthProvider>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<RequirePermission perm="dashboard.view"><Dashboard /></RequirePermission>} />
        <Route path="products" element={<RequirePermission perm="products.view"><AdminProducts /></RequirePermission>} />
        <Route path="products/new" element={<RequirePermission perm="products.create"><ProductForm /></RequirePermission>} />
        <Route path="products/:id/edit" element={<RequirePermission perm="products.edit"><ProductForm /></RequirePermission>} />
        <Route path="categories" element={<RequirePermission perm="categories.view"><AdminCategories /></RequirePermission>} />
        <Route path="brands" element={<RequirePermission perm="brands.view"><AdminBrands /></RequirePermission>} />
        <Route path="orders" element={<RequirePermission perm="orders.view"><AdminOrders /></RequirePermission>} />
        <Route path="orders/:id" element={<RequirePermission perm="orders.view"><OrderDetail /></RequirePermission>} />
        <Route path="customers" element={<RequirePermission perm="customers.view"><Customers /></RequirePermission>} />
        <Route path="customers/:id" element={<RequirePermission perm="customers.view"><CustomerDetail /></RequirePermission>} />
        <Route path="coupons" element={<RequirePermission perm="coupons.view"><Coupons /></RequirePermission>} />
        <Route path="reviews" element={<RequirePermission perm="reviews.view"><Reviews /></RequirePermission>} />
        <Route path="banners" element={<RequirePermission perm="banners.view"><Banners /></RequirePermission>} />
        <Route path="shipping" element={<RequirePermission perm="shipping.view"><Shipping /></RequirePermission>} />
        <Route path="notifications" element={<RequirePermission perm="notifications.view"><AdminNotifications /></RequirePermission>} />
        <Route path="reports" element={<RequirePermission perm="reports.view"><Reports /></RequirePermission>} />
        <Route path="cms" element={<RequirePermission perm="cms.view"><CMS /></RequirePermission>} />
        <Route path="cms/new" element={<RequirePermission perm="cms.edit"><CmsForm /></RequirePermission>} />
        <Route path="cms/:id/edit" element={<RequirePermission perm="cms.edit"><CmsForm /></RequirePermission>} />
        <Route path="settings" element={<RequirePermission perm="settings.view"><Settings /></RequirePermission>} />
        <Route path="users" element={<RequirePermission perm="admins.view"><AdminUsers /></RequirePermission>} />
        <Route path="roles" element={<RequirePermission perm="roles.view"><Roles /></RequirePermission>} />
        <Route path="roles/new" element={<RequirePermission perm="roles.create"><RoleForm /></RequirePermission>} />
        <Route path="roles/:id/edit" element={<RequirePermission perm="roles.edit"><RoleForm /></RequirePermission>} />
      </Route>
    </Routes>
  );
}
