import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppServices } from '../context/AppServicesContext';
import { PageLoadingSkeleton } from '../components/LoadingSkeleton';

const LoginPage = React.lazy(() => import('../pages/LoginPage').then(m => ({ default: m.LoginPage || m.default })));
const LandingPage = React.lazy(() => import('../pages/LandingPage').then(m => ({ default: m.LandingPage || m.default })));
const Dashboard = React.lazy(() => import('../pages/Dashboard').then(m => ({ default: m.Dashboard || m.default })));
const Orders = React.lazy(() => import('../pages/Orders').then(m => ({ default: m.Orders || m.default })));
const Products = React.lazy(() => import('../pages/Products').then(m => ({ default: m.Products || m.default })));
const Chat = React.lazy(() => import('../pages/Chat').then(m => ({ default: m.Chat || m.default })));

export function SimpleRouter() {
  const { isAuthenticated } = useAppServices();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/auth/login" element={<Suspense fallback={<PageLoadingSkeleton />}><LoginPage /></Suspense>} />
        <Route path="/" element={<Suspense fallback={<PageLoadingSkeleton />}><LandingPage /></Suspense>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/dashboard" element={<Suspense fallback={<PageLoadingSkeleton />}><Dashboard /></Suspense>} />
      <Route path="/orders" element={<Suspense fallback={<PageLoadingSkeleton />}><Orders /></Suspense>} />
      <Route path="/products" element={<Suspense fallback={<PageLoadingSkeleton />}><Products /></Suspense>} />
      <Route path="/chat" element={<Suspense fallback={<PageLoadingSkeleton />}><Chat /></Suspense>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
