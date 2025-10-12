import React from 'react';

export const ErrorDisplay: React.FC<any> = ({ error, theme }) => (
  <div style={{
    padding: '20px',
    textAlign: 'center',
    direction: 'rtl',
    backgroundColor: theme?.bg_color || '#fff',
    color: theme?.text_color || '#000'
  }}>
    <h2>שגיאה</h2>
    <p>{error}</p>
  </div>
);
