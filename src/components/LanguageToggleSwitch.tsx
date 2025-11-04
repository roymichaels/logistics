import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export function LanguageToggleSwitch() {
  const { language, setLanguage } = useLanguage();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '4px',
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '20px',
      border: '1px solid rgba(255, 255, 255, 0.2)'
    }}>
      <button
        onClick={() => setLanguage('en')}
        style={{
          padding: '6px 12px',
          fontSize: '14px',
          fontWeight: language === 'en' ? '600' : '400',
          background: language === 'en' ? '#ffffff' : 'transparent',
          color: language === 'en' ? '#1a1a2e' : '#ffffff',
          border: 'none',
          borderRadius: '16px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          minWidth: '40px'
        }}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('he')}
        style={{
          padding: '6px 12px',
          fontSize: '14px',
          fontWeight: language === 'he' ? '600' : '400',
          background: language === 'he' ? '#ffffff' : 'transparent',
          color: language === 'he' ? '#1a1a2e' : '#ffffff',
          border: 'none',
          borderRadius: '16px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          minWidth: '40px'
        }}
      >
        עב
      </button>
    </div>
  );
}
