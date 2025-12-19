export const sessionHealthMonitor = {
  startMonitoring(): void {
    console.log('[STUB] sessionHealthMonitor.startMonitoring - frontend-only mode');
  },

  stopMonitoring(): void {
    console.log('[STUB] sessionHealthMonitor.stopMonitoring - frontend-only mode');
  },

  isHealthy(): boolean {
    return true;
  },

  getStatus(): any {
    return { status: 'ok', mode: 'frontend-only' };
  }
};
