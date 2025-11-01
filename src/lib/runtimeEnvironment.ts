/**
 * Runtime Environment Detection
 *
 * Detects and handles different runtime environments including:
 * - Production deployment
 * - Local development
 * - Bolt.new/StackBlitz WebContainer (development IDE)
 * - Netlify/Vercel deployment
 */

export interface RuntimeEnvironment {
  type: 'production' | 'development' | 'webcontainer' | 'preview';
  isWebContainer: boolean;
  isLocalDev: boolean;
  isProduction: boolean;
  isPreview: boolean;
  hasBackendServices: boolean;
  supportsWebSockets: boolean;
  origin: string;
}

class RuntimeEnvironmentService {
  private _env: RuntimeEnvironment | null = null;

  /**
   * Detect current runtime environment
   */
  detect(): RuntimeEnvironment {
    if (this._env) {
      return this._env;
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';

    // Check for WebContainer environment (Bolt.new, StackBlitz)
    const isWebContainer = this.isWebContainerEnvironment(origin, hostname);

    // Check for local development
    const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1';

    // Check for preview deployments
    const isPreview = hostname.includes('preview') || hostname.includes('deploy-preview');

    // Determine environment type
    let type: RuntimeEnvironment['type'] = 'production';
    if (isWebContainer) {
      type = 'webcontainer';
    } else if (isLocalDev) {
      type = 'development';
    } else if (isPreview) {
      type = 'preview';
    }

    // Check for backend services availability
    const hasBackendServices = !isWebContainer && (isLocalDev || isProduction);

    // WebSockets support
    const supportsWebSockets = !isWebContainer;

    this._env = {
      type,
      isWebContainer,
      isLocalDev,
      isProduction: type === 'production',
      isPreview,
      hasBackendServices,
      supportsWebSockets,
      origin
    };

    console.log('🌍 Runtime environment detected:', this._env);

    return this._env;
  }

  /**
   * Check if running in WebContainer environment
   */
  private isWebContainerEnvironment(origin: string, hostname: string): boolean {
    const webContainerIndicators = [
      'webcontainer',
      'stackblitz',
      'bolt.new',
      'local-credentialless.webcontainer-api.io',
      '.local-credentialless.',
      'bolt-',
      'blitz.'
    ];

    const isWebContainer = webContainerIndicators.some(indicator =>
      origin.toLowerCase().includes(indicator) ||
      hostname.toLowerCase().includes(indicator)
    );

    // Check for WebContainer-specific globals
    if (typeof window !== 'undefined') {
      const w = window as any;
      if (w.__WEBCONTAINER__ || w.__BOLT__ || w.__STACKBLITZ__) {
        return true;
      }
    }

    return isWebContainer;
  }

  /**
   * Get current environment
   */
  get env(): RuntimeEnvironment {
    return this._env || this.detect();
  }

  /**
   * Check if feature is available in current environment
   */
  isFeatureAvailable(feature: 'websockets' | 'backend' | 'realtime' | 'localStorage'): boolean {
    const env = this.env;

    switch (feature) {
      case 'websockets':
        return env.supportsWebSockets;

      case 'backend':
        return env.hasBackendServices;

      case 'realtime':
        return env.supportsWebSockets && env.hasBackendServices;

      case 'localStorage':
        return typeof window !== 'undefined' && 'localStorage' in window;

      default:
        return false;
    }
  }

  /**
   * Get API base URL based on environment
   */
  getApiBaseUrl(): string {
    const env = this.env;

    // In WebContainer, don't use relative API endpoints
    if (env.isWebContainer) {
      console.warn('[Runtime] WebContainer detected - API endpoints may not be available');
      return '';
    }

    // In local dev, use local API
    if (env.isLocalDev) {
      return 'http://localhost:3000/api';
    }

    // In production/preview, use relative API endpoints
    return '/api';
  }

  /**
   * Check if should mock API responses
   */
  shouldMockApiResponses(): boolean {
    return this.env.isWebContainer;
  }

  /**
   * Get environment-specific configuration
   */
  getConfig() {
    const env = this.env;

    return {
      apiBaseUrl: this.getApiBaseUrl(),
      enableWebSockets: env.supportsWebSockets,
      enableRealtime: this.isFeatureAvailable('realtime'),
      useMockData: env.isWebContainer,
      enableDebugMode: env.isLocalDev || env.isWebContainer,
      enableErrorReporting: env.isProduction,
      enableConsoleLogging: !env.isProduction
    };
  }

  /**
   * Reset cached environment (useful for testing)
   */
  reset(): void {
    this._env = null;
  }

  /**
   * Display environment info to console
   */
  displayInfo(): void {
    const env = this.env;
    const config = this.getConfig();

    console.group('🌍 Runtime Environment Info');
    console.log('Environment Type:', env.type);
    console.log('Origin:', env.origin);
    console.log('Is WebContainer:', env.isWebContainer);
    console.log('Is Local Dev:', env.isLocalDev);
    console.log('Is Production:', env.isProduction);
    console.log('Has Backend Services:', env.hasBackendServices);
    console.log('Supports WebSockets:', env.supportsWebSockets);
    console.log('Configuration:', config);
    console.groupEnd();
  }
}

// Export singleton instance
export const runtimeEnvironment = new RuntimeEnvironmentService();

// Auto-detect on module load
if (typeof window !== 'undefined') {
  runtimeEnvironment.detect();

  // Expose for debugging
  (window as any).runtimeEnvironment = runtimeEnvironment;
  (window as any).showRuntimeInfo = () => runtimeEnvironment.displayInfo();
}

export default runtimeEnvironment;
