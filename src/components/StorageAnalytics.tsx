import React, { useEffect, useState } from 'react';
import {
  getUnifiedDataStore,
  getBlobStore,
  getSearchEngine,
  getSyncEngine,
  getImportExportService
} from '../lib/storage';
import { logger } from '../lib/logger';

interface StorageStats {
  dataStore: {
    keys: number;
  };
  blobs: {
    count: number;
    totalSize: number;
    formattedSize: string;
  };
  search: {
    totalDocuments: number;
    totalTokens: number;
    avgTokensPerDoc: number;
    byStore: Record<string, number>;
  };
  sync: {
    pending: number;
    synced: number;
    conflicts: number;
    byStore: Record<string, { pending: number; synced: number }>;
  };
  storage: {
    stores: Record<string, number>;
    total: number;
    blobCount: number;
    blobSize: number;
  };
}

export function StorageAnalytics() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    try {
      setRefreshing(true);

      const store = getUnifiedDataStore();
      const blobStore = getBlobStore();
      const searchEngine = getSearchEngine();
      const syncEngine = getSyncEngine();
      const importExport = getImportExportService();

      const [keys, blobList, searchStats, syncStats, storageStats] = await Promise.all([
        store.keys(),
        blobStore.list(),
        searchEngine.getIndexStats(),
        syncEngine.getSyncStats(),
        importExport.getStorageStats()
      ]);

      const totalBlobSize = await blobStore.getTotalSize();

      setStats({
        dataStore: {
          keys: keys.length
        },
        blobs: {
          count: blobList.length,
          totalSize: totalBlobSize,
          formattedSize: formatBytes(totalBlobSize)
        },
        search: searchStats,
        sync: syncStats,
        storage: storageStats
      });
    } catch (error) {
      logger.error('[StorageAnalytics] Error loading stats', error as Error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleExport = async () => {
    try {
      const importExport = getImportExportService();
      const filename = `backup_${new Date().toISOString().split('T')[0]}.json`;
      await importExport.exportToFile(filename, { includeBlobs: true });
      logger.info('[StorageAnalytics] Export completed', { filename });
    } catch (error) {
      logger.error('[StorageAnalytics] Export failed', error as Error);
    }
  };

  const handleClearCache = () => {
    const store = getUnifiedDataStore();
    store.clearCache();
    logger.info('[StorageAnalytics] Cache cleared');
    loadStats();
  };

  const handleCleanupBlobs = async () => {
    try {
      const blobStore = getBlobStore();
      const deletedCount = await blobStore.cleanup(30);
      logger.info('[StorageAnalytics] Cleanup completed', { deletedCount });
      loadStats();
    } catch (error) {
      logger.error('[StorageAnalytics] Cleanup failed', error as Error);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading storage analytics...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Failed to load storage stats</div>
        <button onClick={loadStats} style={{ marginTop: '10px' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Storage Analytics</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={loadStats} disabled={refreshing}>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button onClick={handleExport}>Export Backup</button>
          <button onClick={handleClearCache}>Clear Cache</button>
          <button onClick={handleCleanupBlobs}>Cleanup Blobs</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        <StatCard title="Data Store">
          <StatItem label="Cached Keys" value={stats.dataStore.keys} />
        </StatCard>

        <StatCard title="File Storage">
          <StatItem label="Total Files" value={stats.blobs.count} />
          <StatItem label="Total Size" value={stats.blobs.formattedSize} />
        </StatCard>

        <StatCard title="Search Index">
          <StatItem label="Indexed Documents" value={stats.search.totalDocuments} />
          <StatItem label="Total Tokens" value={stats.search.totalTokens} />
          <StatItem label="Avg Tokens/Doc" value={Math.round(stats.search.avgTokensPerDoc)} />
        </StatCard>

        <StatCard title="Sync Status">
          <StatItem label="Pending" value={stats.sync.pending} color="#ff9500" />
          <StatItem label="Synced" value={stats.sync.synced} color="#34c759" />
          <StatItem label="Conflicts" value={stats.sync.conflicts} color="#ff3b30" />
        </StatCard>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>Storage by Collection</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
          {Object.entries(stats.storage.stores)
            .filter(([_, count]) => count > 0)
            .sort(([_, a], [__, b]) => b - a)
            .map(([store, count]) => (
              <div
                key={store}
                style={{
                  padding: '15px',
                  background: '#f5f5f7',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 500 }}>{store}</span>
                <span style={{ fontSize: '18px', fontWeight: 600, color: '#007aff' }}>{count}</span>
              </div>
            ))}
        </div>
      </div>

      {Object.keys(stats.search.byStore).length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <h3>Search Index by Store</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
            {Object.entries(stats.search.byStore)
              .sort(([_, a], [__, b]) => b - a)
              .map(([store, count]) => (
                <div
                  key={store}
                  style={{
                    padding: '15px',
                    background: '#f5f5f7',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>{store}</span>
                  <span style={{ fontSize: '18px', fontWeight: 600, color: '#5856d6' }}>{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {Object.keys(stats.sync.byStore).length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <h3>Sync Status by Store</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px' }}>
            {Object.entries(stats.sync.byStore).map(([store, status]) => (
              <div
                key={store}
                style={{
                  padding: '15px',
                  background: '#f5f5f7',
                  borderRadius: '8px'
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>{store}</div>
                <div style={{ display: 'flex', gap: '15px', fontSize: '12px' }}>
                  <span>
                    Pending: <strong style={{ color: '#ff9500' }}>{status.pending}</strong>
                  </span>
                  <span>
                    Synced: <strong style={{ color: '#34c759' }}>{status.synced}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '20px',
        background: 'white',
        border: '1px solid #e5e5e7',
        borderRadius: '12px'
      }}
    >
      <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: 600 }}>{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>{children}</div>
    </div>
  );
}

function StatItem({
  label,
  value,
  color
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '14px', color: '#6e6e73' }}>{label}</span>
      <span style={{ fontSize: '20px', fontWeight: 600, color: color || '#000' }}>{value}</span>
    </div>
  );
}

logger.info('[StorageAnalytics] Component loaded');
