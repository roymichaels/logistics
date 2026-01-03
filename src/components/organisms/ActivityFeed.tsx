import React, { useState, useRef, useEffect } from 'react';
import { tokens } from '../../theme/tokens';
import { ActivityItem, ActivityItemProps, ActivityType } from '../molecules/ActivityItem';
import { Spinner } from '../atoms/Spinner';

export interface Activity extends Omit<ActivityItemProps, 'onClick' | 'onDelete'> {
  id: string;
  type: ActivityType;
  message: string;
  time: string;
}

export interface ActivityFeedProps {
  activities: Activity[];
  onActivityClick?: (activity: Activity) => void;
  onActivityDelete?: (activityId: string) => void;
  onLoadMore?: () => void;
  isLoading?: boolean;
  hasMore?: boolean;
  emptyMessage?: string;
  title?: string;
  maxHeight?: string;
  showActions?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function ActivityFeed({
  activities,
  onActivityClick,
  onActivityDelete,
  onLoadMore,
  isLoading = false,
  hasMore = false,
  emptyMessage = 'No activities yet',
  title = 'Recent Activity',
  maxHeight = '600px',
  showActions = false,
  className,
  style,
}: ActivityFeedProps) {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onLoadMore || !hasMore || isLoading) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore) {
          setIsLoadingMore(true);
          onLoadMore();
          setTimeout(() => setIsLoadingMore(false), 1000);
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [onLoadMore, hasMore, isLoading, isLoadingMore]);

  if (isLoading && activities.length === 0) {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '200px',
          ...style,
        }}
      >
        <Spinner size="lg" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div
        className={className}
        style={{
          padding: '32px',
          textAlign: 'center',
          color: tokens.colors.subtle,
          backgroundColor: tokens.colors.bg,
          borderRadius: '12px',
          ...style,
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
        <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: tokens.colors.panel,
        borderRadius: '12px',
        border: `1px solid ${tokens.colors.border}`,
        overflow: 'hidden',
        ...style,
      }}
    >
      {title && (
        <div
          style={{
            padding: '16px',
            borderBottom: `1px solid ${tokens.colors.border}`,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 700,
              color: tokens.colors.text,
            }}
          >
            {title}
          </h3>
        </div>
      )}

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          maxHeight,
        }}
      >
        <div style={{ padding: '8px' }}>
          {activities.map((activity) => (
            <ActivityItem
              key={activity.id}
              {...activity}
              onClick={onActivityClick ? () => onActivityClick(activity) : undefined}
              onDelete={onActivityDelete ? () => onActivityDelete(activity.id) : undefined}
              showActions={showActions}
            />
          ))}

          {hasMore && (
            <div
              ref={sentinelRef}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
              }}
            >
              {isLoadingMore && <Spinner />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
