import { migrationFlags } from "../flags";

export const switchboardLegacyResolvers = {
  AdminPanel: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/AdminPanel.legacy")).default;
    }
    return (await import("../../pages/pages/AdminPanel.tsx")).default;
  },
  AppOwnerAnalytics: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/AppOwnerAnalytics.legacy")).default;
    }
    return (await import("../../pages/pages/AppOwnerAnalytics.tsx")).default;
  },
  KYCReviewDetail: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/KYCReviewDetail.legacy")).default;
    }
    return (await import("../../pages/pages/business/kyc/KYCReviewDetail.tsx")).default;
  },
  KYCReviewList: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/KYCReviewList.legacy")).default;
    }
    return (await import("../../pages/pages/business/kyc/KYCReviewList.tsx")).default;
  },
  Businesses: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/Businesses.legacy")).default;
    }
    return (await import("../../pages/pages/Businesses.tsx")).default;
  },
  BusinessPage: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/BusinessPage.legacy")).default;
    }
    return (await import("../../pages/pages/BusinessPage.tsx")).default;
  },
  Catalog: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/Catalog.legacy")).default;
    }
    return (await import("../../pages/pages/Catalog.tsx")).default;
  },
  Channels: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/Channels.legacy")).default;
    }
    return (await import("../../pages/pages/Channels.tsx")).default;
  },
  Chat: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/Chat.legacy")).default;
    }
    return (await import("../../pages/pages/Chat.tsx")).default;
  },
  ComponentShowcase: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/ComponentShowcase.legacy")).default;
    }
    return (await import("../../pages/pages/ComponentShowcase.tsx")).default;
  },
  Dashboard: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/Dashboard.legacy")).default;
    }
    return (await import("../../pages/pages/Dashboard.tsx")).default;
  },
  DispatchBoard: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/DispatchBoard.legacy")).default;
    }
    return (await import("../../pages/pages/DispatchBoard.tsx")).default;
  },
  DriverDashboard: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/DriverDashboard.legacy")).default;
    }
    return (await import("../../pages/pages/DriverDashboard.tsx")).default;
  },
  DriversManagement: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/DriversManagement.legacy")).default;
    }
    return (await import("../../pages/pages/DriversManagement.tsx")).default;
  },
  DriverStatus: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/DriverStatus.legacy")).default;
    }
    return (await import("../../pages/pages/DriverStatus.tsx")).default;
  },
  ExampleDashboard: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/ExampleDashboard.legacy")).default;
    }
    return (await import("../../pages/pages/ExampleDashboard.tsx")).default;
  },
  FreelancerDriverDashboard: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/FreelancerDriverDashboard.legacy")).default;
    }
    return (await import("../../pages/pages/FreelancerDriverDashboard.tsx")).default;
  },
  Incoming: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/Incoming.legacy")).default;
    }
    return (await import("../../pages/pages/Incoming.tsx")).default;
  },
  Inventory: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/Inventory.legacy")).default;
    }
    return (await import("../../pages/pages/Inventory.tsx")).default;
  },
  KYCFlow: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/KYCFlow.legacy")).default;
    }
    return (await import("../../pages/pages/kyc/KYCFlow.tsx")).default;
  },
  ReviewPending: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/ReviewPending.legacy")).default;
    }
    return (await import("../../pages/pages/kyc/ReviewPending.tsx")).default;
  },
  Step1Liveness: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/Step1Liveness.legacy")).default;
    }
    return (await import("../../pages/pages/kyc/Step1_Liveness.tsx")).default;
  },
  Step2IDUpload: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/Step2IDUpload.legacy")).default;
    }
    return (await import("../../pages/pages/kyc/Step2_IDUpload.tsx")).default;
  },
  Step3SocialMedia: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/Step3SocialMedia.legacy")).default;
    }
    return (await import("../../pages/pages/kyc/Step3_SocialMedia.tsx")).default;
  },
  StepHeader: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/StepHeader.legacy")).default;
    }
    return (await import("../../pages/pages/kyc/StepHeader.tsx")).default;
  },
  LandingPage: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/LandingPage.legacy")).default;
    }
    return (await import("../../pages/pages/LandingPage.tsx")).default;
  },
  LoginPage: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/LoginPage.legacy")).default;
    }
    return (await import("../../pages/pages/LoginPage.tsx")).default;
  },
  Logs: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/Logs.legacy")).default;
    }
    return (await import("../../pages/pages/Logs.tsx")).default;
  },
  ManagerInventory: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/ManagerInventory.legacy")).default;
    }
    return (await import("../../pages/pages/ManagerInventory.tsx")).default;
  },
  MyDeliveries: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/MyDeliveries.legacy")).default;
    }
    return (await import("../../pages/pages/MyDeliveries.tsx")).default;
  },
  MyInventory: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/MyInventory.legacy")).default;
    }
    return (await import("../../pages/pages/MyInventory.tsx")).default;
  },
  MyRole: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/MyRole.legacy")).default;
    }
    return (await import("../../pages/pages/MyRole.tsx")).default;
  },
  MyStats: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/MyStats.legacy")).default;
    }
    return (await import("../../pages/pages/MyStats.tsx")).default;
  },
  MyZones: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/MyZones.legacy")).default;
    }
    return (await import("../../pages/pages/MyZones.tsx")).default;
  },
  Notifications: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/Notifications.legacy")).default;
    }
    return (await import("../../pages/pages/Notifications.tsx")).default;
  },
  Orders: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/Orders.legacy")).default;
    }
    return (await import("../../pages/pages/Orders.tsx")).default;
  },
  Products: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/Products.legacy")).default;
    }
    return (await import("../../pages/pages/Products.tsx")).default;
  },
  Profile: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/Profile.legacy")).default;
    }
    return (await import("../../pages/pages/Profile.tsx")).default;
  },
  Reports: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/Reports.legacy")).default;
    }
    return (await import("../../pages/pages/Reports.tsx")).default;
  },
  RestockRequests: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/RestockRequests.legacy")).default;
    }
    return (await import("../../pages/pages/RestockRequests.tsx")).default;
  },
  Sandbox: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/Sandbox.legacy")).default;
    }
    return (await import("../../pages/pages/Sandbox.tsx")).default;
  },
  SocialAnalytics: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/SocialAnalytics.legacy")).default;
    }
    return (await import("../../pages/pages/SocialAnalytics.tsx")).default;
  },
  SocialFeed: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/SocialFeed.legacy")).default;
    }
    return (await import("../../pages/pages/SocialFeed.tsx")).default;
  },
  StartNew: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/StartNew.legacy")).default;
    }
    return (await import("../../pages/pages/StartNew.tsx")).default;
  },
  Tasks: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/Tasks.legacy")).default;
    }
    return (await import("../../pages/pages/Tasks.tsx")).default;
  },
  UserHomepage: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/UserHomepage.legacy")).default;
    }
    return (await import("../../pages/pages/UserHomepage.tsx")).default;
  },
  UserManagement: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/UserManagement.legacy")).default;
    }
    return (await import("../../pages/pages/UserManagement.tsx")).default;
  },
  UserProfile: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/UserProfile.legacy")).default;
    }
    return (await import("../../pages/pages/UserProfile.tsx")).default;
  },
  WarehouseDashboard: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/WarehouseDashboard.legacy")).default;
    }
    return (await import("../../pages/pages/WarehouseDashboard.tsx")).default;
  },
  ZoneManagement: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/ZoneManagement.legacy")).default;
    }
    return (await import("../../pages/pages/ZoneManagement.tsx")).default;
  },
};
