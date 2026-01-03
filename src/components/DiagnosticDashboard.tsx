import { useState, useEffect } from 'react';
import { runtimeRegistry } from '../lib/runtime-registry';
import type { ComponentEntry, RouteEntry, StoreAccessEntry, ContextAccessEntry } from '../lib/runtime-registry';

interface DiagnosticDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DiagnosticDashboard({ isOpen, onClose }: DiagnosticDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'components' | 'routes' | 'stores' | 'contexts'>('overview');
  const [report, setReport] = useState(() => runtimeRegistry.generateReport());
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setReport(runtimeRegistry.generateReport());
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const refreshReport = () => {
    setReport(runtimeRegistry.generateReport());
  };

  if (!isOpen) return null;

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
          <h2 style={{ margin: 0, fontSize: '20px' }}>Runtime Diagnostics</h2>
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

        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #333',
            padding: '0 20px',
            gap: '4px',
          }}
        >
          {(['overview', 'components', 'routes', 'stores', 'contexts'] as const).map((tab) => (
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
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {activeTab === 'overview' && <OverviewTab report={report} />}
          {activeTab === 'components' && <ComponentsTab components={report.componentDetails} />}
          {activeTab === 'routes' && <RoutesTab routes={report.routeHistory} />}
          {activeTab === 'stores' && <StoresTab accesses={report.failedStoreAccesses} />}
          {activeTab === 'contexts' && <ContextsTab accesses={report.failedContextAccesses} />}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ report }: { report: ReturnType<typeof runtimeRegistry.generateReport> }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
      <MetricCard title="Uptime" value={`${(report.uptime / 1000).toFixed(2)}s`} color="#00cc66" />
      <MetricCard title="Total Components" value={report.totalComponents} color="#0066cc" />
      <MetricCard title="Active Components" value={report.activeComponents} color="#00cc66" />
      <MetricCard title="Failed Components" value={report.failedComponents} color={report.failedComponents > 0 ? '#cc0000' : '#00cc66'} />
      <MetricCard title="Routes Visited" value={report.totalRoutes} color="#9966cc" />
      <MetricCard title="Failed Routes" value={report.failedRoutes} color={report.failedRoutes > 0 ? '#cc0000' : '#00cc66'} />
      <MetricCard title="Store Accesses" value={report.totalStoreAccesses} color="#cc9900" />
      <MetricCard title="Failed Store Accesses" value={report.failedStoreAccessesCount} color={report.failedStoreAccessesCount > 0 ? '#cc0000' : '#00cc66'} />
      <MetricCard title="Context Accesses" value={report.totalContextAccesses} color="#cc6600" />
      <MetricCard title="Failed Context Accesses" value={report.failedContextAccessesCount} color={report.failedContextAccessesCount > 0 ? '#cc0000' : '#00cc66'} />
    </div>
  );
}

function ComponentsTab({ components }: { components: ComponentEntry[] }) {
  const [filter, setFilter] = useState<'all' | 'active' | 'failed'>('all');

  const filteredComponents = components.filter((c) => {
    if (filter === 'active') return !c.unmountedAt;
    if (filter === 'failed') return c.errors.length > 0;
    return true;
  });

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
        {(['all', 'active', 'failed'] as const).map((f) => (
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
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredComponents.map((component) => (
          <div
            key={component.name}
            style={{
              padding: '12px',
              backgroundColor: '#222',
              borderRadius: '6px',
              borderLeft: `4px solid ${component.errors.length > 0 ? '#cc0000' : '#00cc66'}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <strong>{component.name}</strong>
              <span style={{ fontSize: '12px', color: '#999' }}>
                Renders: {component.renderCount}
                {component.lastRenderDuration && ` | ${component.lastRenderDuration.toFixed(2)}ms`}
              </span>
            </div>

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
          {route.errorMessage && (
            <div style={{ color: '#ff6666', marginTop: '4px' }}>Error: {route.errorMessage}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function StoresTab({ accesses }: { accesses: StoreAccessEntry[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {accesses.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
          No failed store accesses
        </div>
      ) : (
        accesses.map((access, idx) => (
          <div
            key={idx}
            style={{
              padding: '10px',
              backgroundColor: '#222',
              borderRadius: '6px',
              borderLeft: '4px solid #cc0000',
              fontSize: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{access.storeName}</strong>
              <span style={{ color: '#999' }}>
                {new Date(access.accessedAt).toLocaleTimeString()}
              </span>
            </div>
            {access.errorMessage && (
              <div style={{ color: '#ff6666', marginTop: '4px' }}>{access.errorMessage}</div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function ContextsTab({ accesses }: { accesses: ContextAccessEntry[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {accesses.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
          No failed context accesses
        </div>
      ) : (
        accesses.map((access, idx) => (
          <div
            key={idx}
            style={{
              padding: '10px',
              backgroundColor: '#222',
              borderRadius: '6px',
              borderLeft: '4px solid #cc0000',
              fontSize: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{access.contextName}</strong>
              <span style={{ color: '#999' }}>
                {new Date(access.accessedAt).toLocaleTimeString()}
              </span>
            </div>
            {access.errorMessage && (
              <div style={{ color: '#ff6666', marginTop: '4px' }}>{access.errorMessage}</div>
            )}
          </div>
        ))
      )}
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
