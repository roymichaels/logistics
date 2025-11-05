import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { TWITTER_COLORS } from '../styles/twitterTheme';

interface LanguageToggleProps {
  variant?: 'button' | 'switch';
  size?: 'small' | 'medium' | 'large';
}

export function LanguageToggle({ variant = 'button', size = 'medium' }: LanguageToggleProps) {
  const { language, setLanguage } = useLanguage();

  const handleToggle = () => {
    setLanguage(language === 'he' ? 'en' : 'he');
  };

  if (variant === 'switch') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: size === 'small' ? '4px 8px' : size === 'large' ? '12px 16px' : '8px 12px',
          background: TWITTER_COLORS.backgroundSecondary,
          borderRadius: '20px',
          border: `1px solid ${TWITTER_COLORS.border}`,
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onClick={handleToggle}
      >
        <span
          style={{
            fontSize: size === 'small' ? '12px' : size === 'large' ? '16px' : '14px',
            fontWeight: language === 'he' ? '700' : '500',
            color: language === 'he' ? TWITTER_COLORS.primary : TWITTER_COLORS.textSecondary,
            transition: 'all 0.2s ease'
          }}
        >
          עב
        </span>
        <div
          style={{
            position: 'relative',
            width: size === 'small' ? '36px' : size === 'large' ? '52px' : '44px',
            height: size === 'small' ? '20px' : size === 'large' ? '28px' : '24px',
            background: TWITTER_COLORS.primary,
            borderRadius: '20px',
            transition: 'all 0.3s ease'
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '2px',
              left: language === 'he' ? '2px' : 'calc(100% - 2px)',
              transform: language === 'he' ? 'translateX(0)' : 'translateX(-100%)',
              width: size === 'small' ? '16px' : size === 'large' ? '24px' : '20px',
              height: size === 'small' ? '16px' : size === 'large' ? '24px' : '20px',
              background: TWITTER_COLORS.white,
              borderRadius: '50%',
              transition: 'all 0.3s ease',
              boxShadow: TWITTER_COLORS.shadow
            }}
          />
        </div>
        <span
          style={{
            fontSize: size === 'small' ? '12px' : size === 'large' ? '16px' : '14px',
            fontWeight: language === 'en' ? '700' : '500',
            color: language === 'en' ? TWITTER_COLORS.primary : TWITTER_COLORS.textSecondary,
            transition: 'all 0.2s ease'
          }}
        >
          EN
        </span>
      </div>
    );
  }

  // Default button variant
  return (
    <button
      onClick={handleToggle}
      style={{
        padding: size === 'small' ? '6px 12px' : size === 'large' ? '12px 24px' : '8px 16px',
        background: TWITTER_COLORS.buttonSecondary,
        border: `1px solid ${TWITTER_COLORS.buttonSecondaryBorder}`,
        borderRadius: '20px',
        color: TWITTER_COLORS.buttonSecondaryText,
        fontSize: size === 'small' ? '12px' : size === 'large' ? '16px' : '14px',
        fontWeight: '700',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s ease',
        fontFamily: 'inherit'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = TWITTER_COLORS.backgroundHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = TWITTER_COLORS.buttonSecondary;
      }}
    >
      <span style={{ fontSize: size === 'large' ? '20px' : '16px' }}>🌐</span>
      <span>{language === 'he' ? 'English' : 'עברית'}</span>
    </button>
  );
}
