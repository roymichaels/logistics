import React, { useEffect, useMemo, useState } from 'react';
import { colors, spacing } from '../styles/theme';
import { DataStore, User } from '../data/types';
import { logger } from '../lib/logger';
import { getUserDisplayName } from '../utils/userIdentifier';
import { MetricCardWithProgress } from '../components/organisms/MetricCardWithProgress';
import { LeaderboardCard, LeaderboardEntry } from '../components/organisms/LeaderboardCard';

interface MyStatsProps {
  dataStore: DataStore;
  onNavigate?: (page: string) => void;
}

export function MyStats({ dataStore }: MyStatsProps) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let mounted = true;
    dataStore
      .getProfile()
      .then((profile) => {
        if (mounted) {
          setUser(profile);
        }
      })
      .catch((error) => logger.warn('Failed to load profile for my stats page:', error));

    return () => {
      mounted = false;
    };
  }, [dataStore]);

  const performance = useMemo(
    () => [
      { label: 'יעד חודשי', value: '₪120,000', progress: 74, max: 100 },
      { label: 'עסקאות סגורות', value: '32', progress: 58, max: 100 },
      { label: 'לקוחות פעילים', value: '18', progress: 82, max: 100 }
    ],
    []
  );

  const leaderboardData: LeaderboardEntry[] = useMemo(
    () => [
      { id: '1', name: 'את', value: '₪88,450', rank: 1 },
      { id: '2', name: 'גלעד', value: '₪81,320', rank: 2 },
      { id: '3', name: 'נועה', value: '₪73,980', rank: 3 }
    ],
    []
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: colors.background.primary,
        color: colors.text.primary,
        padding: spacing['2xl'],
        direction: 'rtl'
      }}
    >
      <h1 style={{ fontSize: '24px', margin: '0 0 8px', fontWeight: '700' }}>
        הביצועים שלי {user ? `• ${getUserDisplayName(user)}` : ''}
      </h1>
      <p style={{ margin: '0 0 24px', color: colors.text.secondary, fontSize: '14px' }}>
        מעקב אחרי היעדים, העמלות וההזדמנויות האחרונות שלך.
      </p>

      <div
        style={{
          display: 'grid',
          gap: spacing.lg,
          marginBottom: spacing['4xl']
        }}
      >
        {performance.map((item) => (
          <MetricCardWithProgress
            key={item.label}
            label={item.label}
            value={item.value}
            progress={item.progress}
            max={item.max}
            variant="primary"
          />
        ))}
      </div>

      <LeaderboardCard
        title="טבלת מכירות"
        entries={leaderboardData}
        highlightIndex={0}
      />
    </div>
  );
}
