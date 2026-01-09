import React from 'react';
import { Grid, Package, Star, Info } from 'lucide-react';

export type TabType = 'posts' | 'products' | 'reviews' | 'about';

interface BusinessProfileTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  counts?: {
    posts?: number;
    products?: number;
    reviews?: number;
  };
}

export function BusinessProfileTabs({ activeTab, onTabChange, counts }: BusinessProfileTabsProps) {
  const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode; count?: number }> = [
    { id: 'posts', label: 'POSTS', icon: <Grid size={12} />, count: counts?.posts },
    { id: 'products', label: 'PRODUCTS', icon: <Package size={12} />, count: counts?.products },
    { id: 'reviews', label: 'REVIEWS', icon: <Star size={12} />, count: counts?.reviews },
    { id: 'about', label: 'ABOUT', icon: <Info size={12} /> }
  ];

  return (
    <div style={{
      background: 'white',
      borderBottom: '1px solid #dbdbdb',
      position: 'sticky',
      top: 0,
      zIndex: 10
    }}>
      <div style={{
        maxWidth: '935px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'center'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: 1,
              maxWidth: '200px',
              padding: '16px',
              background: 'transparent',
              border: 'none',
              borderTop: activeTab === tab.id ? '1px solid #262626' : '1px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: '600',
              letterSpacing: '1px',
              color: activeTab === tab.id ? '#262626' : '#8e8e8e',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{
              display: 'flex',
              alignItems: 'center',
              color: activeTab === tab.id ? '#262626' : '#8e8e8e'
            }}>
              {tab.icon}
            </span>
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span style={{
                background: '#efefef',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                color: '#8e8e8e'
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
