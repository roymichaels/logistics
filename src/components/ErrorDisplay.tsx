import React, { useState } from 'react';

interface ErrorDisplayProps {
  error: string;
  theme: {
    bg_color: string;
    text_color: string;
    hint_color: string;
    link_color: string;
    button_color: string;
    button_text_color: string;
  };
}

export function ErrorDisplay({ error, theme }: ErrorDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);

  const lines = error.split('\n');
  const errorMessage = lines[0] || 'שגיאה באתחול';
  const errorDetails = lines.slice(1);

  return (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: theme.bg_color,
        color: theme.text_color,
        padding: '20px',
        textAlign: 'center',
        direction: 'rtl'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>⚠️</div>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '600',
          marginBottom: '12px',
          color: theme.text_color
        }}>
          {errorMessage}
        </h1>
        {errorDetails.length > 0 && (
          <div style={{
            fontSize: '16px',
            marginBottom: '24px',
            color: theme.hint_color,
            lineHeight: '1.6',
            maxWidth: '500px',
            textAlign: 'right'
          }}>
            {errorDetails.map((line, idx) => (
              <p key={idx} style={{ margin: '8px 0' }}>{line}</p>
            ))}
          </div>
        )}
        {errorDetails.length > 5 && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: theme.link_color,
              border: `1px solid ${theme.link_color}`,
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
              marginBottom: '12px'
            }}
          >
            {showDetails ? 'הסתר פרטים טכניים' : 'הצג פרטים טכניים'}
          </button>
        )}
        {showDetails && (
          <pre style={{
            fontSize: '12px',
            color: theme.hint_color,
            backgroundColor: 'rgba(0,0,0,0.05)',
            padding: '12px',
            borderRadius: '8px',
            textAlign: 'left',
            maxWidth: '500px',
            overflow: 'auto',
            marginBottom: '12px'
          }}>
            {error}
          </pre>
        )}
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '12px 24px',
            backgroundColor: theme.button_color,
            color: theme.button_text_color,
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          נסה שוב
        </button>
    </div>
  );
}
