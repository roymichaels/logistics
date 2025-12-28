import React from 'react';
import { useNavigation } from '../../contexts/NavigationContext';
import { colors, spacing } from '../../design-system';

interface DynamicNavigationMenuProps {
  variant?: 'sidebar' | 'bottom' | 'tabs';
  onNavigate?: (path: string) => void;
}

export function DynamicNavigationMenu({
  variant = 'sidebar',
  onNavigate,
}: DynamicNavigationMenuProps) {
  const { availableRoutes, currentPath, navigate } = useNavigation();

  const handleNavigation = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  const isActive = (path: string) => {
    return currentPath === path || currentPath.startsWith(path + '/');
  };

  if (variant === 'sidebar') {
    return (
      <nav
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing[1],
          padding: spacing[2],
          direction: 'rtl',
        }}
      >
        {availableRoutes.map((route) => (
          <button
            key={route.path}
            onClick={() => handleNavigation(route.path)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2],
              padding: `${spacing[2]} ${spacing[3]}`,
              backgroundColor: isActive(route.path)
                ? colors.brand.faded
                : 'transparent',
              color: isActive(route.path) ? colors.brand.primary : colors.text.primary,
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: isActive(route.path) ? 600 : 500,
              cursor: 'pointer',
              transition: 'all 150ms ease-in-out',
              textAlign: 'right',
            }}
            onMouseEnter={(e) => {
              if (!isActive(route.path)) {
                e.currentTarget.style.backgroundColor = colors.background.tertiary;
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive(route.path)) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            {route.icon && <span style={{ fontSize: '18px' }}>{route.icon}</span>}
            <span>{route.label}</span>
          </button>
        ))}
      </nav>
    );
  }

  if (variant === 'bottom') {
    return (
      <nav
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: spacing[2],
          backgroundColor: colors.background.primary,
          borderTop: `1px solid ${colors.border.primary}`,
          direction: 'rtl',
        }}
      >
        {availableRoutes.slice(0, 5).map((route) => (
          <button
            key={route.path}
            onClick={() => handleNavigation(route.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: spacing[1],
              padding: spacing[2],
              backgroundColor: 'transparent',
              color: isActive(route.path) ? colors.brand.primary : colors.text.tertiary,
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: isActive(route.path) ? 600 : 500,
              cursor: 'pointer',
              transition: 'all 150ms ease-in-out',
              flex: 1,
              minWidth: 0,
            }}
          >
            {route.icon && (
              <span style={{ fontSize: '24px', lineHeight: 1 }}>{route.icon}</span>
            )}
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100%',
              }}
            >
              {route.label}
            </span>
          </button>
        ))}
      </nav>
    );
  }

  if (variant === 'tabs') {
    return (
      <nav
        style={{
          display: 'flex',
          gap: spacing[2],
          padding: spacing[2],
          borderBottom: `1px solid ${colors.border.primary}`,
          overflowX: 'auto',
          direction: 'rtl',
        }}
      >
        {availableRoutes.map((route) => (
          <button
            key={route.path}
            onClick={() => handleNavigation(route.path)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2],
              padding: `${spacing[2]} ${spacing[3]}`,
              backgroundColor: 'transparent',
              color: isActive(route.path) ? colors.brand.primary : colors.text.primary,
              border: 'none',
              borderBottom: isActive(route.path)
                ? `2px solid ${colors.brand.primary}`
                : '2px solid transparent',
              fontSize: '14px',
              fontWeight: isActive(route.path) ? 600 : 500,
              cursor: 'pointer',
              transition: 'all 150ms ease-in-out',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              if (!isActive(route.path)) {
                e.currentTarget.style.color = colors.text.primary;
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive(route.path)) {
                e.currentTarget.style.color = colors.text.secondary;
              }
            }}
          >
            {route.icon && <span style={{ fontSize: '18px' }}>{route.icon}</span>}
            <span>{route.label}</span>
          </button>
        ))}
      </nav>
    );
  }

  return null;
}
