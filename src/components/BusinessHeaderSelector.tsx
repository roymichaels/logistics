import React, { useState, useRef, useEffect } from 'react';
import { logger } from '../lib/logger';

interface Business {
  id: string;
  name: string;
  type?: string;
  active?: boolean;
}

interface BusinessHeaderSelectorProps {
  currentBusinessId: string | null;
  businesses: Business[];
  onSwitch: (businessId: string | null) => void;
  onCreateBusiness: () => void;
  loading?: boolean;
}

export function BusinessHeaderSelector({
  currentBusinessId,
  businesses,
  onSwitch,
  onCreateBusiness,
  loading = false
}: BusinessHeaderSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentBusiness = businesses.find(b => b.id === currentBusinessId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSwitch = (businessId: string) => {
    logger.info('[BusinessHeaderSelector] Switching to business:', businessId);
    onSwitch(businessId);
    setIsOpen(false);
  };

  const handleCreateBusiness = () => {
    logger.info('[BusinessHeaderSelector] Create business clicked');
    onCreateBusiness();
    setIsOpen(false);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 16px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: 'rgba(255, 255, 255, 0.1)',
          animation: 'pulse 1.5s ease-in-out infinite'
        }} />
        <div style={{
          width: '120px',
          height: '20px',
          borderRadius: '4px',
          background: 'rgba(255, 255, 255, 0.1)',
          animation: 'pulse 1.5s ease-in-out infinite'
        }} />
      </div>
    );
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 16px',
          background: currentBusinessId
            ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)'
            : 'rgba(239, 68, 68, 0.1)',
          border: currentBusinessId
            ? '1px solid rgba(59, 130, 246, 0.3)'
            : '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          color: 'rgba(255, 255, 255, 0.95)',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          transition: 'all 0.2s ease',
          minWidth: '200px',
          justifyContent: 'space-between'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = currentBusinessId
            ? '0 4px 12px rgba(59, 130, 246, 0.2)'
            : '0 4px 12px rgba(239, 68, 68, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: currentBusinessId
              ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
              : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            flexShrink: 0
          }}>
            {currentBusiness ? '🏢' : '⚠️'}
          </div>
          <div style={{
            textAlign: 'left',
            overflow: 'hidden',
            flex: 1
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {currentBusiness?.name || 'No Business Selected'}
            </div>
            <div style={{
              fontSize: '11px',
              color: 'rgba(255, 255, 255, 0.5)',
              marginTop: '2px'
            }}>
              {businesses.length === 0
                ? 'Click to create business'
                : `${businesses.length} ${businesses.length === 1 ? 'business' : 'businesses'}`
              }
            </div>
          </div>
        </div>
        <span style={{
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.5)',
          transition: 'transform 0.2s ease',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
        }}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            background: 'rgba(20, 20, 24, 0.98)',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            minWidth: '280px',
            maxHeight: '400px',
            overflowY: 'auto',
            zIndex: 9999,
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            fontSize: '12px',
            fontWeight: '600',
            color: 'rgba(255, 255, 255, 0.5)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Your Businesses
          </div>

          <div>
            {businesses.length === 0 ? (
              <div style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.5)'
              }}>
                <div style={{
                  fontSize: '48px',
                  marginBottom: '12px'
                }}>
                  🏢
                </div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'rgba(255, 255, 255, 0.7)',
                  marginBottom: '8px'
                }}>
                  No businesses yet
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.4)',
                  marginBottom: '16px'
                }}>
                  Create your first business to get started
                </div>
              </div>
            ) : (
              businesses.map(business => {
              const isActive = currentBusinessId === business.id;
              return (
                <button
                  key={business.id}
                  onClick={() => handleSwitch(business.id)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    textAlign: 'left',
                    border: 'none',
                    background: isActive
                      ? 'rgba(59, 130, 246, 0.15)'
                      : 'transparent',
                    cursor: 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.15s ease',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                    color: 'rgba(255, 255, 255, 0.95)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isActive
                      ? 'rgba(59, 130, 246, 0.15)'
                      : 'transparent';
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: isActive
                      ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
                      : 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    flexShrink: 0,
                    border: isActive ? '2px solid rgba(59, 130, 246, 0.3)' : 'none'
                  }}>
                    🏢
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: isActive ? '600' : '500',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {business.name}
                    </div>
                    {business.type && (
                      <div style={{
                        fontSize: '12px',
                        color: 'rgba(255, 255, 255, 0.4)',
                        marginTop: '2px'
                      }}>
                        {business.type}
                      </div>
                    )}
                  </div>
                  {isActive && (
                    <span style={{
                      color: '#3b82f6',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}>
                      ✓
                    </span>
                  )}
                  {business.active === false && (
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      background: 'rgba(239, 68, 68, 0.2)',
                      color: '#ef4444',
                      borderRadius: '4px',
                      fontWeight: '600'
                    }}>
                      Inactive
                    </span>
                  )}
                </button>
              );
            })
            )}
          </div>

          <button
            onClick={handleCreateBusiness}
            style={{
              width: '100%',
              padding: '14px 16px',
              textAlign: 'center',
              border: 'none',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              color: '#3b82f6',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)';
            }}
          >
            <span style={{ fontSize: '18px' }}>+</span>
            Create New Business
          </button>
        </div>
      )}
    </div>
  );
}
