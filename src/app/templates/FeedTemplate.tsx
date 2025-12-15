import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Button, Spinner } from '@/components/atoms';
import { EmptyState } from '@/components/molecules';

export interface FeedItem {
  id: string;
  [key: string]: any;
}

export interface FeedTemplateProps {
  title?: string;
  actions?: React.ReactNode;
  items: FeedItem[];
  renderItem: (item: FeedItem) => React.ReactNode;
  emptyState: React.ReactNode;

  // Composer (for creating new posts/items)
  composer?: React.ReactNode;
  composerPosition?: 'top' | 'bottom' | 'fixed';

  // Loading States
  loading?: boolean;
  loadingMore?: boolean;
  refreshing?: boolean;

  // Infinite Scroll
  onLoadMore?: () => void;
  hasMore?: boolean;

  // Pull to Refresh
  onRefresh?: () => void;

  // Filters/Tabs
  filters?: Array<{ label: string; active: boolean; onClick: () => void }>;

  // Sidebar (for trends, suggestions, etc.)
  sidebar?: React.ReactNode;
}

export const FeedTemplate: React.FC<FeedTemplateProps> = ({
  title,
  actions,
  items,
  renderItem,
  emptyState,
  composer,
  composerPosition = 'top',
  loading = false,
  loadingMore = false,
  refreshing = false,
  onLoadMore,
  hasMore = true,
  onRefresh,
  filters = [],
  sidebar,
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Intersection Observer for Infinite Scroll
  useEffect(() => {
    if (!onLoadMore || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [onLoadMore, hasMore, loadingMore]);

  // Pull to Refresh
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!onRefresh || feedRef.current?.scrollTop !== 0) return;
    const touch = e.touches[0];
    feedRef.current?.setAttribute('data-touch-start', String(touch.clientY));
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!onRefresh || !feedRef.current) return;
    const touchStart = Number(feedRef.current.getAttribute('data-touch-start'));
    if (!touchStart || feedRef.current.scrollTop !== 0) return;

    const touch = e.touches[0];
    const distance = Math.max(0, (touch.clientY - touchStart) / 2);
    setPullDistance(Math.min(distance, 80));
  };

  const handleTouchEnd = () => {
    if (!onRefresh) return;
    if (pullDistance > 60) {
      onRefresh();
    }
    setPullDistance(0);
    feedRef.current?.removeAttribute('data-touch-start');
  };

  return (
    <Box className="feed-template" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      {title && (
        <Box style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'white',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          <Typography variant="h1">{title}</Typography>
          {actions && <Box>{actions}</Box>}
        </Box>
      )}

      {/* Filters/Tabs */}
      {filters.length > 0 && (
        <Box style={{
          padding: '12px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          gap: '12px',
          overflowX: 'auto',
          backgroundColor: 'white',
          position: 'sticky',
          top: title ? '60px' : 0,
          zIndex: 9
        }}>
          {filters.map((filter, index) => (
            <Button
              key={index}
              variant={filter.active ? 'primary' : 'text'}
              size="small"
              onClick={filter.onClick}
              style={{ whiteSpace: 'nowrap' }}
            >
              {filter.label}
            </Button>
          ))}
        </Box>
      )}

      {/* Main Content Area */}
      <Box style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Feed Content */}
        <Box
          ref={feedRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            position: 'relative'
          }}
        >
          {/* Pull to Refresh Indicator */}
          {onRefresh && pullDistance > 0 && (
            <Box style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: `translateX(-50%) translateY(${pullDistance - 60}px)`,
              transition: pullDistance === 0 ? 'transform 0.2s' : 'none',
              zIndex: 20
            }}>
              <Spinner size="small" />
            </Box>
          )}

          {/* Refreshing Indicator */}
          {refreshing && (
            <Box style={{
              padding: '12px',
              textAlign: 'center',
              backgroundColor: '#f3f4f6'
            }}>
              <Spinner size="small" />
            </Box>
          )}

          {/* Composer at Top */}
          {composer && composerPosition === 'top' && !loading && (
            <Box style={{
              padding: '16px 24px',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: 'white'
            }}>
              {composer}
            </Box>
          )}

          {/* Feed Items */}
          <Box>
            {loading ? (
              <Box style={{
                display: 'flex',
                justifyContent: 'center',
                padding: '60px'
              }}>
                <Spinner size="large" />
              </Box>
            ) : items.length === 0 ? (
              <Box style={{ padding: '60px 24px' }}>
                {emptyState}
              </Box>
            ) : (
              <>
                {items.map((item) => (
                  <Box
                    key={item.id}
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      backgroundColor: 'white'
                    }}
                  >
                    {renderItem(item)}
                  </Box>
                ))}

                {/* Load More Trigger */}
                {hasMore && (
                  <div ref={observerTarget} style={{ height: '20px' }} />
                )}

                {/* Loading More Indicator */}
                {loadingMore && (
                  <Box style={{
                    display: 'flex',
                    justifyContent: 'center',
                    padding: '24px'
                  }}>
                    <Spinner />
                  </Box>
                )}

                {/* End of Feed */}
                {!hasMore && items.length > 0 && (
                  <Box style={{
                    padding: '24px',
                    textAlign: 'center',
                    color: '#9ca3af'
                  }}>
                    <Typography variant="caption">
                      You've reached the end
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Box>

          {/* Composer at Bottom */}
          {composer && composerPosition === 'bottom' && !loading && (
            <Box style={{
              padding: '16px 24px',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: 'white'
            }}>
              {composer}
            </Box>
          )}
        </Box>

        {/* Sidebar (Desktop only) */}
        {sidebar && (
          <Box
            className="feed-sidebar"
            style={{
              width: '300px',
              borderLeft: '1px solid #e5e7eb',
              overflowY: 'auto',
              '@media (max-width: 1024px)': {
                display: 'none'
              }
            }}
          >
            <Box style={{ position: 'sticky', top: '0', padding: '16px' }}>
              {sidebar}
            </Box>
          </Box>
        )}
      </Box>

      {/* Fixed Composer (FAB style) */}
      {composer && composerPosition === 'fixed' && (
        <Box style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 100
        }}>
          {composer}
        </Box>
      )}
    </Box>
  );
};
