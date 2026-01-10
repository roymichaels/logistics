import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useOptionalBusinessContext } from '../context/BusinessContext';
import { useNavigate } from 'react-router-dom';

interface Business {
  id: string;
  name: string;
  type?: string;
  active?: boolean;
}

interface BusinessSwitcherProps {
  showCreateButton?: boolean;
  showSearch?: boolean;
}

export function BusinessSwitcher({
  showCreateButton = true,
  showSearch = true
}: BusinessSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const businessContext = useOptionalBusinessContext();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  if (!businessContext) {
    return null;
  }

  const { activeBusiness, ownedBusinesses, isMultiBusinessOwner, switchBusiness } = businessContext;

  useEffect(() => {
    if (isOpen && showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, showSearch]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  if (ownedBusinesses.length === 0) {
    return null;
  }

  if (ownedBusinesses.length === 1 && !isMultiBusinessOwner) {
    return null;
  }

  const filteredBusinesses = searchQuery
    ? ownedBusinesses.filter(b =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : ownedBusinesses;

  const handleSwitch = useCallback((business: Business) => {
    switchBusiness(business);
    setIsOpen(false);
    setSearchQuery('');
  }, [switchBusiness]);

  const handleViewPortfolio = useCallback(() => {
    navigate('/portfolio/dashboard');
    setIsOpen(false);
    setSearchQuery('');
  }, [navigate]);

  const handleCreateNew = useCallback(() => {
    navigate('/business/create');
    setIsOpen(false);
    setSearchQuery('');
  }, [navigate]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '0.5rem 1rem',
          background: activeBusiness ? '#3b82f6' : '#6b7280',
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
          {activeBusiness?.name || 'All Businesses'}
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
            ref={dropdownRef}
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
            role="menu"
            aria-label="Business switcher menu"
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

            {/* Search Input */}
            {showSearch && ownedBusinesses.length > 3 && (
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb' }}>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search businesses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '0.875rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                  }}
                  aria-label="Search businesses"
                />
              </div>
            )}

            {/* Portfolio View for Multi-Business Owners */}
            {isMultiBusinessOwner && (
              <button
                onClick={handleViewPortfolio}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  textAlign: 'left',
                  border: 'none',
                  background: 'white',
                  cursor: 'pointer',
                  borderBottom: '1px solid #e5e7eb',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                }}
              >
                <span>📊</span>
                <div>
                  <div style={{ fontWeight: '600' }}>Portfolio Dashboard</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    All businesses overview
                  </div>
                </div>
              </button>
            )}

            {/* Business List */}
            <div>
              {filteredBusinesses.length === 0 ? (
                <div style={{
                  padding: '2rem 1rem',
                  textAlign: 'center',
                  color: '#6b7280',
                  fontSize: '0.875rem'
                }}>
                  No businesses found
                </div>
              ) : (
                filteredBusinesses.map(business => (
                  <button
                    key={business.id}
                    onClick={() => handleSwitch(business)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      border: 'none',
                      background: activeBusiness?.id === business.id ? '#eff6ff' : 'white',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'background 0.2s',
                      borderBottom: '1px solid #f3f4f6'
                    }}
                    onMouseEnter={(e) => {
                      if (activeBusiness?.id !== business.id) {
                        e.currentTarget.style.background = '#f9fafb';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = activeBusiness?.id === business.id ? '#eff6ff' : 'white';
                    }}
                    role="menuitem"
                    aria-label={`Switch to ${business.name}`}
                  >
                    <span>🏢</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500' }}>{business.name}</div>
                    </div>
                    {activeBusiness?.id === business.id && (
                      <span style={{ color: '#3b82f6' }} aria-label="Currently active">✓</span>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Create Button */}
            {showCreateButton && (
              <button
                onClick={handleCreateNew}
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
              {ownedBusinesses.length} {ownedBusinesses.length === 1 ? 'business' : 'businesses'}
              {isMultiBusinessOwner && <span> • Multi-Business Owner</span>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
