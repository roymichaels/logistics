import React, { useState, useEffect } from 'react';
import { mockDataGenerator } from '../../../lib/mockDataGenerator';

const mockDataSets = [
  { id: 'products', label: 'מוצרים', count: 50 },
  { id: 'orders', label: 'הזמנות', count: 120 },
  { id: 'users', label: 'משתמשים', count: 25 },
  { id: 'drivers', label: 'נהגים', count: 15 },
  { id: 'businesses', label: 'עסקים', count: 10 },
  { id: 'inventory', label: 'מלאי', count: 200 },
  { id: 'messages', label: 'הודעות', count: 500 },
];

export function MocksPanel() {
  const [mocks, setMocks] = useState(() =>
    mockDataSets.map(mock => ({
      ...mock,
      enabled: mockDataGenerator.isEnabled(mock.id as any),
    }))
  );

  const toggleMock = (id: string) => {
    const mock = mocks.find(m => m.id === id);
    if (!mock) return;

    if (mock.enabled) {
      mockDataGenerator.clear(id as any);
    } else {
      mockDataGenerator.generate(id as any, mock.count);
    }

    setMocks((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, enabled: !m.enabled } : m
      )
    );
  };

  const generateAll = () => {
    mocks.forEach(mock => {
      if (!mock.enabled) {
        mockDataGenerator.generate(mock.id as any, mock.count);
      }
    });

    setMocks(prev => prev.map(m => ({ ...m, enabled: true })));
  };

  const clearAll = () => {
    mockDataGenerator.clearAll();
    setMocks(prev => prev.map(m => ({ ...m, enabled: false })));
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
        סטי נתוני דמה
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
            {mock.count} פריטים
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <button
          onClick={generateAll}
          style={{
            flex: 1,
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
          צור הכל
        </button>
        <button
          onClick={clearAll}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
          }}
        >
          נקה הכל
        </button>
      </div>
    </div>
  );
}
