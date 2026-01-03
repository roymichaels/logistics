const STORAGE_KEY = 'diagnostic_tracking_data';
const VISIBILITY_KEY = 'diagnostic_dashboard_visible';
const DATA_TTL = 5 * 60 * 1000; // 5 minutes

export interface StoredDiagnosticData {
  timestamp: number;
  components: Map<string, any>;
  routes: Map<string, any>;
  hookCalls: Map<string, Map<string, number>>;
  functionCalls: Map<string, any>;
  errors: Array<any>;
  performanceMetrics: any;
  sessionMetadata: {
    startTime: number;
    userRole?: string;
    deviceInfo?: string;
    appVersion?: string;
  };
}

class SessionStorageAdapter {
  private saveTimeout: NodeJS.Timeout | null = null;

  saveToSession(data: Partial<StoredDiagnosticData>): void {
    if (!this.isDevelopment()) return;

    try {
      const stored: StoredDiagnosticData = {
        timestamp: Date.now(),
        components: data.components || new Map(),
        routes: data.routes || new Map(),
        hookCalls: data.hookCalls || new Map(),
        functionCalls: data.functionCalls || new Map(),
        errors: data.errors || [],
        performanceMetrics: data.performanceMetrics || {},
        sessionMetadata: data.sessionMetadata || {
          startTime: Date.now()
        }
      };

      const serialized = this.serializeData(stored);
      sessionStorage.setItem(STORAGE_KEY, serialized);
    } catch (error) {
      console.warn('Failed to save diagnostic data to session:', error);
    }
  }

  loadFromSession(): StoredDiagnosticData | null {
    if (!this.isDevelopment()) return null;

    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const data = this.deserializeData(stored);

      if (this.isExpired(data.timestamp)) {
        this.clearSession();
        return null;
      }

      return data;
    } catch (error) {
      console.warn('Failed to load diagnostic data from session:', error);
      return null;
    }
  }

  clearSession(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(VISIBILITY_KEY);
    } catch (error) {
      console.warn('Failed to clear session storage:', error);
    }
  }

  saveDashboardVisibility(visible: boolean): void {
    if (!this.isDevelopment()) return;

    try {
      sessionStorage.setItem(VISIBILITY_KEY, visible ? '1' : '0');
    } catch (error) {
      console.warn('Failed to save dashboard visibility:', error);
    }
  }

  getDashboardVisibility(): boolean {
    if (!this.isDevelopment()) return false;

    try {
      return sessionStorage.getItem(VISIBILITY_KEY) === '1';
    } catch (error) {
      return false;
    }
  }

  scheduleAutoSave(callback: () => void): void {
    if (!this.isDevelopment()) return;

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      callback();
      this.scheduleAutoSave(callback);
    }, 5000);
  }

  cancelAutoSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
  }

  private serializeData(data: StoredDiagnosticData): string {
    return JSON.stringify({
      ...data,
      components: Array.from(data.components.entries()),
      routes: Array.from(data.routes.entries()),
      hookCalls: Array.from(data.hookCalls.entries()).map(([key, value]) => [
        key,
        Array.from(value.entries())
      ]),
      functionCalls: Array.from(data.functionCalls.entries())
    });
  }

  private deserializeData(serialized: string): StoredDiagnosticData {
    const parsed = JSON.parse(serialized);
    return {
      timestamp: parsed.timestamp,
      components: new Map(parsed.components || []),
      routes: new Map(parsed.routes || []),
      hookCalls: new Map(
        (parsed.hookCalls || []).map(([key, value]: [string, any]) => [
          key,
          new Map(value)
        ])
      ),
      functionCalls: new Map(parsed.functionCalls || []),
      errors: parsed.errors || [],
      performanceMetrics: parsed.performanceMetrics || {},
      sessionMetadata: parsed.sessionMetadata || { startTime: Date.now() }
    };
  }

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > DATA_TTL;
  }

  private isDevelopment(): boolean {
    return import.meta.env.DEV;
  }

  getDataSize(): number {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored ? stored.length : 0;
    } catch {
      return 0;
    }
  }

  getDataSizeFormatted(): string {
    const bytes = this.getDataSize();
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

export const sessionStorageAdapter = new SessionStorageAdapter();
