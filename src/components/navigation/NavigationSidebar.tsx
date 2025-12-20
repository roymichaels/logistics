import React from 'react';

interface NavigationSidebarProps {
  sections: NavigationSection[];
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
  onClose: () => void;
}

export interface NavigationSection {
  id: string;
  label: string;
  icon: string;
}

export function NavigationSidebar({ sections, activeSection, onSectionChange, onClose }: NavigationSidebarProps) {
  return (
    <div
      style={{
        width: '72px',
        backgroundColor: 'rgba(10, 10, 12, 0.6)',
        borderRight: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 0',
        gap: '8px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '8px',
          padding: '0 12px',
        }}
      >
        <button
          onClick={onClose}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
          }}
        >
          ✕
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          padding: '0 12px',
        }}
      >
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '10px 4px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor:
                activeSection === section.id ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
              color: activeSection === section.id ? '#60a5fa' : 'rgba(255, 255, 255, 0.5)',
              fontSize: '10px',
              fontWeight: activeSection === section.id ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              if (activeSection !== section.id) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeSection !== section.id) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
              }
            }}
          >
            {activeSection === section.id && (
              <div
                style={{
                  position: 'absolute',
                  left: '-12px',
                  width: '3px',
                  height: '50%',
                  backgroundColor: '#60a5fa',
                  borderRadius: '0 2px 2px 0',
                }}
              />
            )}
            <span style={{ fontSize: '18px' }}>{section.icon}</span>
            <span>{section.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
