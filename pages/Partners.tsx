import React from 'react';
import { DataStore } from '../data/types';
import { hebrew } from '../src/lib/hebrew';
import { ROYAL_COLORS, ROYAL_STYLES } from '../src/styles/royalTheme';

interface PartnersProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function Partners(_: PartnersProps) {
  return (
    <div style={ROYAL_STYLES.pageContainer}>
      {/* Header */}
      <div style={ROYAL_STYLES.pageHeader}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🤝</div>
        <h1 style={ROYAL_STYLES.pageTitle}>{hebrew.partners}</h1>
        <p style={ROYAL_STYLES.pageSubtitle}>
          ניהול שותפים וספקים
        </p>
      </div>

      {/* Categories */}
      <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
        <div style={ROYAL_STYLES.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(77, 208, 225, 0.2)',
              border: '1px solid rgba(77, 208, 225, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>👥</div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', color: ROYAL_COLORS.text, fontWeight: '600' }}>
                ספקים
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: ROYAL_COLORS.muted }}>
                0 ספקים פעילים
              </p>
            </div>
          </div>
        </div>

        <div style={ROYAL_STYLES.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(156, 109, 255, 0.2)',
              border: '1px solid rgba(156, 109, 255, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>🚚</div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', color: ROYAL_COLORS.text, fontWeight: '600' }}>
                ערוצי הפצה
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: ROYAL_COLORS.muted }}>
                0 ערוצים פעילים
              </p>
            </div>
          </div>
        </div>

        <div style={ROYAL_STYLES.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(246, 201, 69, 0.2)',
              border: '1px solid rgba(246, 201, 69, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>🤝</div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', color: ROYAL_COLORS.text, fontWeight: '600' }}>
                שותפים עסקיים
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: ROYAL_COLORS.muted }}>
                0 שותפים פעילים
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon */}
      <div style={ROYAL_STYLES.card}>
        <div style={ROYAL_STYLES.emptyState}>
          <div style={ROYAL_STYLES.emptyStateIcon}>🚧</div>
          <h3 style={{ margin: '0 0 12px 0', color: ROYAL_COLORS.text }}>בפיתוח</h3>
          <div style={ROYAL_STYLES.emptyStateText}>
            מערכת ניהול שותפים מתקדמת תכלול:
            <br/><br/>
            📊 מעקב הזמנות מספקים<br/>
            💰 ניהול תשלומים<br/>
            📦 מעקב משלוחים<br/>
            📄 חוזים והסכמים<br/>
            📞 ניהול אנשי קשר<br/>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Partners;
