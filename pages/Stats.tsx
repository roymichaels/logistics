import React from 'react';
import { DataStore } from '../data/types';
import { hebrew } from '../src/lib/hebrew';
import { ROYAL_COLORS, ROYAL_STYLES } from '../src/styles/royalTheme';

interface StatsProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function Stats(_: StatsProps) {
  return (
    <div style={ROYAL_STYLES.pageContainer}>
      {/* Header */}
      <div style={ROYAL_STYLES.pageHeader}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>📈</div>
        <h1 style={ROYAL_STYLES.pageTitle}>{hebrew.stats}</h1>
        <p style={ROYAL_STYLES.pageSubtitle}>
          סטטיסטיקות וביצועים בזמן אמת
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <div style={ROYAL_STYLES.statBox}>
          <div style={ROYAL_STYLES.statValue}>0</div>
          <div style={ROYAL_STYLES.statLabel}>הזמנות פעילות</div>
        </div>
        <div style={ROYAL_STYLES.statBox}>
          <div style={{ ...ROYAL_STYLES.statValue, color: ROYAL_COLORS.gold }}>₪0</div>
          <div style={ROYAL_STYLES.statLabel}>מחזור כספי</div>
        </div>
        <div style={ROYAL_STYLES.statBox}>
          <div style={{ ...ROYAL_STYLES.statValue, color: ROYAL_COLORS.success }}>0</div>
          <div style={ROYAL_STYLES.statLabel}>הזמנות הושלמו</div>
        </div>
        <div style={ROYAL_STYLES.statBox}>
          <div style={{ ...ROYAL_STYLES.statValue, color: ROYAL_COLORS.crimson }}>0</div>
          <div style={ROYAL_STYLES.statLabel}>ממתינות</div>
        </div>
      </div>

      {/* Coming Soon Card */}
      <div style={ROYAL_STYLES.card}>
        <div style={ROYAL_STYLES.emptyState}>
          <div style={ROYAL_STYLES.emptyStateIcon}>🚧</div>
          <h3 style={{ margin: '0 0 12px 0', color: ROYAL_COLORS.text }}>בפיתוח</h3>
          <div style={ROYAL_STYLES.emptyStateText}>
            תצוגת הביצועים המלאה תכלול:
            <br/><br/>
            📊 גרפים אינטראקטיביים<br/>
            📈 מגמות וחיזויים<br/>
            🎯 יעדים והשגים<br/>
            💰 ניתוח רווחיות<br/>
            👥 דירוג סוכנים<br/>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Stats;
