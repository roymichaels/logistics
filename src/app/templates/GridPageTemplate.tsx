import React, { useState } from 'react';
import { Box, Typography, Button, Grid, Chip, Spinner } from '@/components/atoms';
import { SearchBar, EmptyState } from '@/components/molecules';

export type GridLayout = 'compact' | 'comfortable' | 'spacious';
export type ViewMode = 'grid' | 'list';

export interface GridPageTemplateProps<T> {
  title: string;
  actions?: React.ReactNode;
  items: T[];
  renderCard: (item: T) => React.ReactNode;
  emptyState: React.ReactNode;

  // Search & Filter
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  filterChips?: Array<{ label: string; active: boolean; onClick: () => void }>;

  // View Options
  defaultLayout?: GridLayout;
  allowLayoutChange?: boolean;
  allowViewModeChange?: boolean;
  defaultViewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;

  // Grid Configuration
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };

  // Pagination
  totalItems?: number;
  itemsPerPage?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onLoadMore?: () => void;
  infiniteScroll?: boolean;

  // Loading
  loading?: boolean;
  loadingMore?: boolean;
}

export function GridPageTemplate<T>({
  title,
  actions,
  items,
  renderCard,
  emptyState,
  searchable = true,
  searchPlaceholder = 'Search...',
  onSearch,
  filterChips = [],
  defaultLayout = 'comfortable',
  allowLayoutChange = true,
  allowViewModeChange = false,
  defaultViewMode = 'grid',
  onViewModeChange,
  columns = { mobile: 2, tablet: 3, desktop: 4 },
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange,
  onLoadMore,
  infiniteScroll = false,
  loading = false,
  loadingMore = false,
}: GridPageTemplateProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [layout, setLayout] = useState<GridLayout>(defaultLayout);
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    onViewModeChange?.(mode);
  };

  const gridGap = layout === 'compact' ? 12 : layout === 'comfortable' ? 16 : 24;
  const activeFilters = filterChips.filter(chip => chip.active);

  return (
    <Box className="grid-page-template">
      {/* Header */}
      <Box style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <Typography variant="h1">{title}</Typography>
        {actions && <Box>{actions}</Box>}
      </Box>

      {/* Toolbar */}
      <Box style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '16px',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {/* Search */}
        {searchable && (
          <Box style={{ flex: 1, minWidth: '200px', maxWidth: '400px' }}>
            <SearchBar
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={handleSearch}
            />
          </Box>
        )}

        {/* View Controls */}
        <Box style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {allowViewModeChange && (
            <Box style={{ display: 'flex', gap: '4px', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '4px' }}>
              <Button
                size="small"
                variant={viewMode === 'grid' ? 'primary' : 'text'}
                onClick={() => handleViewModeChange('grid')}
              >
                ⊞ Grid
              </Button>
              <Button
                size="small"
                variant={viewMode === 'list' ? 'primary' : 'text'}
                onClick={() => handleViewModeChange('list')}
              >
                ≡ List
              </Button>
            </Box>
          )}

          {allowLayoutChange && viewMode === 'grid' && (
            <select
              value={layout}
              onChange={(e) => setLayout(e.target.value as GridLayout)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                fontSize: '14px'
              }}
            >
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable</option>
              <option value="spacious">Spacious</option>
            </select>
          )}
        </Box>
      </Box>

      {/* Filter Chips */}
      {filterChips.length > 0 && (
        <Box style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          marginBottom: '16px'
        }}>
          {filterChips.map((chip, index) => (
            <Chip
              key={index}
              label={chip.label}
              onClick={chip.onClick}
              variant={chip.active ? 'primary' : 'secondary'}
            />
          ))}
          {activeFilters.length > 0 && (
            <Button
              variant="text"
              size="small"
              onClick={() => filterChips.forEach(c => c.active && c.onClick())}
            >
              Clear All
            </Button>
          )}
        </Box>
      )}

      {/* Grid Content */}
      {loading ? (
        <Box style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Spinner size="large" />
        </Box>
      ) : items.length === 0 ? (
        emptyState
      ) : viewMode === 'grid' ? (
        <Grid
          columns={columns}
          gap={gridGap}
        >
          {items.map((item, index) => (
            <Box key={index}>
              {renderCard(item)}
            </Box>
          ))}
        </Grid>
      ) : (
        <Box style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {items.map((item, index) => (
            <Box key={index}>
              {renderCard(item)}
            </Box>
          ))}
        </Box>
      )}

      {/* Loading More */}
      {loadingMore && (
        <Box style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
          <Spinner />
        </Box>
      )}

      {/* Pagination or Load More */}
      {!loading && items.length > 0 && (
        <>
          {infiniteScroll && onLoadMore && !loadingMore && (
            <Box style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
              <Button onClick={onLoadMore}>
                Load More
              </Button>
            </Box>
          )}

          {!infiniteScroll && totalItems && itemsPerPage && currentPage && onPageChange && (
            <Box style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '12px',
              marginTop: '32px'
            }}>
              <Button
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
              >
                ← Previous
              </Button>
              <Typography>
                Page {currentPage} of {Math.ceil(totalItems / itemsPerPage)}
              </Typography>
              <Button
                disabled={currentPage === Math.ceil(totalItems / itemsPerPage)}
                onClick={() => onPageChange(currentPage + 1)}
              >
                Next →
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
