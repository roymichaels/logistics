import React from 'react';
import { BaseShell } from './BaseShell';
import { useShellContext } from './BaseShell';
import { colors, spacing, shadows, borderRadius, typography, navigation, transitions } from '../design-system';
import { ShoppingCart } from 'lucide-react';
import { useI18n } from '../lib/i18n';

interface StoreShellProps {
  children: React.ReactNode;
  onNavigate: (path: string) => void;
  onLogout?: () => void;
  currentPath: string;
  isAuthenticated?: boolean;
  cartItemCount?: number;
}

function StoreShellContent({ children, isAuthenticated, cartItemCount }: { children: React.ReactNode; isAuthenticated?: boolean; cartItemCount?: number }) {
  const { navigationItems, onNavigate, currentPath, onLogout } = useShellContext();
  const { t, isRTL } = useI18n();

  return (
    <div
      className="layout-shell prevent-overflow"
      style={{
        background: colors.background.primary,
        direction: isRTL ? 'rtl' : 'ltr',
      }}
    >
      <header
        className="layout-shell__header"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: navigation.background,
          backdropFilter: navigation.backdropFilter,
          WebkitBackdropFilter: navigation.backdropFilter,
          borderBottom: `1px solid ${navigation.border}`,
          padding: 'var(--spacing-md)',
          boxShadow: shadows.md,
        }}
      >
        <div className="layout-container" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
            <div style={{
              width: 40,
              height: 40,
              background: colors.brand.faded,
              borderRadius: borderRadius.lg,
              display: 'grid',
              placeItems: 'center',
              fontWeight: typography.fontWeight.bold,
              fontSize: typography.fontSize.xl,
              color: colors.brand.primary,
            }}>
              🛍️
            </div>
            <div className="tablet-up">
              <h1 style={{
                margin: 0,
                fontSize: typography.fontSize['2xl'],
                fontWeight: typography.fontWeight.heavy,
                color: colors.text.primary,
                letterSpacing: '-0.01em',
              }}>
                {isRTL ? 'חנות' : 'Store'}
              </h1>
              <p style={{
                margin: 0,
                fontSize: typography.fontSize.sm,
                color: colors.text.tertiary,
              }}>
                {isRTL ? 'עיין בקטלוג המוצרים' : 'Browse our catalog'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: spacing.md, alignItems: 'center' }}>
            {cartItemCount !== undefined && (
              <button
                onClick={() => onNavigate('/store/cart')}
                style={{
                  position: 'relative',
                  padding: `${spacing.sm} ${spacing.lg}`,
                  background: colors.brand.faded,
                  color: colors.brand.primary,
                  border: `1px solid ${colors.brand.primary}`,
                  borderRadius: borderRadius['2xl'],
                  cursor: 'pointer',
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  transition: transitions.fast,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.brand.primary;
                  e.currentTarget.style.color = colors.white;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = shadows.glow;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = colors.brand.faded;
                  e.currentTarget.style.color = colors.brand.primary;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <ShoppingCart size={18} />
                <span className="tablet-up">{isRTL ? 'עגלה' : 'Cart'}</span>
                {cartItemCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: -8,
                    ...(isRTL ? { left: -8 } : { right: -8 }),
                    background: colors.status.error,
                    color: colors.white,
                    borderRadius: borderRadius.full,
                    width: 24,
                    height: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.bold,
                    boxShadow: shadows.md,
                  }}>
                    {cartItemCount}
                  </span>
                )}
              </button>
            )}
            {isAuthenticated && (
              <button
                onClick={onLogout}
                className="tablet-up"
                style={{
                  padding: `${spacing.sm} ${spacing.lg}`,
                  background: colors.ui.card,
                  color: colors.text.secondary,
                  border: `1px solid ${colors.border.primary}`,
                  borderRadius: borderRadius['2xl'],
                  cursor: 'pointer',
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  transition: transitions.fast,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.ui.cardHover;
                  e.currentTarget.style.color = colors.text.primary;
                  e.currentTarget.style.borderColor = colors.border.hover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = colors.ui.card;
                  e.currentTarget.style.color = colors.text.secondary;
                  e.currentTarget.style.borderColor = colors.border.primary;
                }}
              >
                {t('header', 'logout')}
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="layout-shell__content layout-with-sidebar">
        <nav
          className="layout-sidebar desktop-only"
          style={{
            background: colors.background.secondary,
            ...(isRTL
              ? { borderLeft: `1px solid ${colors.border.secondary}` }
              : { borderRight: `1px solid ${colors.border.secondary}` }
            ),
            padding: 'var(--spacing-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: spacing.xs,
          }}
        >
          {navigationItems
            .filter(item => !item.requiredRoles || item.requiredRoles.includes('customer') || item.requiredRoles.includes('user'))
            .map(item => {
              const isActive = currentPath.startsWith(item.path);
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.md,
                    width: '100%',
                    padding: `${spacing.md} ${spacing.lg}`,
                    background: isActive ? colors.brand.faded : 'transparent',
                    color: isActive ? colors.brand.primary : colors.text.secondary,
                    border: 'none',
                    borderRadius: borderRadius.lg,
                    cursor: 'pointer',
                    fontSize: typography.fontSize.sm,
                    fontWeight: isActive ? typography.fontWeight.semibold : typography.fontWeight.normal,
                    textAlign: 'left',
                    transition: transitions.fast,
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = colors.ui.cardHover;
                      e.currentTarget.style.color = colors.text.primary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = colors.text.secondary;
                    }
                  }}
                >
                  {isActive && (
                    <div style={{
                      position: 'absolute',
                      ...(isRTL ? { right: 0 } : { left: 0 }),
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 3,
                      height: '60%',
                      background: colors.brand.primary,
                      borderRadius: borderRadius.sm,
                    }} />
                  )}
                  <span style={{ fontSize: typography.fontSize.lg }}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
        </nav>

        <main className="layout-shell__main layout-sidebar-content" style={{
          background: colors.background.primary,
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}

export function StoreShell({
  children,
  onNavigate,
  onLogout,
  currentPath,
  isAuthenticated,
  cartItemCount
}: StoreShellProps) {
  const { isRTL } = useI18n();

  return (
    <BaseShell
      role={isAuthenticated ? 'customer' : 'user'}
      currentPath={currentPath}
      onNavigate={onNavigate}
      onLogout={onLogout || (() => {})}
      title={isRTL ? 'חנות' : 'Store'}
    >
      <StoreShellContent isAuthenticated={isAuthenticated} cartItemCount={cartItemCount}>
        {children}
      </StoreShellContent>
    </BaseShell>
  );
}
