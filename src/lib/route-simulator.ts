import { runtimeRegistry } from './runtime-registry';

interface RouteDefinition {
  path: string;
  name: string;
  requiredRole?: string;
  params?: Record<string, string>;
}

interface SimulationResult {
  path: string;
  name: string;
  success: boolean;
  error?: string;
  duration: number;
}

interface SimulationReport {
  totalRoutes: number;
  successfulRoutes: number;
  failedRoutes: number;
  averageDuration: number;
  results: SimulationResult[];
  failedResults: SimulationResult[];
}

export class RouteSimulator {
  private routes: RouteDefinition[] = [];
  private simulationDelay: number = 100;
  private maxSimulationTime: number = 5000;

  registerRoute(route: RouteDefinition): void {
    this.routes.push(route);
  }

  registerRoutes(routes: RouteDefinition[]): void {
    this.routes.push(...routes);
  }

  setSimulationDelay(delay: number): void {
    this.simulationDelay = delay;
  }

  setMaxSimulationTime(time: number): void {
    this.maxSimulationTime = time;
  }

  async simulateRoute(
    route: RouteDefinition,
    navigate: (path: string) => void
  ): Promise<SimulationResult> {
    const startTime = performance.now();

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        const duration = performance.now() - startTime;
        resolve({
          path: route.path,
          name: route.name,
          success: false,
          error: 'Simulation timeout',
          duration,
        });
      }, this.maxSimulationTime);

      try {
        navigate(route.path);

        setTimeout(() => {
          clearTimeout(timeoutId);
          const duration = performance.now() - startTime;

          runtimeRegistry.registerRouteVisit(route.path, route.name, true);

          resolve({
            path: route.path,
            name: route.name,
            success: true,
            duration,
          });
        }, this.simulationDelay);
      } catch (error) {
        clearTimeout(timeoutId);
        const duration = performance.now() - startTime;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        runtimeRegistry.registerRouteVisit(
          route.path,
          route.name,
          false,
          errorMessage
        );

        resolve({
          path: route.path,
          name: route.name,
          success: false,
          error: errorMessage,
          duration,
        });
      }
    });
  }

  async simulateAllRoutes(
    navigate: (path: string) => void
  ): Promise<SimulationReport> {
    console.group('🧪 Route Simulation Starting');
    console.log(`Testing ${this.routes.length} routes...`);

    const results: SimulationResult[] = [];

    for (const route of this.routes) {
      console.log(`Testing: ${route.name} (${route.path})`);
      const result = await this.simulateRoute(route, navigate);
      results.push(result);

      if (result.success) {
        console.log(`  ✅ Success (${result.duration.toFixed(2)}ms)`);
      } else {
        console.error(`  ❌ Failed: ${result.error}`);
      }
    }

    const successfulRoutes = results.filter((r) => r.success);
    const failedResults = results.filter((r) => !r.success);
    const averageDuration =
      results.reduce((sum, r) => sum + r.duration, 0) / results.length;

    const report: SimulationReport = {
      totalRoutes: this.routes.length,
      successfulRoutes: successfulRoutes.length,
      failedRoutes: failedResults.length,
      averageDuration,
      results,
      failedResults,
    };

    console.log('\n📊 Simulation Results:');
    console.log(`  Total Routes: ${report.totalRoutes}`);
    console.log(`  Successful: ${report.successfulRoutes}`);
    console.log(`  Failed: ${report.failedRoutes}`);
    console.log(`  Average Duration: ${report.averageDuration.toFixed(2)}ms`);

    if (report.failedRoutes > 0) {
      console.group('❌ Failed Routes:');
      report.failedResults.forEach((result) => {
        console.log(`  ${result.name} (${result.path}): ${result.error}`);
      });
      console.groupEnd();
    }

    console.groupEnd();

    return report;
  }

  getRoutes(): RouteDefinition[] {
    return [...this.routes];
  }

  clearRoutes(): void {
    this.routes = [];
  }

  async testRoute(
    path: string,
    navigate: (path: string) => void
  ): Promise<boolean> {
    const route = this.routes.find((r) => r.path === path);
    if (!route) {
      console.error(`Route not found: ${path}`);
      return false;
    }

    const result = await this.simulateRoute(route, navigate);
    return result.success;
  }

  exportReport(report: SimulationReport): string {
    return JSON.stringify(report, null, 2);
  }

  getRoutesForRole(role: string): RouteDefinition[] {
    return this.routes.filter(
      (r) => !r.requiredRole || r.requiredRole === role
    );
  }

  async simulateRoutesForRole(
    role: string,
    navigate: (path: string) => void
  ): Promise<SimulationReport> {
    const roleRoutes = this.getRoutesForRole(role);
    const originalRoutes = this.routes;
    this.routes = roleRoutes;

    const report = await this.simulateAllRoutes(navigate);

    this.routes = originalRoutes;

    return report;
  }
}

export const routeSimulator = new RouteSimulator();

export function extractRoutesFromConfig(config: {
  [role: string]: Array<{ path: string; label?: string }>;
}): RouteDefinition[] {
  const routes: RouteDefinition[] = [];

  for (const [role, roleRoutes] of Object.entries(config)) {
    for (const route of roleRoutes) {
      routes.push({
        path: route.path,
        name: route.label || route.path,
        requiredRole: role,
      });
    }
  }

  return routes;
}

export type { RouteDefinition, SimulationResult, SimulationReport };
