import React, { useEffect } from 'react';
import { telegram } from '../lib/telegram';
import { NotificationCenter } from '../src/components/NotificationCenter';
import { DataStore } from '../data/types';

interface NotificationsProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function Notifications({ dataStore, onNavigate }: NotificationsProps) {
  useEffect(() => {
    telegram.setBackButton(() => onNavigate('chat'));
    return () => telegram.hideBackButton();
  }, [onNavigate]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a0033 0%, #0a001a 100%)',
      paddingBottom: '80px'
    }}>
      <NotificationCenter dataStore={dataStore} onNavigate={onNavigate} />
    </div>
  );
}
