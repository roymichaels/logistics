import React, { useState, useEffect } from 'react';
import { shouldShowMigrationNotice, dismissMigrationNotice, clearOldSession, markSessionMigrated } from '../lib/sessionMigration';
import { tokens } from '../styles/tokens';

interface SessionMigrationNoticeProps {
  onReconnect: () => void;
}

export function SessionMigrationNotice({ onReconnect }: SessionMigrationNoticeProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(shouldShowMigrationNotice());
  }, []);

  const handleReconnect = () => {
    clearOldSession();
    dismissMigrationNotice();
    setShow(false);
    onReconnect();
  };

  const handleDismiss = () => {
    dismissMigrationNotice();
    setShow(false);
  };

  if (!show) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: tokens.colors.surface,
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        border: `2px solid ${tokens.colors.warning}`
      }}>
        <div style={{
          fontSize: '48px',
          textAlign: 'center',
          marginBottom: '16px'
        }}>
          ⚠️
        </div>

        <h2 style={{
          fontSize: '24px',
          fontWeight: '700',
          marginBottom: '12px',
          color: tokens.colors.text,
          textAlign: 'center'
        }}>
          נדרש עדכון חיבור
        </h2>

        <p style={{
          fontSize: '16px',
          lineHeight: '1.6',
          color: tokens.colors.textSecondary,
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          המערכת שודרגה עם מנגנון אימות משופר. כדי להמשיך ליצור עסקים ולבצע פעולות, יש להתחבר מחדש עם הארנק שלך.
        </p>

        <div style={{
          backgroundColor: tokens.colors.background,
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
          border: `1px solid ${tokens.colors.border}`
        }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '8px',
            color: tokens.colors.text
          }}>
            מה קורה בעדכון זה?
          </h3>
          <ul style={{
            fontSize: '14px',
            lineHeight: '1.6',
            color: tokens.colors.textSecondary,
            paddingRight: '20px',
            margin: 0
          }}>
            <li>מנגנון אימות מאובטח יותר</li>
            <li>תמיכה משופרת ביצירת עסקים</li>
            <li>שיפור ביציבות המערכת</li>
          </ul>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'stretch'
        }}>
          <button
            onClick={handleDismiss}
            style={{
              flex: 1,
              padding: '14px 24px',
              fontSize: '16px',
              fontWeight: '600',
              borderRadius: '8px',
              border: `2px solid ${tokens.colors.border}`,
              backgroundColor: 'transparent',
              color: tokens.colors.textSecondary,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = tokens.colors.surface;
              e.currentTarget.style.borderColor = tokens.colors.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = tokens.colors.border;
            }}
          >
            אחר כך
          </button>

          <button
            onClick={handleReconnect}
            style={{
              flex: 2,
              padding: '14px 24px',
              fontSize: '16px',
              fontWeight: '600',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: tokens.colors.primary,
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
            }}
          >
            התחבר מחדש עכשיו
          </button>
        </div>

        <p style={{
          fontSize: '12px',
          color: tokens.colors.textSecondary,
          textAlign: 'center',
          marginTop: '16px',
          marginBottom: 0
        }}>
          הפעולה תימשך מספר שניות בלבד
        </p>
      </div>
    </div>
  );
}
