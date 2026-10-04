import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import AdminRoute from './components/auth/AdminRoute.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import Spinner from './components/ui/Spinner.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import StorefrontLayout from './layouts/StorefrontLayout.jsx';

const HomePage = lazy(() => import('./pages/shop/HomePage.jsx'));
const ProductsPage = lazy(() => import('./pages/shop/ProductsPage.jsx'));
const ProductDetailPage = lazy(() => import('./pages/shop/ProductDetailPage.jsx'));
const CartPage = lazy(() => import('./pages/shop/CartPage.jsx'));
const CheckoutPage = lazy(() => import('./pages/shop/CheckoutPage.jsx'));
const AccountPage = lazy(() => import('./pages/account/AccountPage.jsx'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage.jsx'));
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage.jsx'));
const AdminProductsPage = lazy(() => import('./pages/admin/ProductsPage.jsx'));
const AdminCategoriesPage = lazy(() => import('./pages/admin/CategoriesPage.jsx'));
const AdminOrdersPage = lazy(() => import('./pages/admin/OrdersPage.jsx'));
const UiKitPage = lazy(() => import('./pages/dev/UiKitPage.jsx'));

function Fallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <Spinner />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route element={<StorefrontLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:slug" element={<ProductDetailPage />} />
          <Route
            path="/cart"
            element={
              <ProtectedRoute>
                <CartPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account/*"
            element={
              <ProtectedRoute>
                <AccountPage />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
        </Route>
        <Route path="/dev/ui" element={<UiKitPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
