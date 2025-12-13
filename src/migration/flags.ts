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

  // Feature flags - toggleable for gradual rollout
  profile: false,
  catalog: false,
  kyc: false,
  businessDashboard: false,
  driverHome: false,
  dataSandbox: false,
  drawerAutoOpen: false,
  search: false,
  reactions: false,
  productDetail: false
};

// Core unified shell is now ALWAYS enabled
// Feature flags can still be toggled independently via DevMigrationPanel in development
