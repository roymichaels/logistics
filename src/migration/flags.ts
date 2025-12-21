export const migrationFlags = {
  useUnifiedRouter: true,
  useUnifiedShell: true,
  useNewNavigation: true,
  useDevConsole: true,
  useOptimizedRendering: true,
  useFrontendOnlyMode: true,
  useWalletAuth: true,
  enableDebugMode: false,
  enableMockData: false,
  showWireframes: false,
};

export type MigrationFlags = typeof migrationFlags;
