import React from 'react';
import { tokens, styles } from '../styles/tokens';

interface NoActiveBusinessProps {
  onNavigateToBusinesses: () => void;
  message?: string;
}

export function NoActiveBusiness({ onNavigateToBusinesses, message }: NoActiveBusinessProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 20px',
      minHeight: '400px',
      textAlign: 'center'
    }}>
      <div style={{
        fontSize: '64px',
        marginBottom: '24px',
        opacity: 0.8
      }}>
        🏢
      </div>

      <h2 style={{
        fontSize: '24px',
        fontWeight: '700',
        color: tokens.colors.text,
        marginBottom: '12px',
        marginTop: 0
      }}>
        אין עסק פעיל
      </h2>

      <p style={{
        fontSize: '15px',
        color: tokens.colors.subtle,
        marginBottom: '32px',
        maxWidth: '400px',
        lineHeight: '1.6'
      }}>
        {message || 'כדי להשתמש בדף זה, עליך לבחור עסק פעיל או ליצור עסק חדש'}
      </p>

      <div style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <button
          onClick={onNavigateToBusinesses}
          style={{
            ...styles.button.primary,
            padding: '12px 24px',
            fontSize: '15px',
            fontWeight: '600'
          }}
        >
          עבור לעסקים שלי
        </button>
      </div>

      <div style={{
        marginTop: '32px',
        padding: '16px',
        background: 'rgba(102, 126, 234, 0.08)',
        border: '1px solid rgba(102, 126, 234, 0.2)',
        borderRadius: '12px',
        maxWidth: '500px'
      }}>
        <p style={{
          fontSize: '13px',
          color: tokens.colors.text,
          margin: 0,
          lineHeight: '1.6'
        }}>
          <strong>💡 טיפ:</strong> אם אין לך עסק, לחץ על "עבור לעסקים שלי" וצור עסק חדש בלחיצה אחת
        </p>
      </div>
    </div>
  );
}
