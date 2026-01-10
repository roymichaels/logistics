import React, { useEffect, useState } from 'react';
import { ProfileDropdown } from './ProfileDropdown';

export interface MenuItemConfig {
  id: string;
  label: string;
  icon: string;
  path: string;
  disabled?: boolean;
  disabledMessage?: string;
  requiresBusinessContext?: boolean;
  category?: string;
}

export interface MenuCategory {
  id: string;
  label: string;
  icon: string;
  defaultOpen: boolean;
}

interface UnifiedMenuPanelProps {
  isOpen: boolean;
  onClose: () => void;
  items: MenuItemConfig[];
  categories?: MenuCategory[];
  currentPath: string;
  onNavigate: (path: string) => void;
  title?: string;
  user?: any;
  onLogout?: () => void;
}

export function UnifiedMenuPanel({
  isOpen,
  onClose,
  items,
  categories,
  currentPath,
  onNavigate,
  title = 'תפריט',
  user,
  onLogout,
}: UnifiedMenuPanelProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories?.filter(c => c.defaultOpen).map(c => c.id) || [])
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isActive = (itemPath: string) => {
    return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
  };

  const handleNavigate = (path: string, disabled?: boolean, disabledMessage?: string) => {
    if (disabled) {
      alert(disabledMessage || 'אנא בחר עסק כדי לגשת לתכונה זו');
      return;
    }
    onNavigate(path);
    onClose();
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const groupedItems = categories
    ? categories.map(category => ({
        category,
        items: items.filter(item => item.category === category.id)
      }))
    : null;

  const uncategorizedItems = categories
    ? items.filter(item => !item.category)
    : items;

  return (
    <>
      <style>{`
        .desktop-profile-dropdown {
          display: none;
        }

        @media (min-width: 768px) {
          .desktop-profile-dropdown {
            display: block;
          }
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          zIndex: 10000,
          backdropFilter: 'blur(4px)',
          transition: 'opacity 0.2s ease-in-out',
          opacity: isOpen ? 1 : 0,
        }}
        onClick={onClose}
      />

      <div
        style={{
          position: 'fixed',
          top: '5%',
          bottom: '5%',
          right: '16px',
          width: '340px',
          maxWidth: 'calc(100vw - 32px)',
          backgroundColor: 'rgba(18, 18, 20, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '18px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4), 0 0 1px rgba(255, 255, 255, 0.1)',
          zIndex: 10001,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          direction: 'rtl',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            backgroundColor: 'rgba(10, 10, 12, 0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '600',
              color: 'rgba(255, 255, 255, 0.95)',
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </h2>
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
              flexShrink: 0,
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
            flex: 1,
            overflow: 'auto',
            padding: '12px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {uncategorizedItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.path, item.disabled, item.disabledMessage)}
              title={item.disabled ? (item.disabledMessage || 'בחר עסק כדי לגשת') : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: isActive(item.path)
                  ? 'rgba(59, 130, 246, 0.15)'
                  : 'transparent',
                color: item.disabled
                  ? 'rgba(255, 255, 255, 0.3)'
                  : isActive(item.path)
                  ? '#60a5fa'
                  : 'rgba(255, 255, 255, 0.7)',
                fontSize: '14px',
                fontWeight: isActive(item.path) ? '600' : '500',
                cursor: item.disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'right',
                position: 'relative',
                opacity: item.disabled ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isActive(item.path) && !item.disabled) {
                  e.currentTarget.style.backgroundColor =
                    'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.95)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(item.path) && !item.disabled) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                }
              }}
            >
              {isActive(item.path) && (
                <div
                  style={{
                    position: 'absolute',
                    right: '0',
                    width: '3px',
                    height: '60%',
                    backgroundColor: '#60a5fa',
                    borderRadius: '2px 0 0 2px',
                  }}
                />
              )}
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.disabled && (
                <span style={{ fontSize: '14px', opacity: 0.5 }}>🔒</span>
              )}
            </button>
          ))}

          {groupedItems?.map(({ category, items: categoryItems }) => (
            <div key={category.id} style={{ marginBottom: '8px' }}>
              <button
                onClick={() => toggleCategory(category.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'right',
                  marginBottom: expandedCategories.has(category.id) ? '4px' : '0',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                }}
              >
                <span style={{ fontSize: '16px' }}>{category.icon}</span>
                <span style={{ flex: 1 }}>{category.label}</span>
                <span style={{
                  fontSize: '12px',
                  transition: 'transform 0.2s ease',
                  transform: expandedCategories.has(category.id) ? 'rotate(180deg)' : 'rotate(0deg)'
                }}>
                  ▼
                </span>
              </button>

              {expandedCategories.has(category.id) && categoryItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.path, item.disabled, item.disabledMessage)}
                  title={item.disabled ? (item.disabledMessage || 'בחר עסק כדי לגשת') : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px 12px 28px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: isActive(item.path)
                      ? 'rgba(59, 130, 246, 0.15)'
                      : 'transparent',
                    color: item.disabled
                      ? 'rgba(255, 255, 255, 0.3)'
                      : isActive(item.path)
                      ? '#60a5fa'
                      : 'rgba(255, 255, 255, 0.7)',
                    fontSize: '14px',
                    fontWeight: isActive(item.path) ? '600' : '500',
                    cursor: item.disabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'right',
                    position: 'relative',
                    opacity: item.disabled ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive(item.path) && !item.disabled) {
                      e.currentTarget.style.backgroundColor =
                        'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.95)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive(item.path) && !item.disabled) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                    }
                  }}
                >
                  {isActive(item.path) && (
                    <div
                      style={{
                        position: 'absolute',
                        right: '0',
                        width: '3px',
                        height: '60%',
                        backgroundColor: '#60a5fa',
                        borderRadius: '2px 0 0 2px',
                      }}
                    />
                  )}
                  <span style={{ fontSize: '18px' }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.disabled && (
                    <span style={{ fontSize: '14px', opacity: 0.5 }}>🔒</span>
                  )}
                </button>
              ))}
            </div>
          ))}

          {/* Profile dropdown at the bottom - desktop only */}
          {user && onLogout && (
            <div className="desktop-profile-dropdown" style={{ marginTop: 'auto', paddingTop: '12px' }}>
              <ProfileDropdown
                user={user}
                onNavigate={(path) => {
                  onNavigate(path);
                  onClose();
                }}
                onLogout={onLogout}
                compact={false}
                position="left"
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
