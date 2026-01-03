interface ComponentEntry {
  name: string;
  mountedAt: number;
  unmountedAt?: number;
  renderCount: number;
  errors: ErrorEntry[];
  warnings: string[];
  props?: Record<string, unknown>;
  lastRenderDuration?: number;
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

class RuntimeRegistry {
  private components: Map<string, ComponentEntry> = new Map();
  private routes: RouteEntry[] = [];
  private storeAccesses: StoreAccessEntry[] = [];
  private contextAccesses: ContextAccessEntry[] = [];
  private globalErrors: ErrorEntry[] = [];
  private startTime: number = Date.now();

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
    this.startTime = Date.now();
  }
}

export const runtimeRegistry = new RuntimeRegistry();

export type { ComponentEntry, ErrorEntry, RouteEntry, StoreAccessEntry, ContextAccessEntry };
