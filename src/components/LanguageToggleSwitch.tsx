import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export function LanguageToggleSwitch() {
  // Safely access context with fallback
  let language: 'he' | 'en' = 'he';
  let setLanguage: (lang: 'he' | 'en') => void = () => {};

  try {
    const context = useLanguage();
    language = context.language;
    setLanguage = context.setLanguage;
  } catch (error) {
    // Context not available - use localStorage fallback
    const stored = localStorage.getItem('app_language');
    language = (stored === 'en' || stored === 'he') ? stored : 'he';
    setLanguage = (lang: 'he' | 'en') => {
      localStorage.setItem('app_language', lang);
      window.location.reload();
    };
  }

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
