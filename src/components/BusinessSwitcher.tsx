import React, { useState } from 'react';

interface Business {
  id: string;
  name: string;
  type?: string;
  active?: boolean;
}

interface BusinessSwitcherProps {
  currentBusinessId: string | null;
  availableBusinesses: Business[];
  onSwitch: (businessId: string | null) => void;
  onViewAll?: () => void;
  showCreateButton?: boolean;
  onCreateBusiness?: () => void;
}

export function BusinessSwitcher({
  currentBusinessId,
  availableBusinesses,
  onSwitch,
  onViewAll,
  showCreateButton = false,
  onCreateBusiness
}: BusinessSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentBusiness = availableBusinesses.find(b => b.id === currentBusinessId);

  const handleSwitch = (businessId: string | null) => {
    onSwitch(businessId);
    setIsOpen(false);
  };

  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      onSwitch(null);
    }
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '0.5rem 1rem',
          background: currentBusinessId ? '#3b82f6' : '#6b7280',
          color: 'white',
          border: 'none',
          borderRadius: '0.5rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem',
          fontWeight: '500',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        }}
      >
        <span>🏢</span>
        <span>
          {currentBusiness?.name || 'All Businesses'}
        </span>
        <span style={{ fontSize: '0.7rem' }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999
            }}
          />

          {/* Dropdown */}
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 0.5rem)',
              right: 0,
              background: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              minWidth: '250px',
              maxWidth: '300px',
              maxHeight: '400px',
              overflowY: 'auto',
              zIndex: 1000,
              border: '1px solid #e5e7eb'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '0.75rem 1rem',
              borderBottom: '1px solid #e5e7eb',
              fontWeight: '600',
              fontSize: '0.875rem',
              color: '#374151'
            }}>
              Switch Business Context
            </div>

            {/* View All Option */}
            <button
              onClick={handleViewAll}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                textAlign: 'left',
                border: 'none',
                background: !currentBusinessId ? '#f3f4f6' : 'white',
                cursor: 'pointer',
                borderBottom: '1px solid #e5e7eb',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => {
                if (currentBusinessId) e.currentTarget.style.background = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = !currentBusinessId ? '#f3f4f6' : 'white';
              }}
            >
              <span>🏗️</span>
              <div>
                <div style={{ fontWeight: '600' }}>Infrastructure View</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  All businesses
                </div>
              </div>
            </button>

            {/* Business List */}
            <div>
              {availableBusinesses.map(business => (
                <button
                  key={business.id}
                  onClick={() => handleSwitch(business.id)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    border: 'none',
                    background: currentBusinessId === business.id ? '#eff6ff' : 'white',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'background 0.2s',
                    borderBottom: '1px solid #f3f4f6'
                  }}
                  onMouseEnter={(e) => {
                    if (currentBusinessId !== business.id) {
                      e.currentTarget.style.background = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = currentBusinessId === business.id ? '#eff6ff' : 'white';
                  }}
                >
                  <span>🏢</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500' }}>{business.name}</div>
                    {business.type && (
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {business.type}
                      </div>
                    )}
                  </div>
                  {business.active === false && (
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '0.125rem 0.375rem',
                      background: '#fee2e2',
                      color: '#991b1b',
                      borderRadius: '0.25rem'
                    }}>
                      Inactive
                    </span>
                  )}
                  {currentBusinessId === business.id && (
                    <span style={{ color: '#3b82f6' }}>✓</span>
                  )}
                </button>
              ))}
            </div>

            {/* Create Button */}
            {showCreateButton && onCreateBusiness && (
              <button
                onClick={() => {
                  onCreateBusiness();
                  setIsOpen(false);
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  textAlign: 'center',
                  border: 'none',
                  background: '#f3f4f6',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#3b82f6',
                  borderTop: '1px solid #e5e7eb',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f3f4f6';
                }}
              >
                + Create New Business
              </button>
            )}

            {/* Business Count */}
            <div style={{
              padding: '0.5rem 1rem',
              fontSize: '0.75rem',
              color: '#6b7280',
              textAlign: 'center',
              borderTop: '1px solid #e5e7eb'
            }}>
              {availableBusinesses.length} {availableBusinesses.length === 1 ? 'business' : 'businesses'}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
