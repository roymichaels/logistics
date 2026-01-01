import React, { useState } from 'react';
import { SectionProps } from './types';

export function Section({
  section,
  collapsible = false,
  defaultCollapsed = false
}: SectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const sectionStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e5e7eb'
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isCollapsed ? '0' : '16px',
    cursor: collapsible ? 'pointer' : 'default'
  };

  const titleContainerStyle: React.CSSProperties = {
    flex: 1
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 700,
    color: '#1f2937',
    margin: 0
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '4px'
  };

  const actionsContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  };

  const actionButtonStyle: React.CSSProperties = {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid #e5e7eb',
    background: '#fff',
    color: '#374151',
    transition: 'all 0.2s ease'
  };

  const collapseIconStyle: React.CSSProperties = {
    fontSize: '16px',
    marginLeft: '8px',
    transition: 'transform 0.2s ease',
    transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)'
  };

  return (
    <div style={sectionStyle}>
      <div
        style={headerStyle}
        onClick={() => collapsible && setIsCollapsed(!isCollapsed)}
      >
        <div style={titleContainerStyle}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h3 style={titleStyle}>{section.title}</h3>
            {collapsible && <span style={collapseIconStyle}>▼</span>}
          </div>
          {section.subtitle && !isCollapsed && (
            <p style={subtitleStyle}>{section.subtitle}</p>
          )}
        </div>

        {section.actions && section.actions.length > 0 && !isCollapsed && (
          <div style={actionsContainerStyle}>
            {section.actions.map((action) => (
              <button
                key={action.id}
                style={actionButtonStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                }}
                disabled={action.disabled}
                onMouseEnter={(e) => {
                  if (!action.disabled) {
                    (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6';
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#fff';
                }}
              >
                {action.icon && <span style={{ marginRight: '4px' }}>{action.icon}</span>}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!isCollapsed && (
        <div style={{ marginTop: section.subtitle || section.actions ? '0' : '16px' }}>
          {section.children}
        </div>
      )}
    </div>
  );
}
