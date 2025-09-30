import React, { useEffect, useMemo } from 'react';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import { DataStore } from '../data/types';

interface PartnersProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function Partners({ dataStore }: PartnersProps) {
  const { theme, backButton, haptic } = useTelegramUI();
  const accentColor = theme.button_color || '#007aff';
  const accentTextColor = theme.button_text_color || '#ffffff';

  useEffect(() => {
    backButton.hide();
    // Warm up the profile request for caching
    dataStore.getProfile().catch(() => undefined);
  }, [backButton, dataStore]);

  const partners = useMemo(
    () => [
      {
        name: 'Fresh Supply Co.',
        contact: 'דנה ישראלי',
        phone: '+972-52-123-4567',
        status: 'שותף אסטרטגי',
        tags: ['מזון טרי', 'משלוחים יומיים']
      },
      {
        name: 'Urban Market',
        contact: 'איתי לוי',
        phone: '+972-50-765-4321',
        status: 'מפיץ מרכזי',
        tags: ['חנויות קמעונאות', 'פריסה ארצית']
      },
      {
        name: 'LogiPro Warehousing',
        contact: 'מורן כהן',
        phone: '+972-54-888-1122',
        status: 'ספק תפעולי',
        tags: ['אחסון', 'שירותי ערך מוסף']
      }
    ],
    []
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: theme.bg_color,
        color: theme.text_color,
        padding: '20px',
        direction: 'rtl'
      }}
    >
      <h1 style={{ fontSize: '24px', margin: '0 0 16px' }}>שותפים עסקיים</h1>
      <p style={{ margin: '0 0 24px', color: theme.hint_color }}>
        ניהול מערכות היחסים עם ספקים, מפיצים ושיתופי פעולה קריטיים להצלחת העסק.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {partners.map((partner) => (
          <button
            key={partner.name}
            onClick={() => haptic('medium')}
            style={{
              textAlign: 'right',
              border: 'none',
              borderRadius: '14px',
              padding: '16px',
              backgroundColor: theme.secondary_bg_color || '#f5f5f5',
              color: theme.text_color,
              cursor: 'pointer'
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>{partner.name}</div>
            <div style={{ fontSize: '14px', color: theme.hint_color, marginBottom: '8px' }}>
              {partner.status}
            </div>
            <div style={{ marginBottom: '8px' }}>איש קשר: {partner.contact}</div>
            <div style={{ color: theme.hint_color }}>{partner.phone}</div>
            <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {partner.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    backgroundColor: accentColor,
                    color: accentTextColor,
                    borderRadius: '999px',
                    padding: '4px 12px',
                    fontSize: '12px'
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
