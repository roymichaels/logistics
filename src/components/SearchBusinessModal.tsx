import React, { useState, useEffect } from 'react';
import { ROYAL_COLORS } from '../styles/royalTheme';
import { listBusinesses, type BusinessRecord } from '../services/business';
import { Toast } from './Toast';
import { telegram } from '../lib/telegram';

interface SearchBusinessModalProps {
  onClose: () => void;
  onBusinessSelected?: (businessId: string) => void;
}

export function SearchBusinessModal({ onClose, onBusinessSelected }: SearchBusinessModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [businesses, setBusinesses] = useState<BusinessRecord[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<BusinessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessRecord | null>(null);

  useEffect(() => {
    loadBusinesses();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredBusinesses(businesses);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = businesses.filter(
        (b) =>
          b.name.toLowerCase().includes(query) ||
          b.name_hebrew?.toLowerCase().includes(query) ||
          b.business_type?.toLowerCase().includes(query)
      );
      setFilteredBusinesses(filtered);
    }
  }, [searchQuery, businesses]);

  const loadBusinesses = async () => {
    try {
      setLoading(true);
      const data = await listBusinesses({ activeOnly: true });
      setBusinesses(data);
      setFilteredBusinesses(data);
    } catch (error) {
      console.error('Failed to load businesses:', error);
      Toast.error('שגיאה בטעינת רשימת העסקים');
    } finally {
      setLoading(false);
    }
  };

  const handleBusinessClick = (business: BusinessRecord) => {
    setSelectedBusiness(business);
  };

  const handleRequestToJoin = async () => {
    if (!selectedBusiness) return;

    try {
      telegram.hapticFeedback('impact', 'medium');
      Toast.info('שולח בקשה להצטרפות...');

      if (onBusinessSelected) {
        onBusinessSelected(selectedBusiness.id);
      }

      Toast.success(`בקשה נשלחה להצטרפות ל${selectedBusiness.name_hebrew || selectedBusiness.name}`);
      onClose();
    } catch (error) {
      console.error('Failed to request joining business:', error);
      Toast.error('שגיאה בשליחת הבקשה');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div
        style={{
          background: ROYAL_COLORS.cardBg,
          border: `1px solid ${ROYAL_COLORS.border}`,
          borderRadius: '20px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: ROYAL_COLORS.glowPrimaryStrong,
          animation: 'slideUp 0.3s ease-out',
          direction: 'rtl'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px',
            borderBottom: `1px solid ${ROYAL_COLORS.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '32px' }}>🔍</div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '24px',
                  fontWeight: '700',
                  color: ROYAL_COLORS.text
                }}
              >
                חפש עסק
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: '14px',
                  color: ROYAL_COLORS.muted,
                  marginTop: '4px'
                }}
              >
                מצא והצטרף לעסקים קיימים
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '28px',
              cursor: 'pointer',
              color: ROYAL_COLORS.muted,
              padding: '4px',
              lineHeight: 1,
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = ROYAL_COLORS.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = ROYAL_COLORS.muted;
            }}
          >
            ×
          </button>
        </div>

        {/* Search Input */}
        <div style={{ padding: '20px', borderBottom: `1px solid ${ROYAL_COLORS.border}` }}>
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <span
              style={{
                position: 'absolute',
                right: '16px',
                fontSize: '20px',
                pointerEvents: 'none'
              }}
            >
              🔍
            </span>
            <input
              type="text"
              placeholder="חפש לפי שם עסק או סוג..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '14px 48px 14px 16px',
                background: ROYAL_COLORS.secondary,
                border: `1px solid ${ROYAL_COLORS.cardBorder}`,
                borderRadius: '12px',
                color: ROYAL_COLORS.text,
                fontSize: '15px',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = ROYAL_COLORS.primary;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = ROYAL_COLORS.cardBorder;
              }}
            />
          </div>
        </div>

        {/* Business List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px'
          }}
        >
          {loading ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
                color: ROYAL_COLORS.muted
              }}
            >
              טוען...
            </div>
          ) : filteredBusinesses.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px',
                color: ROYAL_COLORS.muted
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
              <p style={{ margin: 0, fontSize: '16px' }}>
                {searchQuery ? 'לא נמצאו עסקים תואמים' : 'אין עסקים זמינים'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredBusinesses.map((business) => {
                const isSelected = selectedBusiness?.id === business.id;
                return (
                  <div
                    key={business.id}
                    onClick={() => handleBusinessClick(business)}
                    style={{
                      padding: '16px',
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(29, 155, 240, 0.2), rgba(29, 155, 240, 0.1))'
                        : ROYAL_COLORS.secondary,
                      border: isSelected
                        ? `2px solid ${ROYAL_COLORS.primary}`
                        : `1px solid ${ROYAL_COLORS.cardBorder}`,
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = ROYAL_COLORS.cardBorderHover;
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = ROYAL_COLORS.cardBorder;
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {isSelected && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '12px',
                          left: '12px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: ROYAL_COLORS.primary,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          color: '#fff',
                          fontWeight: '700'
                        }}
                      >
                        ✓
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '12px',
                          background: `linear-gradient(135deg, ${business.primary_color || ROYAL_COLORS.primary}, ${business.secondary_color || ROYAL_COLORS.accent})`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '24px',
                          color: '#fff',
                          fontWeight: '700'
                        }}
                      >
                        🏢
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: '18px',
                            fontWeight: '600',
                            color: ROYAL_COLORS.text,
                            marginBottom: '4px'
                          }}
                        >
                          {business.name_hebrew || business.name}
                        </h3>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '13px',
                            color: ROYAL_COLORS.muted
                          }}
                        >
                          {business.business_type && (
                            <span
                              style={{
                                padding: '2px 8px',
                                background: 'rgba(29, 155, 240, 0.2)',
                                borderRadius: '6px',
                                fontSize: '12px'
                              }}
                            >
                              {business.business_type}
                            </span>
                          )}
                          <span>{business.name}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '20px',
            borderTop: `1px solid ${ROYAL_COLORS.border}`,
            display: 'flex',
            gap: '12px'
          }}
        >
          <button
            onClick={handleRequestToJoin}
            disabled={!selectedBusiness}
            style={{
              flex: 1,
              padding: '14px',
              background: selectedBusiness
                ? 'linear-gradient(120deg, #1D9BF0, #f6c945)'
                : ROYAL_COLORS.secondary,
              border: 'none',
              borderRadius: '12px',
              color: selectedBusiness ? '#ffffff' : ROYAL_COLORS.hint,
              fontSize: '16px',
              fontWeight: '600',
              cursor: selectedBusiness ? 'pointer' : 'not-allowed',
              opacity: selectedBusiness ? 1 : 0.5,
              transition: 'all 0.2s ease',
              fontFamily: 'inherit'
            }}
            onMouseEnter={(e) => {
              if (selectedBusiness) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(29, 155, 240, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedBusiness) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            בקש להצטרף
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '14px 24px',
              background: 'transparent',
              border: `1px solid ${ROYAL_COLORS.border}`,
              borderRadius: '12px',
              color: ROYAL_COLORS.muted,
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: 'inherit'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = ROYAL_COLORS.cardBorderHover;
              e.currentTarget.style.color = ROYAL_COLORS.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = ROYAL_COLORS.border;
              e.currentTarget.style.color = ROYAL_COLORS.muted;
            }}
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
