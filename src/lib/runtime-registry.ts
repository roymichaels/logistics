import { sessionStorageAdapter, type StoredDiagnosticData } from './session-storage-adapter';

interface ComponentEntry {
  name: string;
  mountedAt: number;
  unmountedAt?: number;
  renderCount: number;
  errors: ErrorEntry[];
  warnings: string[];
  props?: Record<string, unknown>;
  lastRenderDuration?: number;
  hookCalls?: Map<string, number>;
  parent?: string;
  children?: string[];
}

interface ErrorEntry {
  message: string;
  stack?: string;
  timestamp: number;
  recoverable: boolean;
  context?: Record<string, unknown>;
}

interface RouteEntry {
  path: string;
  visitedAt: number;
  component?: string;
  success: boolean;
  errorMessage?: string;
  loadTime?: number;
}

interface StoreAccessEntry {
  storeName: string;
  accessedAt: number;
  success: boolean;
  errorMessage?: string;
}

interface ContextAccessEntry {
  contextName: string;
  accessedAt: number;
  success: boolean;
  errorMessage?: string;
}

interface HookCallEntry {
  hookName: string;
  componentName: string;
  callCount: number;
  lastCalled: number;
}

interface FunctionCallEntry {
  functionName: string;
  callCount: number;
  totalDuration: number;
  avgDuration: number;
  lastCalled: number;
  errors: number;
  caller?: string;
}

interface PerformanceMetrics {
  memory?: {
    used: number;
    total: number;
    limit: number;
  };
  renderTime: {
    average: number;
    max: number;
    min: number;
  };
  slowComponents: string[];
  memoryLeaks: string[];
}

class RuntimeRegistry {
  private components: Map<string, ComponentEntry> = new Map();
  private routes: RouteEntry[] = [];
  private storeAccesses: StoreAccessEntry[] = [];
  private contextAccesses: ContextAccessEntry[] = [];
  private globalErrors: ErrorEntry[] = [];
  private startTime: number = Date.now();
  private hookCalls: Map<string, Map<string, number>> = new Map();
  private functionCalls: Map<string, FunctionCallEntry> = new Map();
  private performanceMetrics: PerformanceMetrics = {
    renderTime: { average: 0, max: 0, min: Infinity },
    slowComponents: [],
    memoryLeaks: []
  };
  private autoSaveEnabled: boolean = false;

  registerComponentMount(name: string, props?: Record<string, unknown>): void {
    const existing = this.components.get(name);
    if (existing) {
      existing.renderCount++;
      existing.props = props;
    } else {
      this.components.set(name, {
        name,
        mountedAt: Date.now(),
        renderCount: 1,
        errors: [],
        warnings: [],
        props,
      });
    }
  }

  registerComponentUnmount(name: string): void {
    const component = this.components.get(name);
    if (component && !component.unmountedAt) {
      component.unmountedAt = Date.now();
    }
  }

  registerComponentError(
    name: string,
    error: Error,
    recoverable: boolean = false,
    context?: Record<string, unknown>
  ): void {
    const component = this.components.get(name);
    const errorEntry: ErrorEntry = {
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      recoverable,
      context,
    };

    if (component) {
      component.errors.push(errorEntry);
    } else {
      this.globalErrors.push(errorEntry);
    }
  }

  registerComponentWarning(name: string, warning: string): void {
    const component = this.components.get(name);
    if (component) {
      component.warnings.push(warning);
    }
  }

  registerRenderDuration(name: string, duration: number): void {
    const component = this.components.get(name);
    if (component) {
      component.lastRenderDuration = duration;
    }
  }

  registerRouteVisit(
    path: string,
    component?: string,
    success: boolean = true,
    errorMessage?: string
  ): void {
    this.routes.push({
      path,
      visitedAt: Date.now(),
      component,
      success,
      errorMessage,
    });
  }

  registerStoreAccess(
    storeName: string,
    success: boolean = true,
    errorMessage?: string
  ): void {
    this.storeAccesses.push({
      storeName,
      accessedAt: Date.now(),
      success,
      errorMessage,
    });
  }

  registerContextAccess(
    contextName: string,
    success: boolean = true,
    errorMessage?: string
  ): void {
    this.contextAccesses.push({
      contextName,
      accessedAt: Date.now(),
      success,
      errorMessage,
    });
  }

  getComponentReport(name: string): ComponentEntry | undefined {
    return this.components.get(name);
  }

  getAllComponents(): ComponentEntry[] {
    return Array.from(this.components.values());
  }

  getFailedComponents(): ComponentEntry[] {
    return this.getAllComponents().filter((c) => c.errors.length > 0);
  }

  getActiveComponents(): ComponentEntry[] {
    return this.getAllComponents().filter((c) => !c.unmountedAt);
  }

  getRouteHistory(): RouteEntry[] {
    return [...this.routes];
  }

  getFailedRoutes(): RouteEntry[] {
    return this.routes.filter((r) => !r.success);
  }

  getStoreAccessHistory(): StoreAccessEntry[] {
    return [...this.storeAccesses];
  }

  getFailedStoreAccesses(): StoreAccessEntry[] {
    return this.storeAccesses.filter((s) => !s.success);
  }

  getContextAccessHistory(): ContextAccessEntry[] {
    return [...this.contextAccesses];
  }

  getFailedContextAccesses(): ContextAccessEntry[] {
    return this.contextAccesses.filter((c) => !c.success);
  }

  getGlobalErrors(): ErrorEntry[] {
    return [...this.globalErrors];
  }

  getUptime(): number {
    return Date.now() - this.startTime;
  }

  generateReport(): {
    uptime: number;
    totalComponents: number;
    activeComponents: number;
    failedComponents: number;
    totalRoutes: number;
    failedRoutes: number;
    totalStoreAccesses: number;
    failedStoreAccessesCount: number;
    totalContextAccesses: number;
    failedContextAccessesCount: number;
    globalErrors: number;
    componentDetails: ComponentEntry[];
    routeHistory: RouteEntry[];
    failedStoreAccesses: StoreAccessEntry[];
    failedContextAccesses: ContextAccessEntry[];
    globalErrorDetails: ErrorEntry[];
  } {
    return {
      uptime: this.getUptime(),
      totalComponents: this.components.size,
      activeComponents: this.getActiveComponents().length,
      failedComponents: this.getFailedComponents().length,
      totalRoutes: this.routes.length,
      failedRoutes: this.getFailedRoutes().length,
      totalStoreAccesses: this.storeAccesses.length,
      failedStoreAccessesCount: this.getFailedStoreAccesses().length,
      totalContextAccesses: this.contextAccesses.length,
      failedContextAccessesCount: this.getFailedContextAccesses().length,
      globalErrors: this.globalErrors.length,
      componentDetails: this.getAllComponents(),
      routeHistory: this.getRouteHistory(),
      failedStoreAccesses: this.getFailedStoreAccesses(),
      failedContextAccesses: this.getFailedContextAccesses(),
      globalErrorDetails: this.getGlobalErrors(),
    };
  }

  printStartupReport(): void {
    const report = this.generateReport();

    console.group('🚀 Runtime Registry - Startup Report');
    console.log(`⏱️  Uptime: ${(report.uptime / 1000).toFixed(2)}s`);
    console.log(`📦 Total Components: ${report.totalComponents}`);
    console.log(`✅ Active Components: ${report.activeComponents}`);
    console.log(`❌ Failed Components: ${report.failedComponents}`);
    console.log(`🛣️  Total Routes Visited: ${report.totalRoutes}`);
    console.log(`⚠️  Failed Routes: ${report.failedRoutes}`);
    console.log(`🗄️  Store Accesses: ${report.totalStoreAccesses}`);
    console.log(`🚫 Failed Store Accesses: ${report.failedStoreAccessesCount}`);
    console.log(`🔌 Context Accesses: ${report.totalContextAccesses}`);
    console.log(`🚫 Failed Context Accesses: ${report.failedContextAccessesCount}`);
    console.log(`💥 Global Errors: ${report.globalErrors}`);

    if (report.failedComponents > 0) {
      console.group('❌ Failed Components:');
      report.componentDetails
        .filter((c) => c.errors.length > 0)
        .forEach((c) => {
          console.log(`  - ${c.name} (${c.errors.length} errors)`);
          c.errors.forEach((e) => console.log(`    └─ ${e.message}`));
        });
      console.groupEnd();
    }

    if (report.failedRoutes > 0) {
      console.group('⚠️  Failed Routes:');
      this.getFailedRoutes().forEach((r) => {
        console.log(`  - ${r.path}: ${r.errorMessage}`);
      });
      console.groupEnd();
    }

    if (report.failedStoreAccesses.length > 0) {
      console.group('🚫 Failed Store Accesses:');
      report.failedStoreAccesses.forEach((s) => {
        console.log(`  - ${s.storeName}: ${s.errorMessage}`);
      });
      console.groupEnd();
    }

    if (report.failedContextAccesses.length > 0) {
      console.group('🚫 Failed Context Accesses:');
      report.failedContextAccesses.forEach((c) => {
        console.log(`  - ${c.contextName}: ${c.errorMessage}`);
      });
      console.groupEnd();
    }

    console.groupEnd();
  }

  reset(): void {
    this.components.clear();
    this.routes = [];
    this.storeAccesses = [];
    this.contextAccesses = [];
    this.globalErrors = [];
    this.hookCalls.clear();
    this.functionCalls.clear();
    this.performanceMetrics = {
      renderTime: { average: 0, max: 0, min: Infinity },
      slowComponents: [],
      memoryLeaks: []
    };
    this.startTime = Date.now();
    sessionStorageAdapter.clearSession();
  }

  registerHookCall(componentName: string, hookName: string): void {
    if (!this.hookCalls.has(componentName)) {
      this.hookCalls.set(componentName, new Map());
    }

    const componentHooks = this.hookCalls.get(componentName)!;
    const currentCount = componentHooks.get(hookName) || 0;
    componentHooks.set(hookName, currentCount + 1);

    const component = this.components.get(componentName);
    if (component) {
      if (!component.hookCalls) {
        component.hookCalls = new Map();
      }
      component.hookCalls.set(hookName, currentCount + 1);
    }
  }

  registerFunctionCall(
    functionName: string,
    duration: number,
    error: boolean = false,
    caller?: string
  ): void {
    const existing = this.functionCalls.get(functionName);

    if (existing) {
      existing.callCount++;
      existing.totalDuration += duration;
      existing.avgDuration = existing.totalDuration / existing.callCount;
      existing.lastCalled = Date.now();
      if (error) existing.errors++;
      if (caller) existing.caller = caller;
    } else {
      this.functionCalls.set(functionName, {
        functionName,
        callCount: 1,
        totalDuration: duration,
        avgDuration: duration,
        lastCalled: Date.now(),
        errors: error ? 1 : 0,
        caller
      });
    }
  }

  getAllHookCalls(): Map<string, Map<string, number>> {
    return this.hookCalls;
  }

  getAllFunctionCalls(): FunctionCallEntry[] {
    return Array.from(this.functionCalls.values());
  }

  getSlowFunctions(threshold: number = 50): FunctionCallEntry[] {
    return this.getAllFunctionCalls().filter(f => f.avgDuration > threshold);
  }

  getSlowComponents(threshold: number = 16): ComponentEntry[] {
    return this.getAllComponents().filter(
      c => c.lastRenderDuration && c.lastRenderDuration > threshold
    );
  }

  detectMemoryLeaks(): string[] {
    const leaks: string[] = [];
    const mountUnmountMap = new Map<string, { mounts: number; unmounts: number }>();

    this.getAllComponents().forEach(c => {
      const existing = mountUnmountMap.get(c.name) || { mounts: 0, unmounts: 0 };
      existing.mounts++;
      if (c.unmountedAt) existing.unmounts++;
      mountUnmountMap.set(c.name, existing);
    });

    mountUnmountMap.forEach((counts, name) => {
      if (counts.mounts > counts.unmounts + 5) {
        leaks.push(`${name} (${counts.mounts} mounts, ${counts.unmounts} unmounts)`);
      }
    });

    this.performanceMetrics.memoryLeaks = leaks;
    return leaks;
  }

  updatePerformanceMetrics(): void {
    const components = this.getAllComponents();
    const renderTimes = components
      .map(c => c.lastRenderDuration)
      .filter((d): d is number => d !== undefined);

    if (renderTimes.length > 0) {
      this.performanceMetrics.renderTime = {
        average: renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length,
        max: Math.max(...renderTimes),
        min: Math.min(...renderTimes)
      };
    }

    this.performanceMetrics.slowComponents = this.getSlowComponents()
      .map(c => c.name);

    if (typeof (performance as any).memory !== 'undefined') {
      const mem = (performance as any).memory;
      this.performanceMetrics.memory = {
        used: mem.usedJSHeapSize,
        total: mem.totalJSHeapSize,
        limit: mem.jsHeapSizeLimit
      };
    }

    this.detectMemoryLeaks();
  }

  getPerformanceMetrics(): PerformanceMetrics {
    this.updatePerformanceMetrics();
    return this.performanceMetrics;
  }

  pruneOldData(maxAge: number = 5 * 60 * 1000): void {
    const now = Date.now();

    this.routes = this.routes.filter(r => now - r.visitedAt < maxAge);
    this.storeAccesses = this.storeAccesses.filter(s => now - s.accessedAt < maxAge);
    this.contextAccesses = this.contextAccesses.filter(c => now - c.accessedAt < maxAge);
    this.globalErrors = this.globalErrors.filter(e => now - e.timestamp < maxAge);
  }

  enableAutoSave(): void {
    if (this.autoSaveEnabled) return;
    this.autoSaveEnabled = true;

    sessionStorageAdapter.scheduleAutoSave(() => {
      this.saveToSession();
    });
  }

  disableAutoSave(): void {
    this.autoSaveEnabled = false;
    sessionStorageAdapter.cancelAutoSave();
  }

  saveToSession(): void {
    this.pruneOldData();

    sessionStorageAdapter.saveToSession({
      timestamp: Date.now(),
      components: this.components,
      routes: new Map(this.routes.map((r, i) => [i.toString(), r])),
      hookCalls: this.hookCalls,
      functionCalls: this.functionCalls,
      errors: this.globalErrors,
      performanceMetrics: this.performanceMetrics,
      sessionMetadata: {
        startTime: this.startTime,
        userRole: undefined,
        deviceInfo: navigator.userAgent,
        appVersion: import.meta.env.VITE_APP_VERSION || 'dev'
      }
    });
  }

  loadFromSession(): boolean {
    const stored = sessionStorageAdapter.loadFromSession();
    if (!stored) return false;

    this.components = stored.components;
    this.routes = Array.from(stored.routes.values()) as RouteEntry[];
    this.hookCalls = stored.hookCalls;
    this.functionCalls = stored.functionCalls;
    this.globalErrors = stored.errors;
    this.performanceMetrics = stored.performanceMetrics;
    this.startTime = stored.sessionMetadata.startTime;

    return true;
  }

  exportDiagnostics(): string {
    this.updatePerformanceMetrics();

    const report = {
      exportedAt: new Date().toISOString(),
      sessionDuration: this.getUptime(),
      summary: {
        totalComponents: this.components.size,
        activeComponents: this.getActiveComponents().length,
        failedComponents: this.getFailedComponents().length,
        totalRoutes: this.routes.length,
        failedRoutes: this.getFailedRoutes().length,
        totalHookCalls: Array.from(this.hookCalls.values()).reduce(
          (sum, hooks) => sum + Array.from(hooks.values()).reduce((a, b) => a + b, 0),
          0
        ),
        totalFunctionCalls: Array.from(this.functionCalls.values()).reduce(
          (sum, f) => sum + f.callCount,
          0
        ),
        globalErrors: this.globalErrors.length,
        memoryLeaks: this.performanceMetrics.memoryLeaks.length,
        slowComponents: this.performanceMetrics.slowComponents.length
      },
      components: Array.from(this.components.entries()).map(([name, entry]) => ({
        name,
        ...entry,
        hookCalls: entry.hookCalls ? Array.from(entry.hookCalls.entries()) : []
      })),
      routes: this.routes,
      hookCalls: Array.from(this.hookCalls.entries()).map(([component, hooks]) => ({
        component,
        hooks: Array.from(hooks.entries()).map(([hook, count]) => ({ hook, count }))
      })),
      functionCalls: Array.from(this.functionCalls.values()),
      errors: this.globalErrors,
      performance: this.performanceMetrics,
      storeAccesses: this.storeAccesses,
      contextAccesses: this.contextAccesses
    };

    return JSON.stringify(report, null, 2);
  }

  getHealthScore(): { score: number; status: 'green' | 'yellow' | 'red'; issues: string[] } {
    const issues: string[] = [];
    let warningCount = 0;
    let errorCount = 0;

    if (this.getFailedComponents().length > 0) {
      errorCount++;
      issues.push(`${this.getFailedComponents().length} components with errors`);
    }

    const slowComponents = this.getSlowComponents();
    if (slowComponents.length > 0) {
      warningCount++;
      issues.push(`${slowComponents.length} slow components (>16ms)`);
    }

    const memoryLeaks = this.detectMemoryLeaks();
    if (memoryLeaks.length > 0) {
      warningCount++;
      issues.push(`${memoryLeaks.length} potential memory leaks`);
    }

    if (this.getFailedRoutes().length > 0) {
      errorCount++;
      issues.push(`${this.getFailedRoutes().length} failed routes`);
    }

    const slowFunctions = this.getSlowFunctions();
    if (slowFunctions.length > 0) {
      warningCount++;
      issues.push(`${slowFunctions.length} slow functions (>50ms)`);
    }

    if (this.globalErrors.length > 0) {
      errorCount++;
      issues.push(`${this.globalErrors.length} global errors`);
    }

    let status: 'green' | 'yellow' | 'red' = 'green';
    if (errorCount > 0) {
      status = 'red';
    } else if (warningCount > 5) {
      status = 'yellow';
    }

    const score = Math.max(0, 100 - (errorCount * 20) - (warningCount * 5));

    return { score, status, issues };
  }
}

export const runtimeRegistry = new RuntimeRegistry();

export type {
  ComponentEntry,
  ErrorEntry,
  RouteEntry,
  StoreAccessEntry,
  ContextAccessEntry,
  HookCallEntry,
  FunctionCallEntry,
  PerformanceMetrics
};
