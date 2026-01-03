import { useState, useEffect } from 'react';
import { runtimeRegistry } from '../lib/runtime-registry';
import { sessionStorageAdapter } from '../lib/session-storage-adapter';
import type {
  ComponentEntry,
  RouteEntry,
  StoreAccessEntry,
  ContextAccessEntry,
  FunctionCallEntry,
  PerformanceMetrics
} from '../lib/runtime-registry';

interface DiagnosticDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DiagnosticDashboard({ isOpen, onClose }: DiagnosticDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'components' | 'hooks' | 'functions' | 'performance' | 'routes'>('overview');
  const [report, setReport] = useState(() => runtimeRegistry.generateReport());
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [healthScore, setHealthScore] = useState(() => runtimeRegistry.getHealthScore());

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setReport(runtimeRegistry.generateReport());
      setHealthScore(runtimeRegistry.getHealthScore());
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const refreshReport = () => {
    setReport(runtimeRegistry.generateReport());
    setHealthScore(runtimeRegistry.getHealthScore());
  };

  const exportDiagnostics = () => {
    const data = runtimeRegistry.exportDiagnostics();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostics-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearData = () => {
    if (confirm('Clear all diagnostic data? This will reset tracking for the current session.')) {
      runtimeRegistry.reset();
      refreshReport();
    }
  };

  if (!isOpen) return null;

  const statusColor = healthScore.status === 'green' ? '#00cc66' : healthScore.status === 'yellow' ? '#ffcc00' : '#cc0000';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#1a1a1a',
          color: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '1200px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'monospace',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid #333',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '20px' }}>Runtime Diagnostics</h2>
            <div
              style={{
                padding: '4px 12px',
                backgroundColor: statusColor,
                color: '#000',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              Health: {healthScore.score}%
            </div>
            <div style={{ fontSize: '11px', color: '#999' }}>
              {sessionStorageAdapter.getDataSizeFormatted()} cached
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <label style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh
            </label>
            <button
              onClick={exportDiagnostics}
              style={{
                padding: '8px 16px',
                backgroundColor: '#009900',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Export JSON
            </button>
            <button
              onClick={clearData}
              style={{
                padding: '8px 16px',
                backgroundColor: '#cc6600',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Clear
            </button>
            <button
              onClick={refreshReport}
              style={{
                padding: '8px 16px',
                backgroundColor: '#0066cc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Refresh
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                backgroundColor: '#cc0000',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Close
            </button>
          </div>
        </div>

        {healthScore.issues.length > 0 && (
          <div
            style={{
              padding: '12px 20px',
              backgroundColor: healthScore.status === 'red' ? 'rgba(204, 0, 0, 0.2)' : 'rgba(255, 204, 0, 0.2)',
              borderBottom: '1px solid #333',
              fontSize: '12px',
            }}
          >
            <strong>Issues Detected:</strong>
            <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
              {healthScore.issues.map((issue, idx) => (
                <li key={idx}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #333',
            padding: '0 20px',
            gap: '4px',
            overflowX: 'auto',
          }}
        >
          {(['overview', 'components', 'hooks', 'functions', 'performance', 'routes'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 20px',
                backgroundColor: activeTab === tab ? '#333' : 'transparent',
                color: activeTab === tab ? '#ffffff' : '#999',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #0066cc' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '14px',
                textTransform: 'capitalize',
                whiteSpace: 'nowrap',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {activeTab === 'overview' && <OverviewTab report={report} />}
          {activeTab === 'components' && <ComponentsTab components={report.componentDetails} />}
          {activeTab === 'hooks' && <HooksTab />}
          {activeTab === 'functions' && <FunctionsTab />}
          {activeTab === 'performance' && <PerformanceTab />}
          {activeTab === 'routes' && <RoutesTab routes={report.routeHistory} />}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ report }: { report: ReturnType<typeof runtimeRegistry.generateReport> }) {
  const hookCalls = runtimeRegistry.getAllHookCalls();
  const totalHooks = Array.from(hookCalls.values()).reduce(
    (sum, hooks) => sum + Array.from(hooks.values()).reduce((a, b) => a + b, 0),
    0
  );
  const functionCalls = runtimeRegistry.getAllFunctionCalls();
  const totalFunctionCalls = functionCalls.reduce((sum, f) => sum + f.callCount, 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
      <MetricCard title="Session Duration" value={`${(report.uptime / 1000).toFixed(2)}s`} color="#00cc66" />
      <MetricCard title="Total Components" value={report.totalComponents} color="#0066cc" />
      <MetricCard title="Active Components" value={report.activeComponents} color="#00cc66" />
      <MetricCard title="Failed Components" value={report.failedComponents} color={report.failedComponents > 0 ? '#cc0000' : '#00cc66'} />
      <MetricCard title="Total Hook Calls" value={totalHooks} color="#9966cc" />
      <MetricCard title="Function Calls" value={totalFunctionCalls} color="#cc9900" />
      <MetricCard title="Routes Visited" value={report.totalRoutes} color="#6699cc" />
      <MetricCard title="Failed Routes" value={report.failedRoutes} color={report.failedRoutes > 0 ? '#cc0000' : '#00cc66'} />
    </div>
  );
}

function ComponentsTab({ components }: { components: ComponentEntry[] }) {
  const [filter, setFilter] = useState<'all' | 'active' | 'failed' | 'slow'>('all');
  const [search, setSearch] = useState('');

  const filteredComponents = components.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'active') return !c.unmountedAt;
    if (filter === 'failed') return c.errors.length > 0;
    if (filter === 'slow') return c.lastRenderDuration && c.lastRenderDuration > 16;
    return true;
  });

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search components..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '6px 12px',
            backgroundColor: '#333',
            color: 'white',
            border: '1px solid #555',
            borderRadius: '4px',
            fontSize: '12px',
            minWidth: '200px',
          }}
        />
        {(['all', 'active', 'failed', 'slow'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 12px',
              backgroundColor: filter === f ? '#0066cc' : '#333',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              textTransform: 'capitalize',
            }}
          >
            {f}
          </button>
        ))}
        <span style={{ fontSize: '12px', color: '#999', marginLeft: 'auto' }}>
          {filteredComponents.length} components
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredComponents.map((component) => (
          <div
            key={component.name}
            style={{
              padding: '12px',
              backgroundColor: '#222',
              borderRadius: '6px',
              borderLeft: `4px solid ${component.errors.length > 0 ? '#cc0000' : component.lastRenderDuration && component.lastRenderDuration > 16 ? '#ffcc00' : '#00cc66'}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <strong>{component.name}</strong>
              <span style={{ fontSize: '12px', color: '#999' }}>
                Renders: {component.renderCount}
                {component.lastRenderDuration && ` | ${component.lastRenderDuration.toFixed(2)}ms`}
              </span>
            </div>

            {component.hookCalls && component.hookCalls.size > 0 && (
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                Hooks: {Array.from(component.hookCalls.entries()).map(([hook, count]) => `${hook}(${count})`).join(', ')}
              </div>
            )}

            {component.errors.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '12px', color: '#ff6666', marginBottom: '4px' }}>
                  Errors ({component.errors.length}):
                </div>
                {component.errors.map((error, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontSize: '11px',
                      color: '#ffaaaa',
                      marginLeft: '12px',
                      marginBottom: '4px',
                    }}
                  >
                    {error.message}
                  </div>
                ))}
              </div>
            )}

            {component.warnings.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '12px', color: '#ffcc66', marginBottom: '4px' }}>
                  Warnings ({component.warnings.length}):
                </div>
                {component.warnings.map((warning, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontSize: '11px',
                      color: '#ffdd99',
                      marginLeft: '12px',
                      marginBottom: '4px',
                    }}
                  >
                    {warning}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function HooksTab() {
  const hookCalls = runtimeRegistry.getAllHookCalls();
  const [search, setSearch] = useState('');

  const filteredHooks = Array.from(hookCalls.entries()).filter(([component]) =>
    component.toLowerCase().includes(search.toLowerCase())
  );

  const totalCalls = filteredHooks.reduce(
    (sum, [, hooks]) => sum + Array.from(hooks.values()).reduce((a, b) => a + b, 0),
    0
  );

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search by component..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '6px 12px',
            backgroundColor: '#333',
            color: 'white',
            border: '1px solid #555',
            borderRadius: '4px',
            fontSize: '12px',
            flex: 1,
          }}
        />
        <span style={{ fontSize: '12px', color: '#999' }}>
          Total: {totalCalls} hook calls
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredHooks.map(([component, hooks]) => (
          <div
            key={component}
            style={{
              padding: '12px',
              backgroundColor: '#222',
              borderRadius: '6px',
              borderLeft: '4px solid #9966cc',
            }}
          >
            <strong style={{ display: 'block', marginBottom: '8px' }}>{component}</strong>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px' }}>
              {Array.from(hooks.entries()).map(([hook, count]) => (
                <div
                  key={hook}
                  style={{
                    padding: '6px 10px',
                    backgroundColor: '#333',
                    borderRadius: '4px',
                    fontSize: '11px',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{hook}</span>
                  <span style={{ color: '#999' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FunctionsTab() {
  const functions = runtimeRegistry.getAllFunctionCalls();
  const [sortBy, setSortBy] = useState<'name' | 'calls' | 'duration' | 'errors'>('calls');

  const sortedFunctions = [...functions].sort((a, b) => {
    if (sortBy === 'name') return a.functionName.localeCompare(b.functionName);
    if (sortBy === 'calls') return b.callCount - a.callCount;
    if (sortBy === 'duration') return b.avgDuration - a.avgDuration;
    if (sortBy === 'errors') return b.errors - a.errors;
    return 0;
  });

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
        <span style={{ fontSize: '12px', color: '#999', alignSelf: 'center' }}>Sort by:</span>
        {(['name', 'calls', 'duration', 'errors'] as const).map((sort) => (
          <button
            key={sort}
            onClick={() => setSortBy(sort)}
            style={{
              padding: '6px 12px',
              backgroundColor: sortBy === sort ? '#0066cc' : '#333',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              textTransform: 'capitalize',
            }}
          >
            {sort}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {sortedFunctions.map((fn) => (
          <div
            key={fn.functionName}
            style={{
              padding: '10px',
              backgroundColor: '#222',
              borderRadius: '6px',
              borderLeft: `4px solid ${fn.errors > 0 ? '#cc0000' : fn.avgDuration > 50 ? '#ffcc00' : '#cc9900'}`,
              fontSize: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <strong>{fn.functionName}</strong>
              <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#999' }}>
                <span>Calls: {fn.callCount}</span>
                <span>Avg: {fn.avgDuration.toFixed(2)}ms</span>
                {fn.errors > 0 && <span style={{ color: '#ff6666' }}>Errors: {fn.errors}</span>}
              </div>
            </div>
            {fn.caller && (
              <div style={{ fontSize: '11px', color: '#999' }}>Caller: {fn.caller}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PerformanceTab() {
  const metrics = runtimeRegistry.getPerformanceMetrics();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <MetricCard
          title="Avg Render Time"
          value={`${metrics.renderTime.average.toFixed(2)}ms`}
          color={metrics.renderTime.average > 16 ? '#ffcc00' : '#00cc66'}
        />
        <MetricCard
          title="Max Render Time"
          value={`${metrics.renderTime.max.toFixed(2)}ms`}
          color={metrics.renderTime.max > 16 ? '#cc0000' : '#00cc66'}
        />
        <MetricCard
          title="Min Render Time"
          value={`${metrics.renderTime.min === Infinity ? 0 : metrics.renderTime.min.toFixed(2)}ms`}
          color="#0066cc"
        />
        {metrics.memory && (
          <MetricCard
            title="Memory Usage"
            value={`${(metrics.memory.used / 1024 / 1024).toFixed(1)}MB`}
            color="#9966cc"
          />
        )}
      </div>

      {metrics.slowComponents.length > 0 && (
        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#ffcc00' }}>
            Slow Components (16ms)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {metrics.slowComponents.map((name) => (
              <div
                key={name}
                style={{
                  padding: '10px',
                  backgroundColor: '#222',
                  borderRadius: '6px',
                  borderLeft: '4px solid #ffcc00',
                  fontSize: '12px',
                }}
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      )}

      {metrics.memoryLeaks.length > 0 && (
        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#cc0000' }}>
            Potential Memory Leaks
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {metrics.memoryLeaks.map((leak) => (
              <div
                key={leak}
                style={{
                  padding: '10px',
                  backgroundColor: '#222',
                  borderRadius: '6px',
                  borderLeft: '4px solid #cc0000',
                  fontSize: '12px',
                }}
              >
                {leak}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RoutesTab({ routes }: { routes: RouteEntry[] }) {
  const reversedRoutes = [...routes].reverse();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {reversedRoutes.map((route, idx) => (
        <div
          key={idx}
          style={{
            padding: '10px',
            backgroundColor: '#222',
            borderRadius: '6px',
            borderLeft: `4px solid ${route.success ? '#00cc66' : '#cc0000'}`,
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong>{route.path}</strong>
            <span style={{ color: '#999' }}>
              {new Date(route.visitedAt).toLocaleTimeString()}
            </span>
          </div>
          {route.component && (
            <div style={{ color: '#999', marginTop: '4px' }}>Component: {route.component}</div>
          )}
          {route.loadTime && (
            <div style={{ color: '#999', marginTop: '4px' }}>Load time: {route.loadTime.toFixed(2)}ms</div>
          )}
          {route.errorMessage && (
            <div style={{ color: '#ff6666', marginTop: '4px' }}>Error: {route.errorMessage}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function MetricCard({ title, value, color }: { title: string; value: string | number; color: string }) {
  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: '#222',
        borderRadius: '8px',
        borderLeft: `4px solid ${color}`,
      }}
    >
      <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>{title}</div>
      <div style={{ fontSize: '28px', fontWeight: 'bold', color }}>{value}</div>
    </div>
  );
}
