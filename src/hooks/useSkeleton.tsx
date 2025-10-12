import React from 'react';
import { useState, useEffect } from 'react';

export function useSkeleton(delay: number = 100) {
  const [showSkeleton, setShowSkeleton] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSkeleton(false);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return showSkeleton;
}

export function SkeletonCard({ theme }: { theme: any }) {
  return (
    <div style={{
      padding: '16px',
      backgroundColor: theme.secondary_bg_color || '#f1f1f1',
      borderRadius: '12px',
      marginBottom: '12px',
      animation: 'pulse 1.5s ease-in-out infinite'
    }}>
      <div style={{
        height: '20px',
        backgroundColor: theme.hint_color + '40',
        borderRadius: '4px',
        marginBottom: '8px',
        width: '70%'
      }} />
      <div style={{
        height: '16px',
        backgroundColor: theme.hint_color + '30',
        borderRadius: '4px',
        marginBottom: '8px',
        width: '90%'
      }} />
      <div style={{
        height: '16px',
        backgroundColor: theme.hint_color + '30',
        borderRadius: '4px',
        width: '60%'
      }} />
    </div>
  );
}