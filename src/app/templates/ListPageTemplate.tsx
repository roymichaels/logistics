import React from 'react';
import { colors, spacing } from '../../design-system';

export interface Filter {
  id: string;
  label: string;
  value: string;
}

export interface SortOption {
  id: string;
  label: string;
  value: string;
}

export interface FilterConfig {
  filters: Filter[];
  activeFilter: string;
  onFilterChange: (filterId: string) => void;
}

export interface ListPageTemplateProps {
  title: string;
  subtitle?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filterConfig?: FilterConfig;
  headerActions?: React.ReactNode;
  emptyState?: React.ReactNode;
  loading?: boolean;
  children: React.ReactNode;
}

export function ListPageTemplate({
  title,
  subtitle,
  searchPlaceholder = 'Search...',
  searchValue = '',
  onSearchChange,
  filterConfig,
  headerActions,
  emptyState,
  loading,
  children,
}: ListPageTemplateProps) {
  const containerStyles: React.CSSProperties = {
    minHeight: '100vh',
    background: colors.background.primary,
    color: colors.text.primary,
  };

  const headerStyles: React.CSSProperties = {
    padding: spacing[6],
    borderBottom: `1px solid ${colors.border.primary}`,
    background: colors.background.secondary,
  };

  const headerTopStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  };

  const searchBarStyles: React.CSSProperties = {
    width: '100%',
    maxWidth: '500px',
    padding: spacing[3],
    background: colors.background.primary,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: '8px',
    color: colors.text.primary,
    fontSize: '15px',
    outline: 'none',
  };

  const filterContainerStyles: React.CSSProperties = {
    display: 'flex',
    gap: spacing[2],
    marginTop: spacing[3],
    overflowX: 'auto',
  };

  const filterButtonStyles = (active: boolean): React.CSSProperties => ({
    padding: `${spacing[2]} ${spacing[4]}`,
    background: active ? colors.brand.primary : 'transparent',
    border: `1px solid ${active ? colors.brand.primary : colors.border.primary}`,
    borderRadius: '20px',
    color: active ? colors.white : colors.text.primary,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    fontSize: '14px',
    fontWeight: active ? '600' : '400',
  });

  const contentStyles: React.CSSProperties = {
    padding: spacing[6],
    maxWidth: '1280px',
    margin: '0 auto',
  };

  return (
    <div style={containerStyles}>
      <header style={headerStyles}>
        <div style={headerTopStyles}>
          <div style={{ flex: 1 }}>
            <h1
              style={{
                fontSize: '32px',
                fontWeight: '700',
                margin: 0,
                color: colors.text.primary,
              }}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                style={{
                  fontSize: '16px',
                  color: colors.text.secondary,
                  margin: `${spacing[2]} 0 0 0`,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>

          {headerActions && <div>{headerActions}</div>}
        </div>

        {onSearchChange && (
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            style={searchBarStyles}
          />
        )}

        {filterConfig && (
          <div style={filterContainerStyles}>
            {filterConfig.filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => filterConfig.onFilterChange(filter.id)}
                style={filterButtonStyles(filter.id === filterConfig.activeFilter)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}
      </header>

      <main style={contentStyles}>
        {loading && (
          <div style={{ textAlign: 'center', padding: spacing[8], color: colors.text.secondary }}>
            Loading...
          </div>
        )}

        {!loading && !children && emptyState}

        {!loading && children}
      </main>
    </div>
  );
}
