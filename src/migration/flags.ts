export const migrationFlags = {
  // Core unified shell flags - ALWAYS ENABLED for architectural consolidation
  unifiedShell: true,
  unifiedApp: true,
  header: true,
  modal: true,
  drawer: true,
  popover: true,
  navigation: true,
  searchHeader: true,

  // Feature flags - FULLY ENABLED for unified platform
  profile: true,
  catalog: true,
  kyc: true,
  businessDashboard: true,
  driverHome: true,
  dataSandbox: true,
  drawerAutoOpen: true,
  search: true,
  reactions: true,
  productDetail: true
};

// Core unified shell is now ALWAYS enabled
// Feature flags can still be toggled independently via DevMigrationPanel in development
