import React, { useEffect, useState } from 'react';
import { offlineSyncManager, SyncState } from '../lib/offline/OfflineSyncManager';

export function OfflineSyncIndicator() {
  const [syncState, setSyncState] = useState<SyncState>(offlineSyncManager.getState());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = offlineSyncManager.subscribe(setSyncState);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const shouldShow = !isOnline || syncState.status === 'syncing' || syncState.pendingCount > 0;
    setIsVisible(shouldShow);
  }, [isOnline, syncState]);

  if (!isVisible) {
    return null;
  }

  const getBackgroundColor = () => {
    if (!isOnline) return '#ff3b30';
    if (syncState.status === 'syncing') return '#ff9500';
    if (syncState.pendingCount > 0) return '#ffcc00';
    return '#34c759';
  };

  const getMessage = () => {
    if (!isOnline) return '⚠️ No internet connection - Working offline';
    if (syncState.status === 'syncing') return '🔄 Syncing data...';
    if (syncState.pendingCount > 0) return `📤 ${syncState.pendingCount} changes pending sync`;
    return '✅ All data synced';
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        padding: '8px 16px',
        backgroundColor: getBackgroundColor(),
        color: 'white',
        textAlign: 'center',
        fontSize: '14px',
        fontWeight: 500,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
      }}
    >
      <span>{getMessage()}</span>

      {syncState.pendingCount > 0 && isOnline && syncState.status !== 'syncing' && (
        <button
          onClick={() => offlineSyncManager.sync()}
          style={{
            padding: '4px 12px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 200ms ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          Sync Now
        </button>
      )}

      {syncState.lastSyncedAt && (
        <span
          style={{
            fontSize: '12px',
            opacity: 0.8
          }}
        >
          Last synced: {new Date(syncState.lastSyncedAt).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
