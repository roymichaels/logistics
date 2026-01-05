/**
 * Unified Developer Console
 *
 * Comprehensive debugging dashboard that consolidates all diagnostic capabilities:
 * - Component tree with performance metrics
 * - Query/mutation monitoring
 * - Error tracking and analysis
 * - Export/import diagnostics
 * - Real-time performance monitoring
 * - Hook call tracking
 * - Route history
 */

import React, { useState, useEffect, useMemo } from 'react';
import { runtimeRegistry } from '@/lib/runtime-registry';
import type { FunctionCallEntry, ComponentEntry, ErrorEntry } from '@/lib/runtime-registry';
import { logger } from '@/lib/logger';

type TabType = 'overview' | 'components' | 'queries' | 'errors' | 'export' | 'performance';

interface DevConsoleProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UnifiedDevConsole({ isOpen, onClose }: DevConsoleProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!autoRefresh || !isOpen) return;

    const interval = setInterval(() => {
      setRefreshKey((k) => k + 1);
    }, 2000);

    return () => clearInterval(interval);
  }, [autoRefresh, isOpen]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.console}>
        <ConsoleHeader
          onClose={onClose}
          autoRefresh={autoRefresh}
          onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
          onRefresh={() => setRefreshKey((k) => k + 1)}
        />

        <ConsoleTabs activeTab={activeTab} onTabChange={setActiveTab} />

        <div style={styles.content}>
          {activeTab === 'overview' && <OverviewTab key={refreshKey} />}
          {activeTab === 'components' && <ComponentsTab key={refreshKey} />}
          {activeTab === 'queries' && <QueriesTab key={refreshKey} />}
          {activeTab === 'errors' && <ErrorsTab key={refreshKey} />}
          {activeTab === 'export' && <ExportTab />}
          {activeTab === 'performance' && <PerformanceTab key={refreshKey} />}
        </div>
      </div>
    </div>
  );
}

function ConsoleHeader({
  onClose,
  autoRefresh,
  onToggleAutoRefresh,
  onRefresh,
}: {
  onClose: () => void;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  onRefresh: () => void;
}) {
  return (
    <div style={styles.header}>
      <h2 style={styles.title}>Developer Console</h2>
      <div style={styles.headerActions}>
        <button style={styles.iconButton} onClick={onRefresh} title="Refresh">
          🔄
        </button>
        <button
          style={{
            ...styles.iconButton,
            ...(autoRefresh ? styles.activeButton : {}),
          }}
          onClick={onToggleAutoRefresh}
          title="Auto-refresh"
        >
          ⚡
        </button>
        <button style={styles.iconButton} onClick={onClose} title="Close">
          ✕
        </button>
      </div>
    </div>
  );
}

function ConsoleTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}) {
  const tabs: Array<{ id: TabType; label: string; icon: string }> = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'components', label: 'Components', icon: '🧩' },
    { id: 'queries', label: 'Queries', icon: '🔍' },
    { id: 'errors', label: 'Errors', icon: '⚠️' },
    { id: 'performance', label: 'Performance', icon: '⚡' },
    { id: 'export', label: 'Export', icon: '💾' },
  ];

  return (
    <div style={styles.tabs}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          style={{
            ...styles.tab,
            ...(activeTab === tab.id ? styles.activeTab : {}),
          }}
          onClick={() => onTabChange(tab.id)}
        >
          <span style={styles.tabIcon}>{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function OverviewTab() {
  const components = runtimeRegistry.getAllComponents();
  const functionCalls = runtimeRegistry.getAllFunctionCalls();
  const errors = runtimeRegistry.getAllErrors();

  const queries = functionCalls.filter((f) => f.category === 'query');
  const mutations = functionCalls.filter((f) => f.category === 'mutation');
  const hooks = functionCalls.filter((f) => f.category === 'hook');

  const mountedComponents = components.filter((c) => c.mounted).length;
  const totalComponents = components.length;
  const totalQueries = queries.reduce((sum, q) => sum + q.calls, 0);
  const totalMutations = mutations.reduce((sum, m) => sum + m.calls, 0);
  const errorRate =
    functionCalls.length > 0
      ? ((functionCalls.filter((f) => f.errors > 0).length / functionCalls.length) * 100).toFixed(1)
      : '0.0';

  const avgQueryTime =
    queries.length > 0
      ? (queries.reduce((sum, q) => sum + q.avgDuration, 0) / queries.length).toFixed(2)
      : '0';

  const avgMutationTime =
    mutations.length > 0
      ? (mutations.reduce((sum, m) => sum + m.avgDuration, 0) / mutations.length).toFixed(2)
      : '0';

  return (
    <div style={styles.tabContent}>
      <h3 style={styles.sectionTitle}>System Overview</h3>

      {totalComponents < 50 && (
        <div style={styles.infoBox}>
          <span style={styles.infoIcon}>💡</span>
          <div>
            <strong>Tracking {totalComponents} components</strong> that have mounted so far.
            Navigate to more pages to see more components tracked automatically.
            The app has 350+ trackable components total.
          </div>
        </div>
      )}

      <div style={styles.statsGrid}>
        <StatCard label="Components Tracked" value={totalComponents} icon="🧩" />
        <StatCard label="Components Mounted" value={mountedComponents} icon="✅" color="#10b981" />
        <StatCard label="Total Queries" value={totalQueries} icon="🔍" />
        <StatCard label="Total Mutations" value={totalMutations} icon="✏️" />
        <StatCard label="Hooks Called" value={hooks.length} icon="🪝" />
        <StatCard label="Errors" value={errors.length} icon="⚠️" color="#ef4444" />
        <StatCard label="Error Rate" value={`${errorRate}%`} icon="📊" />
        <StatCard label="Avg Query Time" value={`${avgQueryTime}ms`} icon="⏱️" />
        <StatCard label="Avg Mutation Time" value={`${avgMutationTime}ms`} icon="⚡" />
      </div>

      <h3 style={styles.sectionTitle}>Recent Activity</h3>
      <RecentActivityList />
    </div>
  );
}

function ComponentsTab() {
  const components = runtimeRegistry.getAllComponents();
  const [sortBy, setSortBy] = useState<'name' | 'renders' | 'avgRenderTime'>('avgRenderTime');

  const sortedComponents = useMemo(() => {
    return [...components].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'renders') return b.renderCount - a.renderCount;
      return b.avgRenderTime - a.avgRenderTime;
    });
  }, [components, sortBy]);

  return (
    <div style={styles.tabContent}>
      <div style={styles.tableHeader}>
        <h3 style={styles.sectionTitle}>Component Tree</h3>
        <div style={styles.sortControls}>
          <label style={styles.sortLabel}>Sort by:</label>
          <select
            style={styles.sortSelect}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="name">Name</option>
            <option value="renders">Renders</option>
            <option value="avgRenderTime">Avg Render Time</option>
          </select>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Component</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Renders</th>
              <th style={styles.th}>Avg Time</th>
              <th style={styles.th}>Total Time</th>
              <th style={styles.th}>Last Render</th>
            </tr>
          </thead>
          <tbody>
            {sortedComponents.map((component) => (
              <tr key={component.name} style={styles.tr}>
                <td style={styles.td}>{component.name}</td>
                <td style={styles.td}>
                  <span
                    style={{
                      ...styles.badge,
                      ...(component.mounted ? styles.successBadge : styles.mutedBadge),
                    }}
                  >
                    {component.mounted ? 'Mounted' : 'Unmounted'}
                  </span>
                </td>
                <td style={styles.td}>{component.renderCount}</td>
                <td style={styles.td}>{component.avgRenderTime.toFixed(2)}ms</td>
                <td style={styles.td}>{component.totalRenderTime.toFixed(2)}ms</td>
                <td style={styles.td}>{new Date(component.lastRender).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedComponents.length === 0 && (
        <div style={styles.emptyState}>No components tracked yet</div>
      )}
    </div>
  );
}

function QueriesTab() {
  const functionCalls = runtimeRegistry.getAllFunctionCalls();
  const queries = functionCalls.filter((f) => f.category === 'query' || f.category === 'mutation');
  const [filter, setFilter] = useState<'all' | 'query' | 'mutation'>('all');

  const filteredQueries = useMemo(() => {
    if (filter === 'all') return queries;
    return queries.filter((q) => q.category === filter);
  }, [queries, filter]);

  return (
    <div style={styles.tabContent}>
      <div style={styles.tableHeader}>
        <h3 style={styles.sectionTitle}>Query & Mutation Monitor</h3>
        <div style={styles.filterButtons}>
          <button
            style={{
              ...styles.filterButton,
              ...(filter === 'all' ? styles.activeFilterButton : {}),
            }}
            onClick={() => setFilter('all')}
          >
            All ({queries.length})
          </button>
          <button
            style={{
              ...styles.filterButton,
              ...(filter === 'query' ? styles.activeFilterButton : {}),
            }}
            onClick={() => setFilter('query')}
          >
            Queries ({queries.filter((q) => q.category === 'query').length})
          </button>
          <button
            style={{
              ...styles.filterButton,
              ...(filter === 'mutation' ? styles.activeFilterButton : {}),
            }}
            onClick={() => setFilter('mutation')}
          >
            Mutations ({queries.filter((q) => q.category === 'mutation').length})
          </button>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Calls</th>
              <th style={styles.th}>Errors</th>
              <th style={styles.th}>Avg Duration</th>
              <th style={styles.th}>Last Called</th>
            </tr>
          </thead>
          <tbody>
            {filteredQueries.map((query) => (
              <tr key={query.functionName} style={styles.tr}>
                <td style={styles.td}>{query.functionName}</td>
                <td style={styles.td}>
                  <span
                    style={{
                      ...styles.badge,
                      ...(query.category === 'query' ? styles.infoBadge : styles.warningBadge),
                    }}
                  >
                    {query.category}
                  </span>
                </td>
                <td style={styles.td}>{query.calls}</td>
                <td style={styles.td}>
                  {query.errors > 0 ? (
                    <span style={styles.errorText}>{query.errors}</span>
                  ) : (
                    <span style={styles.successText}>0</span>
                  )}
                </td>
                <td style={styles.td}>
                  <span
                    style={{
                      color: query.avgDuration > 100 ? '#ef4444' : '#10b981',
                    }}
                  >
                    {query.avgDuration.toFixed(2)}ms
                  </span>
                </td>
                <td style={styles.td}>{new Date(query.lastCalled).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredQueries.length === 0 && (
        <div style={styles.emptyState}>No {filter === 'all' ? 'queries or mutations' : filter} tracked yet</div>
      )}
    </div>
  );
}

function ErrorsTab() {
  const errors = runtimeRegistry.getAllErrors();
  const [selectedError, setSelectedError] = useState<ErrorEntry | null>(null);

  return (
    <div style={styles.tabContent}>
      <h3 style={styles.sectionTitle}>Error Log ({errors.length})</h3>

      {errors.length === 0 ? (
        <div style={styles.emptyState}>No errors recorded</div>
      ) : (
        <>
          <div style={styles.errorList}>
            {errors.map((error, index) => (
              <div
                key={index}
                style={{
                  ...styles.errorItem,
                  ...(selectedError === error ? styles.selectedErrorItem : {}),
                }}
                onClick={() => setSelectedError(error)}
              >
                <div style={styles.errorHeader}>
                  <span style={styles.errorType}>{error.type}</span>
                  <span style={styles.errorTime}>
                    {new Date(error.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div style={styles.errorMessage}>{error.message}</div>
                {error.componentName && (
                  <div style={styles.errorComponent}>in {error.componentName}</div>
                )}
              </div>
            ))}
          </div>

          {selectedError && (
            <div style={styles.errorDetails}>
              <h4 style={styles.errorDetailsTitle}>Error Details</h4>
              <pre style={styles.errorStack}>{selectedError.stack}</pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PerformanceTab() {
  const components = runtimeRegistry.getAllComponents();
  const functionCalls = runtimeRegistry.getAllFunctionCalls();

  const slowComponents = components
    .filter((c) => c.avgRenderTime > 16)
    .sort((a, b) => b.avgRenderTime - a.avgRenderTime)
    .slice(0, 10);

  const slowQueries = functionCalls
    .filter((f) => f.avgDuration > 100)
    .sort((a, b) => b.avgDuration - a.avgDuration)
    .slice(0, 10);

  return (
    <div style={styles.tabContent}>
      <h3 style={styles.sectionTitle}>Performance Bottlenecks</h3>

      <div style={styles.performanceSection}>
        <h4 style={styles.performanceTitle}>Slow Components (&gt;16ms)</h4>
        {slowComponents.length === 0 ? (
          <div style={styles.emptyState}>No slow components detected</div>
        ) : (
          <div style={styles.performanceList}>
            {slowComponents.map((component) => (
              <div key={component.name} style={styles.performanceItem}>
                <div style={styles.performanceItemName}>{component.name}</div>
                <div style={styles.performanceItemStats}>
                  <span style={styles.performanceStat}>
                    {component.avgRenderTime.toFixed(2)}ms avg
                  </span>
                  <span style={styles.performanceStat}>{component.renderCount} renders</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.performanceSection}>
        <h4 style={styles.performanceTitle}>Slow Queries/Mutations (&gt;100ms)</h4>
        {slowQueries.length === 0 ? (
          <div style={styles.emptyState}>No slow queries detected</div>
        ) : (
          <div style={styles.performanceList}>
            {slowQueries.map((query) => (
              <div key={query.functionName} style={styles.performanceItem}>
                <div style={styles.performanceItemName}>
                  {query.functionName}
                  <span
                    style={{
                      ...styles.badge,
                      marginLeft: '8px',
                      ...(query.category === 'query' ? styles.infoBadge : styles.warningBadge),
                    }}
                  >
                    {query.category}
                  </span>
                </div>
                <div style={styles.performanceItemStats}>
                  <span style={styles.performanceStat}>{query.avgDuration.toFixed(2)}ms avg</span>
                  <span style={styles.performanceStat}>{query.calls} calls</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ExportTab() {
  const handleExport = () => {
    const report = runtimeRegistry.exportDiagnostics();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    logger.info('Diagnostics exported successfully');
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all diagnostic data?')) {
      runtimeRegistry.clear();
      logger.info('Diagnostics cleared');
    }
  };

  return (
    <div style={styles.tabContent}>
      <h3 style={styles.sectionTitle}>Export & Data Management</h3>

      <div style={styles.exportSection}>
        <button style={styles.exportButton} onClick={handleExport}>
          📥 Export Diagnostics
        </button>
        <p style={styles.exportDescription}>
          Export all diagnostic data including components, queries, errors, and performance metrics
          as JSON.
        </p>
      </div>

      <div style={styles.exportSection}>
        <button style={{ ...styles.exportButton, ...styles.dangerButton }} onClick={handleClear}>
          🗑️ Clear All Data
        </button>
        <p style={styles.exportDescription}>
          Clear all tracked diagnostic data. This action cannot be undone.
        </p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color = '#3b82f6',
}: {
  label: string;
  value: string | number;
  icon: string;
  color?: string;
}) {
  return (
    <div style={styles.statCard}>
      <div style={{ ...styles.statIcon, backgroundColor: color + '20', color }}>{icon}</div>
      <div style={styles.statContent}>
        <div style={styles.statValue}>{value}</div>
        <div style={styles.statLabel}>{label}</div>
      </div>
    </div>
  );
}

function RecentActivityList() {
  const components = runtimeRegistry.getAllComponents();
  const functionCalls = runtimeRegistry.getAllFunctionCalls();
  const errors = runtimeRegistry.getAllErrors();

  const recentActivity = [
    ...components.map((c) => ({
      type: 'component',
      name: c.name,
      time: c.lastRender,
      details: `Rendered ${c.renderCount} times`,
    })),
    ...functionCalls.map((f) => ({
      type: f.category,
      name: f.functionName,
      time: f.lastCalled,
      details: `Called ${f.calls} times`,
    })),
    ...errors.map((e) => ({
      type: 'error',
      name: e.message,
      time: e.timestamp,
      details: e.componentName || 'Unknown source',
    })),
  ]
    .sort((a, b) => b.time - a.time)
    .slice(0, 10);

  return (
    <div style={styles.activityList}>
      {recentActivity.map((activity, index) => (
        <div key={index} style={styles.activityItem}>
          <span style={styles.activityType}>{activity.type}</span>
          <span style={styles.activityName}>{activity.name}</span>
          <span style={styles.activityDetails}>{activity.details}</span>
          <span style={styles.activityTime}>{new Date(activity.time).toLocaleTimeString()}</span>
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  console: {
    backgroundColor: '#1e1e1e',
    color: '#e0e0e0',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '1400px',
    height: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderBottom: '1px solid #333',
    backgroundColor: '#252525',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#fff',
  },
  headerActions: {
    display: 'flex',
    gap: '8px',
  },
  iconButton: {
    backgroundColor: 'transparent',
    border: '1px solid #444',
    color: '#e0e0e0',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  activeButton: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    color: '#fff',
  },
  tabs: {
    display: 'flex',
    gap: '4px',
    padding: '12px 24px 0',
    backgroundColor: '#252525',
    borderBottom: '1px solid #333',
  },
  tab: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#999',
    padding: '10px 16px',
    borderRadius: '6px 6px 0 0',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  activeTab: {
    backgroundColor: '#1e1e1e',
    color: '#fff',
  },
  tabIcon: {
    fontSize: '16px',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '24px',
  },
  tabContent: {
    maxWidth: '100%',
  },
  sectionTitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    fontWeight: 600,
    color: '#fff',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  statCard: {
    backgroundColor: '#252525',
    padding: '16px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    border: '1px solid #333',
  },
  statIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#fff',
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '12px',
    color: '#999',
  },
  tableHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  sortControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sortLabel: {
    fontSize: '14px',
    color: '#999',
  },
  sortSelect: {
    backgroundColor: '#252525',
    border: '1px solid #444',
    color: '#e0e0e0',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '14px',
  },
  filterButtons: {
    display: 'flex',
    gap: '8px',
  },
  filterButton: {
    backgroundColor: '#252525',
    border: '1px solid #444',
    color: '#e0e0e0',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s',
  },
  activeFilterButton: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    color: '#fff',
  },
  tableContainer: {
    overflowX: 'auto',
    border: '1px solid #333',
    borderRadius: '8px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    backgroundColor: '#252525',
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: 600,
    color: '#999',
    borderBottom: '1px solid #333',
  },
  tr: {
    borderBottom: '1px solid #2a2a2a',
  },
  td: {
    padding: '12px 16px',
    fontSize: '13px',
    color: '#e0e0e0',
  },
  badge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },
  successBadge: {
    backgroundColor: '#10b98120',
    color: '#10b981',
  },
  mutedBadge: {
    backgroundColor: '#6b728020',
    color: '#9ca3af',
  },
  infoBadge: {
    backgroundColor: '#3b82f620',
    color: '#3b82f6',
  },
  warningBadge: {
    backgroundColor: '#f59e0b20',
    color: '#f59e0b',
  },
  errorText: {
    color: '#ef4444',
    fontWeight: 600,
  },
  successText: {
    color: '#10b981',
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px 24px',
    color: '#666',
    fontSize: '14px',
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  activityItem: {
    backgroundColor: '#252525',
    padding: '12px 16px',
    borderRadius: '6px',
    display: 'grid',
    gridTemplateColumns: '80px 1fr 200px 100px',
    gap: '12px',
    alignItems: 'center',
    fontSize: '13px',
  },
  activityType: {
    color: '#3b82f6',
    fontWeight: 500,
    textTransform: 'capitalize',
  },
  activityName: {
    color: '#e0e0e0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  activityDetails: {
    color: '#999',
  },
  activityTime: {
    color: '#666',
    textAlign: 'right',
  },
  errorList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '24px',
  },
  errorItem: {
    backgroundColor: '#252525',
    padding: '12px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    border: '1px solid #333',
    transition: 'all 0.2s',
  },
  selectedErrorItem: {
    borderColor: '#ef4444',
    backgroundColor: '#3a2020',
  },
  errorHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '6px',
  },
  errorType: {
    color: '#ef4444',
    fontWeight: 600,
    fontSize: '13px',
  },
  errorTime: {
    color: '#666',
    fontSize: '12px',
  },
  errorMessage: {
    color: '#e0e0e0',
    fontSize: '13px',
    marginBottom: '4px',
  },
  errorComponent: {
    color: '#999',
    fontSize: '12px',
  },
  errorDetails: {
    backgroundColor: '#252525',
    padding: '16px',
    borderRadius: '6px',
    border: '1px solid #333',
  },
  errorDetailsTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff',
  },
  errorStack: {
    backgroundColor: '#1a1a1a',
    padding: '12px',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#999',
    overflow: 'auto',
    maxHeight: '300px',
  },
  performanceSection: {
    marginBottom: '32px',
  },
  performanceTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff',
  },
  performanceList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  performanceItem: {
    backgroundColor: '#252525',
    padding: '12px 16px',
    borderRadius: '6px',
    border: '1px solid #333',
  },
  performanceItemName: {
    color: '#e0e0e0',
    fontSize: '14px',
    marginBottom: '6px',
    fontWeight: 500,
  },
  performanceItemStats: {
    display: 'flex',
    gap: '16px',
  },
  performanceStat: {
    color: '#999',
    fontSize: '12px',
  },
  exportSection: {
    backgroundColor: '#252525',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #333',
    marginBottom: '16px',
  },
  exportButton: {
    backgroundColor: '#3b82f6',
    border: 'none',
    color: '#fff',
    padding: '12px 24px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    marginBottom: '12px',
    transition: 'all 0.2s',
  },
  dangerButton: {
    backgroundColor: '#ef4444',
  },
  exportDescription: {
    margin: 0,
    fontSize: '13px',
    color: '#999',
  },
  infoBox: {
    backgroundColor: '#1e3a5f',
    border: '1px solid #2563eb',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: '20px',
    flexShrink: 0,
  },
};
