export const migrationFlags = {
  profile: false,
  catalog: false,
  kyc: false,
  businessDashboard: false,
  driverHome: false,
  header: false,
  modal: false,
  drawer: false,
  unifiedShell: false,
  popover: false,
  navigation: false,
  dataSandbox: false,
  drawerAutoOpen: false,
  search: false,
  searchHeader: false,
  reactions: false,
  productDetail: false,
  unifiedApp: false
};

// When unifiedApp is enabled, automatically elevate key feature flags so the unified experience is fully active.
if (migrationFlags.unifiedApp) {
  migrationFlags.header = true;
  migrationFlags.popover = true;
  migrationFlags.modal = true;
  migrationFlags.drawer = true;
  migrationFlags.catalog = true;
  migrationFlags.profile = true;
  migrationFlags.productDetail = true;
  migrationFlags.kyc = true;
  migrationFlags.businessDashboard = true;
  migrationFlags.driverHome = true;
  migrationFlags.unifiedShell = true;
}
