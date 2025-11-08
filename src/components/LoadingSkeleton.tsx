import React from 'react';
import { Skeleton, SkeletonGroup } from './atoms/Skeleton';
import { spacing } from '../styles/design-system';

interface LoadingSkeletonProps {
  type?: 'text' | 'title' | 'card' | 'list';
  count?: number;
  height?: string;
  width?: string;
}

export function LoadingSkeleton({
  type = 'text',
  count = 1,
  height,
  width,
}: LoadingSkeletonProps) {
  if (type === 'text') {
    return (
      <SkeletonGroup count={count} spacing="sm">
        <Skeleton height={height || '16px'} width={width || '100%'} variant="text" />
      </SkeletonGroup>
    );
  }

  if (type === 'title') {
    return <Skeleton height={height || '24px'} width={width || '60%'} variant="text" />;
  }

  if (type === 'card') {
    return (
      <SkeletonGroup count={count} spacing="lg">
        <div
          style={{
            padding: spacing.lg,
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '12px',
          }}
        >
          <Skeleton height="20px" width="60%" variant="text" />
          <div style={{ marginTop: spacing.md }}>
            <Skeleton height="14px" width="80%" variant="text" />
          </div>
          <div style={{ marginTop: spacing.sm }}>
            <Skeleton height="14px" width="90%" variant="text" />
          </div>
        </div>
      </SkeletonGroup>
    );
  }

  if (type === 'list') {
    return (
      <SkeletonGroup count={count} spacing="md">
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <Skeleton height="40px" width="40px" variant="circular" />
          <div style={{ flex: 1 }}>
            <Skeleton height="16px" width="70%" variant="text" />
            <div style={{ marginTop: spacing.sm }}>
              <Skeleton height="12px" width="50%" variant="text" />
            </div>
          </div>
        </div>
      </SkeletonGroup>
    );
  }

  return null;
}

export function PageLoadingSkeleton() {
  return (
    <div style={{ padding: spacing['2xl'] }}>
      <LoadingSkeleton type="title" />
      <div style={{ marginTop: spacing.md }}>
        <LoadingSkeleton type="text" count={2} />
      </div>
      <div style={{ marginTop: spacing['3xl'] }}>
        <LoadingSkeleton type="card" count={3} />
      </div>
    </div>
  );
}

export function ListLoadingSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div style={{ padding: spacing['2xl'] }}>
      <LoadingSkeleton type="list" count={count} />
    </div>
  );
}
