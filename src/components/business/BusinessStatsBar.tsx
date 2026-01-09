import React from 'react';
import { Users, FileText, Package, Star } from 'lucide-react';
import { BusinessStats } from '../../services/businessPreview';

interface BusinessStatsBarProps {
  stats: BusinessStats;
  variant?: 'horizontal' | 'vertical';
}

export function BusinessStatsBar({ stats, variant = 'horizontal' }: BusinessStatsBarProps) {
  const statItems = [
    {
      icon: <Users size={20} />,
      label: 'Followers',
      value: formatNumber(stats.followers_count),
      color: '#3b82f6',
    },
    {
      icon: <FileText size={20} />,
      label: 'Posts',
      value: formatNumber(stats.posts_count),
      color: '#8b5cf6',
    },
    {
      icon: <Package size={20} />,
      label: 'Products',
      value: formatNumber(stats.products_count),
      color: '#10b981',
    },
    {
      icon: <Star size={20} />,
      label: 'Rating',
      value: stats.reviews_count > 0 ? stats.avg_rating.toFixed(1) : 'N/A',
      subtext: stats.reviews_count > 0 ? `${stats.reviews_count} reviews` : 'No reviews',
      color: '#f59e0b',
    },
  ];

  if (variant === 'vertical') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {statItems.map((item, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `${item.color}20`,
                color: item.color,
                flexShrink: 0,
              }}
            >
              {item.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  color: '#ffffff',
                  fontSize: '24px',
                  fontWeight: 700,
                  marginBottom: '4px',
                }}
              >
                {item.value}
              </div>
              <div
                style={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                {item.label}
              </div>
              {item.subtext && (
                <div
                  style={{
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '11px',
                    marginTop: '2px',
                  }}
                >
                  {item.subtext}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        padding: '24px',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      }}
    >
      {statItems.map((item, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `${item.color}20`,
              color: item.color,
              marginBottom: '12px',
            }}
          >
            {item.icon}
          </div>
          <div
            style={{
              color: '#ffffff',
              fontSize: '28px',
              fontWeight: 700,
              marginBottom: '4px',
            }}
          >
            {item.value}
          </div>
          <div
            style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            {item.label}
          </div>
          {item.subtext && (
            <div
              style={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '12px',
                marginTop: '4px',
              }}
            >
              {item.subtext}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}
