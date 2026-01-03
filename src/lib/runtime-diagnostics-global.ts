import { runtimeRegistry } from './runtime-registry';
import { Diagnostics } from '../foundation/diagnostics/DiagnosticsStore';

declare global {
  interface Window {
    __RUNTIME__: {
      registry: typeof runtimeRegistry;
      printReport: () => void;
      dumpRawData: () => any;
      listRegisteredComponents: () => void;
      listRouteResults: () => void;
      getDiagnostics: () => any[];
      clearDiagnostics: () => void;
    };
  }
}

function printReport(): void {
  runtimeRegistry.printStartupReport();
}

function dumpRawData(): any {
  const report = runtimeRegistry.generateReport();
  console.log('📦 Raw Runtime Data:', report);
  return report;
}

function listRegisteredComponents(): void {
  const components = runtimeRegistry.getAllComponents();

  console.group('📦 Registered Components');
  console.log(`Total: ${components.length}`);
  console.log(`Active: ${runtimeRegistry.getActiveComponents().length}`);
  console.log(`Failed: ${runtimeRegistry.getFailedComponents().length}`);
  console.groupEnd();

  console.table(
    components.map(c => ({
      name: c.name,
      renderCount: c.renderCount,
      errors: c.errors.length,
      warnings: c.warnings.length,
      active: !c.unmountedAt ? '✅' : '❌',
    }))
  );
}

function listRouteResults(): void {
  const routes = runtimeRegistry.getRouteHistory();
  const failed = runtimeRegistry.getFailedRoutes();

  console.group('🛣️  Route History');
  console.log(`Total routes: ${routes.length}`);
  console.log(`Failed routes: ${failed.length}`);
  console.groupEnd();

  if (routes.length > 0) {
    console.table(
      routes.map(r => ({
        path: r.path,
        component: r.component || 'N/A',
        success: r.success ? '✅' : '❌',
        error: r.errorMessage || '',
        time: new Date(r.visitedAt).toLocaleTimeString(),
      }))
    );
  } else {
    console.log('No routes registered yet');
  }
}

function getDiagnostics(): any[] {
  return Diagnostics.getAll();
}

function clearDiagnostics(): void {
  Diagnostics.clear();
  console.log('✅ Diagnostics cleared');
}

export function initializeRuntimeDiagnostics(): void {
  if (typeof window === 'undefined') return;

  window.__RUNTIME__ = {
    registry: runtimeRegistry,
    printReport,
    dumpRawData,
    listRegisteredComponents,
    listRouteResults,
    getDiagnostics,
    clearDiagnostics,
  };

  if (import.meta.env.DEV) {
    console.log('[RuntimeDiagnostics] initialized');
    console.log('Available commands:');
    console.log('  __RUNTIME__.printReport()');
    console.log('  __RUNTIME__.dumpRawData()');
    console.log('  __RUNTIME__.listRegisteredComponents()');
    console.log('  __RUNTIME__.listRouteResults()');
    console.log('  __RUNTIME__.getDiagnostics()');
    console.log('  __RUNTIME__.clearDiagnostics()');
  }
}
