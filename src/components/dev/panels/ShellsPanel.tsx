import React from 'react';
import { useAppServices } from '../../../context/AppServicesContext';

export function ShellsPanel() {
  const { userRole } = useAppServices();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div
        style={{
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.2)',
        }}
      >
        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
          Shell Architecture
        </div>
        <div
          style={{
            fontSize: '13px',
            fontWeight: '600',
            color: '#22c55e',
            fontFamily: 'monospace',
          }}
        >
          Unified Shell (Single Source)
        </div>
        <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)', marginTop: '4px' }}>
          All roles use one unified shell with role-based navigation
        </div>
      </div>

      <div
        style={{
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
        }}
      >
        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
          Current User Role
        </div>
        <div
          style={{
            fontSize: '13px',
            fontWeight: '600',
            color: '#60a5fa',
            fontFamily: 'monospace',
          }}
        >
          {userRole || 'None'}
        </div>
      </div>

      <div
        style={{
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '8px' }}>
          Architecture Changes
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', lineHeight: '1.5' }}>
          • Single unified AppShell component<br />
          • Role-based navigation from config/navigation.tsx<br />
          • No more shell wrappers or factories<br />
          • Header renders once per page<br />
          • Sidebar or bottom nav based on role
        </div>
      </div>

      <div
        style={{
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '8px' }}>
          Role Navigation Types
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', lineHeight: '1.5' }}>
          <strong style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Sidebar Navigation:</strong><br />
          business_owner, infrastructure_owner, manager, warehouse, dispatcher<br />
          <br />
          <strong style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Bottom Navigation:</strong><br />
          driver, user, customer
        </div>
      </div>
    </div>
  );
}
