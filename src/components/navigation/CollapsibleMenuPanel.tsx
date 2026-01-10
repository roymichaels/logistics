import React, { useEffect, useState } from 'react';
import { colors } from '../../styles/design-system';
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
  defaultOpen?: boolean;
}

interface CollapsibleMenuPanelProps {
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

export function CollapsibleMenuPanel({
  isOpen,
  onClose,
  items,
  categories = [],
  currentPath,
  onNavigate,
  title = 'תפריט',
  user,
  onLogout,
}: CollapsibleMenuPanelProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.filter(c => c.defaultOpen).map(c => c.id))
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

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleNavigate = (path: string, disabled?: boolean, disabledMessage?: string) => {
    if (disabled) {
      alert(disabledMessage || 'אנא בחר עסק כדי לגשת לתכונה זו');
      return;
    }
    onNavigate(path);
    onClose();
  };

  // Group items by category
  const categorizedItems: { [key: string]: MenuItemConfig[] } = {};
  const uncategorizedItems: MenuItemConfig[] = [];

  items.forEach(item => {
    if (item.category) {
      if (!categorizedItems[item.category]) {
        categorizedItems[item.category] = [];
      }
      categorizedItems[item.category].push(item);
    } else {
      uncategorizedItems.push(item);
    }
  });

  const renderMenuItem = (item: MenuItemConfig) => (
    <button
      key={item.id}
      onClick={() => handleNavigate(item.path, item.disabled, item.disabledMessage)}
      title={item.disabled ? (item.disabledMessage || 'בחר עסק כדי לגשת') : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 16px',
        marginLeft: item.category ? '12px' : '0',
        borderRadius: '10px',
        border: 'none',
        backgroundColor: isActive(item.path)
          ? 'rgba(29, 161, 242, 0.15)'
          : 'transparent',
        color: item.disabled
          ? 'rgba(255, 255, 255, 0.3)'
          : isActive(item.path)
          ? colors.brand.primary
          : colors.text.secondary,
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
          e.currentTarget.style.backgroundColor = 'rgba(29, 161, 242, 0.1)';
          e.currentTarget.style.color = colors.text.primary;
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive(item.path) && !item.disabled) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = colors.text.secondary;
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
            backgroundColor: colors.brand.primary,
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
  );

  const renderCategory = (category: MenuCategory) => {
    const categoryItems = categorizedItems[category.id] || [];
    const isExpanded = expandedCategories.has(category.id);
    const hasActiveItem = categoryItems.some(item => isActive(item.path));

    return (
      <div key={category.id} style={{ marginBottom: '4px' }}>
        <button
          onClick={() => toggleCategory(category.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '12px 16px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: hasActiveItem || isExpanded
              ? 'rgba(29, 161, 242, 0.1)'
              : 'transparent',
            color: hasActiveItem ? colors.brand.primary : colors.text.primary,
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            textAlign: 'right',
          }}
          onMouseEnter={(e) => {
            if (!hasActiveItem && !isExpanded) {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            }
          }}
          onMouseLeave={(e) => {
            if (!hasActiveItem && !isExpanded) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '18px' }}>{category.icon}</span>
            <span>{category.label}</span>
            <span style={{
              fontSize: '11px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              padding: '2px 6px',
              borderRadius: '10px',
              color: colors.text.tertiary
            }}>
              {categoryItems.length}
            </span>
          </div>
          <span style={{
            fontSize: '12px',
            transition: 'transform 0.2s ease',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
          }}>
            ▼
          </span>
        </button>
        {isExpanded && (
          <div style={{
            marginTop: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            paddingLeft: '4px'
          }}>
            {categoryItems.map(renderMenuItem)}
          </div>
        )}
      </div>
    );
  };

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
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
          width: '360px',
          maxWidth: 'calc(100vw - 32px)',
          backgroundColor: 'rgba(18, 18, 20, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '18px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5), 0 0 1px rgba(29, 161, 242, 0.3)',
          zIndex: 10001,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          direction: 'rtl',
          border: '1px solid rgba(56, 68, 77, 0.6)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(56, 68, 77, 0.6)',
            backgroundColor: 'rgba(10, 10, 12, 0.5)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '700',
              color: colors.text.primary,
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
              border: '1px solid rgba(56, 68, 77, 0.6)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: colors.text.secondary,
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(29, 161, 242, 0.1)';
              e.currentTarget.style.color = colors.brand.primary;
              e.currentTarget.style.borderColor = colors.brand.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.color = colors.text.secondary;
              e.currentTarget.style.borderColor = 'rgba(56, 68, 77, 0.6)';
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {/* Render uncategorized items first */}
          {uncategorizedItems.map(renderMenuItem)}

          {/* Render categories with their items */}
          {categories.map(renderCategory)}

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
