import React from 'react';
import { LanguageToggleSwitch } from './LanguageToggleSwitch';

interface BusinessDashboardHeaderProps {
  businessName?: string;
  userName?: string;
  notificationCount?: number;
  onProfileClick?: () => void;
}

export function BusinessDashboardHeader({
  businessName = 'thecongress',
  userName = 'UndergroundLab',
  notificationCount = 0,
  onProfileClick
}: BusinessDashboardHeaderProps) {
  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '60px',
      background: 'linear-gradient(180deg, rgba(26, 26, 46, 0.95) 0%, rgba(15, 15, 30, 0.90) 100%)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0 20px',
      zIndex: 1000,
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
    }}>
      {/* Left section - Counter Badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          fontWeight: '700',
          color: '#ffffff',
          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
        }}>
          {notificationCount}
        </div>

        <LanguageToggleSwitch />
      </div>

      {/* Center section - Business Name */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px'
        }}>
          📋
        </div>
        <span style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#ffffff'
        }}>
          {businessName}
        </span>
      </div>

      {/* Right section - User Profile */}
      <button
        onClick={onProfileClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '20px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          color: '#ffffff'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
        }}
      >
        <span style={{ fontSize: '14px', fontWeight: '500' }}>{userName}</span>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px'
        }}>
          👤
        </div>
      </button>
    </header>
  );
}
