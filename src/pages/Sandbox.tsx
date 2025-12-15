import React, { useEffect, useState } from 'react';
import type { Business } from '../data/types';

interface SandboxProps {
  dataStore: any;
  onNavigate: (page: string) => void;
}

export function Sandbox({ dataStore, onNavigate }: SandboxProps) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const list = (await dataStore?.listBusinesses?.()) ?? [];
        if (mounted) setBusinesses(list);
      } catch (err: any) {
        if (mounted) setError(err?.message || 'Failed to load sandboxes');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [dataStore]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0b1020',
      color: '#e7e9ea',
      padding: '16px',
      paddingBottom: '80px',
      direction: 'rtl'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px' }}>הסנדבוקסים שלי</h1>
          <p style={{ margin: 0, color: '#9ba7b6' }}>בחר סביבת עבודה או צור חדשה</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => onNavigate('customer-demo')}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: '#10b981',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            🛍️ Customer Demo
          </button>
          <button
            onClick={() => onNavigate('business-demo')}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: '#8b5cf6',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            🏢 Business Demo
          </button>
          <button
            onClick={() => onNavigate('catalog')}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: '#5c7cfa',
              color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          חזרה לקטלוג
        </button>
        </div>
      </div>

      <div style={{
        background: '#11182d',
        border: '1px solid #1c2640',
        borderRadius: '12px',
        padding: '12px',
        marginBottom: '12px'
      }}>
        <div style={{ fontWeight: 700, fontSize: '16px' }}>סנדבוקס אישי</div>
        <p style={{ margin: '6px 0', color: '#9ba7b6' }}>מתאים להרצת ניסויים, קטלוג אישי ובדיקות.</p>
        <button
          style={{
            padding: '10px',
            borderRadius: '10px',
            border: 'none',
            background: '#2dd4bf',
            color: '#0b1020',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          כניסה
        </button>
      </div>

      {loading && <p style={{ color: '#9ba7b6' }}>טוען סנדבוקסים...</p>}
      {error && <p style={{ color: '#ff6b6b' }}>{error}</p>}

      {businesses.map((biz) => (
        <div key={biz.id} style={{
          background: '#11182d',
          border: '1px solid #1c2640',
          borderRadius: '12px',
          padding: '12px',
          marginBottom: '12px'
        }}>
          <div style={{ fontWeight: 700, fontSize: '16px' }}>{biz.name || 'עסק ללא שם'}</div>
          <p style={{ margin: '6px 0', color: '#9ba7b6' }}>{(biz as any).description || 'ללא תיאור'}</p>
          <button
            style={{
              padding: '10px',
              borderRadius: '10px',
              border: 'none',
              background: '#5c7cfa',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            כניסה
          </button>
        </div>
      ))}

      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={() => onNavigate('start-new')}
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid #243047',
            background: '#0f1528',
            color: '#e7e9ea',
            cursor: 'pointer'
          }}
        >
          צור עסק חדש
        </button>
        <button
          onClick={() => onNavigate('start-new')}
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid #243047',
            background: '#0f1528',
            color: '#e7e9ea',
            cursor: 'pointer'
          }}
        >
          הצטרף כנהג
        </button>
      </div>
    </div>
  );
}
