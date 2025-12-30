import React from 'react';

export function AdminSettings() {
  return (
    <div style={{
      padding: '24px',
      maxWidth: '1400px',
      margin: '0 auto',
      color: '#E7E9EA',
    }}>
      <h1 style={{
        fontSize: '24px',
        fontWeight: '700',
        marginBottom: '24px',
      }}>
        System Settings
      </h1>

      <div style={{
        background: '#1E2732',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #38444D',
      }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: '600',
          marginBottom: '16px',
        }}>
          Platform Configuration
        </h2>
        <p style={{ color: '#8899A6', lineHeight: '1.5' }}>
          Configure platform-wide settings including themes, navigation rules, and feature flags.
        </p>
      </div>
    </div>
  );
}
