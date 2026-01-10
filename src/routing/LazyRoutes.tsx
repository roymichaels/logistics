import { lazy } from 'react';

export const AdminRoutes = {
  PlatformDashboard: lazy(() => import('../pages/admin/PlatformDashboard').catch(() => ({ default: () => <div>Error loading page</div> }))),
  Infrastructures: lazy(() => import('../pages/admin/Infrastructures').catch(() => ({ default: () => <div>Error loading page</div> }))),
  Superadmins: lazy(() => import('../pages/admin/Superadmins').catch(() => ({ default: () => <div>Error loading page</div> }))),
  AdminBusinesses: lazy(() => import('../pages/admin/AdminBusinesses').catch(() => ({ default: () => <div>Error loading page</div> }))),
  AdminUsers: lazy(() => import('../pages/admin/AdminUsers').catch(() => ({ default: () => <div>Error loading page</div> }))),
  PlatformCatalog: lazy(() => import('../pages/admin/PlatformCatalog').catch(() => ({ default: () => <div>Error loading page</div> }))),
  AdminAnalytics: lazy(() => import('../pages/admin/AdminAnalytics').catch(() => ({ default: () => <div>Error loading page</div> }))),
  AdminOrders: lazy(() => import('../pages/admin/AdminOrders').catch(() => ({ default: () => <div>Error loading page</div> }))),
  DriverApplications: lazy(() => import('../pages/admin/DriverApplications').catch(() => ({ default: () => <div>Error loading page</div> }))),
  AuditLogs: lazy(() => import('../pages/admin/AuditLogs').catch(() => ({ default: () => <div>Error loading page</div> }))),
  FeatureFlags: lazy(() => import('../pages/admin/FeatureFlags').catch(() => ({ default: () => <div>Error loading page</div> }))),
  PermissionManagement: lazy(() => import('../pages/admin/PermissionManagement').catch(() => ({ default: () => <div>Error loading page</div> }))),
  AdminSettings: lazy(() => import('../pages/admin/AdminSettings').catch(() => ({ default: () => <div>Error loading page</div> }))),
};

export const BusinessRoutes = {
  Dashboard: lazy(() => import('../pages/business/UnifiedBusinessDashboard').catch(() => ({ default: () => <div>Error loading page</div> }))),
  BusinessesPortfolio: lazy(() => import('../pages/business/BusinessesPortfolio').catch(() => ({ default: () => <div>Error loading page</div> }))),
  BusinessCatalog: lazy(() => import('../pages/business/BusinessCatalogManagement').catch(() => ({ default: () => <div>Error loading page</div> }))),
  BusinessInventory: lazy(() => import('../pages/business/BusinessInventory').catch(() => ({ default: () => <div>Error loading page</div> }))),
  BusinessOrders: lazy(() => import('../pages/business/BusinessOrders').catch(() => ({ default: () => <div>Error loading page</div> }))),
  DispatchBoard: lazy(() => import('../pages/DispatchBoard').catch(() => ({ default: () => <div>Error loading page</div> }))),
  BusinessDrivers: lazy(() => import('../pages/business/BusinessDrivers').catch(() => ({ default: () => <div>Error loading page</div> }))),
  ZoneManagement: lazy(() => import('../pages/ZoneManagement').catch(() => ({ default: () => <div>Error loading page</div> }))),
  TeamManagement: lazy(() => import('../pages/business/TeamManagement').catch(() => ({ default: () => <div>Error loading page</div> }))),
  Reports: lazy(() => import('../pages/Reports').catch(() => ({ default: () => <div>Error loading page</div> }))),
  BusinessSettings: lazy(() => import('../pages/business/Settings').catch(() => ({ default: () => <div>Error loading page</div> }))),
  AnalyticsHub: lazy(() => import('../pages/business/AnalyticsHub').catch(() => ({ default: () => <div>Error loading page</div> }))),
};

export const DriverRoutes = {
  DriverHome: lazy(() => import('../pages/driver/DriverHome').catch(() => ({ default: () => <div>Error loading page</div> }))),
  MyDeliveries: lazy(() => import('../pages/MyDeliveries').catch(() => ({ default: () => <div>Error loading page</div> }))),
  DriverStats: lazy(() => import('../pages/driver/DriverStats').catch(() => ({ default: () => <div>Error loading page</div> }))),
  MyZones: lazy(() => import('../pages/MyZones').catch(() => ({ default: () => <div>Error loading page</div> }))),
  UnifiedDriverDashboard: lazy(() => import('../pages/driver/UnifiedDriverDashboard').catch(() => ({ default: () => <div>Error loading page</div> }))),
};

export const StoreRoutes = {
  CatalogPage: lazy(() => import('../store/CatalogPage').catch(() => ({ default: () => <div>Error loading page</div> }))),
  CartPage: lazy(() => import('../store/CartPage').catch(() => ({ default: () => <div>Error loading page</div> }))),
  CheckoutPage: lazy(() => import('../store/CheckoutPage').catch(() => ({ default: () => <div>Error loading page</div> }))),
  MyOrdersPage: lazy(() => import('../store/MyOrdersPage').catch(() => ({ default: () => <div>Error loading page</div> }))),
  OrderDetailPage: lazy(() => import('../store/OrderDetailPage').catch(() => ({ default: () => <div>Error loading page</div> }))),
  SearchPage: lazy(() => import('../store/SearchPage').catch(() => ({ default: () => <div>Error loading page</div> }))),
};

export const AuthRoutes = {
  LoginPage: lazy(() => import('../pages/LoginPage').catch(() => ({ default: () => <div>Error loading page</div> }))),
  RoleSelectionPage: lazy(() => import('../pages/RoleSelectionPage').catch(() => ({ default: () => <div>Error loading page</div> }))),
  KycFlow: lazy(() => import('../components/KYCFlow/IDUpload').catch(() => ({ default: () => <div>Error loading page</div> }))),
};

export const CommonRoutes = {
  UserProfile: lazy(() => import('../pages/UserProfile').catch(() => ({ default: () => <div>Error loading page</div> }))),
  Notifications: lazy(() => import('../pages/Notifications').catch(() => ({ default: () => <div>Error loading page</div> }))),
  Chat: lazy(() => import('../pages/Chat').catch(() => ({ default: () => <div>Error loading page</div> }))),
  ModernChat: lazy(() => import('../pages/ModernChat').catch(() => ({ default: () => <div>Error loading page</div> }))),
  Channels: lazy(() => import('../pages/Channels').catch(() => ({ default: () => <div>Error loading page</div> }))),
  Dashboard: lazy(() => import('../pages/Dashboard').catch(() => ({ default: () => <div>Error loading page</div> }))),
  Businesses: lazy(() => import('../pages/Businesses').catch(() => ({ default: () => <div>Error loading page</div> }))),
  Products: lazy(() => import('../pages/Products').catch(() => ({ default: () => <div>Error loading page</div> }))),
  Tasks: lazy(() => import('../pages/Tasks').catch(() => ({ default: () => <div>Error loading page</div> }))),
  Unauthorized: lazy(() => import('../pages/Unauthorized').catch(() => ({ default: () => <div>Error loading page</div> }))),
};

export const PublicRoutes = {
  LandingPage: lazy(() => import('../pages/LandingPage').catch(() => ({ default: () => <div>Error loading page</div> }))),
  PublicBusinessPage: lazy(() => import('../pages/public/PublicBusinessPage').catch(() => ({ default: () => <div>Error loading page</div> }))),
  BusinessDirectory: lazy(() => import('../pages/public/BusinessDirectory').catch(() => ({ default: () => <div>Error loading page</div> }))),
  PublicUserProfile: lazy(() => import('../pages/PublicUserProfile').catch(() => ({ default: () => <div>Error loading page</div> }))),
  EnhancedPublicUserProfile: lazy(() => import('../pages/EnhancedPublicUserProfile').catch(() => ({ default: () => <div>Error loading page</div> }))),
};

export const LoadingFallback = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    padding: '24px'
  }}>
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px'
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        border: '4px solid #f3f4f6',
        borderTopColor: '#3b82f6',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <p style={{
        margin: 0,
        fontSize: '14px',
        color: '#6b7280'
      }}>
        Loading...
      </p>
    </div>
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);
