import React from 'react';

export function AdminBusinesses() {
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
        All Businesses
      </h1>

      <div style={{
        background: '#1E2732',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #38444D',
      }}>
        <p style={{ color: '#8899A6' }}>
          View and manage all businesses across the platform.
        </p>
      </div>
    </div>
  );
}
