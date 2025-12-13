import React, { useState } from 'react';

const mockDataSets = [
  { id: 'products', label: 'Products', count: 50, enabled: true },
  { id: 'orders', label: 'Orders', count: 120, enabled: true },
  { id: 'users', label: 'Users', count: 25, enabled: false },
  { id: 'drivers', label: 'Drivers', count: 15, enabled: false },
  { id: 'businesses', label: 'Businesses', count: 10, enabled: true },
  { id: 'inventory', label: 'Inventory', count: 200, enabled: false },
  { id: 'messages', label: 'Messages', count: 500, enabled: false },
];

export function MocksPanel() {
  const [mocks, setMocks] = useState(mockDataSets);

  const toggleMock = (id: string) => {
    setMocks((prev) =>
      prev.map((mock) =>
        mock.id === id ? { ...mock, enabled: !mock.enabled } : mock
      )
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div
        style={{
          fontSize: '11px',
          fontWeight: '600',
          color: 'rgba(255, 255, 255, 0.4)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Mock Data Sets
      </div>

      {mocks.map((mock) => (
        <div
          key={mock.id}
          style={{
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: mock.enabled
              ? 'rgba(34, 197, 94, 0.1)'
              : 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${mock.enabled ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.06)'}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <span
              style={{
                fontSize: '13px',
                fontWeight: '500',
                color: mock.enabled ? '#22c55e' : 'rgba(255, 255, 255, 0.9)',
              }}
            >
              {mock.label}
            </span>
            <div
              style={{
                position: 'relative',
                width: '36px',
                height: '20px',
                borderRadius: '10px',
                backgroundColor: mock.enabled
                  ? 'rgba(34, 197, 94, 0.3)'
                  : 'rgba(255, 255, 255, 0.1)',
                border: `1px solid ${mock.enabled ? '#22c55e' : 'rgba(255, 255, 255, 0.2)'}`,
                transition: 'all 0.2s ease',
                cursor: 'pointer',
              }}
              onClick={() => toggleMock(mock.id)}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '1px',
                  left: mock.enabled ? '17px' : '1px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: mock.enabled ? '#22c55e' : 'rgba(255, 255, 255, 0.6)',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                }}
              />
            </div>
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'rgba(255, 255, 255, 0.5)',
            }}
          >
            {mock.count} items
          </div>
        </div>
      ))}

      <button
        style={{
          marginTop: '8px',
          padding: '10px 16px',
          borderRadius: '8px',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          color: '#22c55e',
          fontSize: '13px',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
        }}
      >
        Generate All Mocks
      </button>
    </div>
  );
}
