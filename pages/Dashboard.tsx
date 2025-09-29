import React, { useState, useEffect } from 'react';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import { useSkeleton, SkeletonCard } from '../src/hooks/useSkeleton';
import { Toast } from '../src/components/Toast';
import { DataStore, User, Order, Task } from '../data/types';

interface DashboardProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function Dashboard({ dataStore, onNavigate }: DashboardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingTasks: 0,
    completedToday: 0
  });
  const [loading, setLoading] = useState(true);
  const showSkeleton = useSkeleton(100);
  const { theme, mainButton, backButton, haptic } = useTelegramUI();


  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const profile = await dataStore.getProfile();
      setUser(profile);

      if (profile.role === 'dispatcher') {
        const orders = await dataStore.listOrders?.() || [];
        setStats({
          totalOrders: orders.length,
          pendingTasks: orders.filter(o => o.status === 'new' || o.status === 'assigned').length,
          completedToday: orders.filter(o => 
            o.status === 'delivered' && 
            new Date(o.updated_at).toDateString() === new Date().toDateString()
          ).length
        });
      } else {
        const tasks = await dataStore.listMyTasks?.() || [];
        setStats({
          totalOrders: 0,
          pendingTasks: tasks.filter(t => t.status === 'pending' || t.status === 'enroute').length,
          completedToday: tasks.filter(t => 
            t.status === 'done' && 
            t.completed_at &&
            new Date(t.completed_at).toDateString() === new Date().toDateString()
          ).length
        });
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      Toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = () => {
    haptic();
    onNavigate('orders');
  };

  const handleStartRoute = () => {
    haptic();
    onNavigate('tasks');
  };

  useEffect(() => {
    if (user?.role === 'dispatcher') {
      // Don't show main button since we have bottom navigation now
      mainButton.hide();
    } else {
      mainButton.hide();
    }

    // Don't set back button since we have bottom navigation
    backButton.hide();
  }, [user]);

  if (loading || showSkeleton) {
    return (
      <div style={{ 
        padding: 'var(--tg-spacing-lg)', 
        color: theme.text_color,
        backgroundColor: theme.bg_color,
        minHeight: '100vh'
      }}>
        <div style={{ marginBottom: 'var(--tg-spacing-2xl)' }}>
          <div style={{
            height: '32px',
            backgroundColor: theme.hint_color + '40',
            borderRadius: 'var(--tg-radius-sm)',
            marginBottom: 'var(--tg-spacing-sm)',
            width: '60%',
            animation: 'pulse 1.5s ease-in-out infinite'
          }} />
          <div style={{
            height: '20px',
            backgroundColor: theme.hint_color + '30',
            borderRadius: 'var(--tg-radius-sm)',
            width: '40%',
            animation: 'pulse 1.5s ease-in-out infinite'
          }} />
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
          gap: 'var(--tg-spacing-md)',
          marginBottom: 'var(--tg-spacing-2xl)'
        }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: '80px',
              backgroundColor: theme.hint_color + '20',
              borderRadius: 'var(--tg-radius-md)',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
          ))}
        </div>
        
        <SkeletonCard theme={theme} />
        <SkeletonCard theme={theme} />
      </div>
    );
  }

  return (
    <div style={{ 
      padding: 'var(--tg-spacing-lg)', 
      backgroundColor: theme.bg_color,
      color: theme.text_color,
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--tg-spacing-2xl)' }}>
        <h1 style={{ 
          margin: '0 0 var(--tg-spacing-sm) 0', 
          fontSize: 'var(--tg-font-3xl)', 
          fontWeight: '600',
          color: theme.text_color
        }}>
          Good {new Date().getHours() < 12 ? 'Morning' : 'Afternoon'}
        </h1>
        <p style={{ 
          margin: 0, 
          color: theme.hint_color,
          fontSize: 'var(--tg-font-lg)'
        }}>
          {user?.name || 'User'} • {user?.role === 'dispatcher' ? 'Dispatcher' : 'Courier'}
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
        gap: 'var(--tg-spacing-md)',
        marginBottom: 'var(--tg-spacing-2xl)'
      }}>
        {user?.role === 'dispatcher' ? (
          <>
            <StatCard
              title="Total Orders"
              value={stats.totalOrders}
              color={theme.button_color}
              theme={theme}
            />
            <StatCard
              title="Pending"
              value={stats.pendingTasks}
              color="#ff9500"
              theme={theme}
            />
            <StatCard
              title="Completed Today"
              value={stats.completedToday}
              color="#34c759"
              theme={theme}
            />
          </>
        ) : (
          <>
            <StatCard
              title="Pending Tasks"
              value={stats.pendingTasks}
              color={theme.button_color}
              theme={theme}
            />
            <StatCard
              title="Completed Today"
              value={stats.completedToday}
              color="#34c759"
              theme={theme}
            />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: 'var(--tg-spacing-2xl)' }}>
        <h2 style={{ 
          margin: '0 0 var(--tg-spacing-lg) 0', 
          fontSize: 'var(--tg-font-xl)', 
          fontWeight: '600',
          color: theme.text_color
        }}>
          Quick Actions
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tg-spacing-md)' }}>
          <ActionButton
            title={user?.role === 'dispatcher' ? 'Manage Orders' : 'My Tasks'}
            subtitle={user?.role === 'dispatcher' ? 'View and create orders' : 'View assigned deliveries'}
            icon="📋"
            onClick={() => onNavigate(user?.role === 'dispatcher' ? 'orders' : 'tasks')}
            theme={theme}
            haptic={haptic}
          />
          
          <ActionButton
            title="Settings"
            subtitle="Profile and preferences"
            icon="⚙️"
            onClick={() => onNavigate('settings')}
            theme={theme}
            haptic={haptic}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, color, theme }: { 
  title: string; 
  value: number; 
  color: string;
  theme: any;
}) {
  return (
    <div className="tg-card" style={{
      backgroundColor: theme.secondary_bg_color || '#f1f1f1',
      textAlign: 'center'
    }}>
      <div style={{ 
        fontSize: 'var(--tg-font-3xl)', 
        fontWeight: '700', 
        color,
        marginBottom: 'var(--tg-spacing-xs)'
      }}>
        {value}
      </div>
      <div style={{ 
        fontSize: 'var(--tg-font-sm)', 
        color: theme.hint_color,
        fontWeight: '500'
      }}>
        {title}
      </div>
    </div>
  );
}

function ActionButton({ title, subtitle, icon, onClick, theme, haptic }: {
  title: string;
  subtitle: string;
  icon: string;
  onClick: () => void;
  theme: any;
  haptic: () => void;
}) {
  return (
    <button
      onClick={() => {
        haptic();
        onClick();
      }}
      className="tg-list-item"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--tg-spacing-md)',
        backgroundColor: theme.secondary_bg_color || '#f1f1f1',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left'
      }}
    >
      <div style={{ fontSize: 'var(--tg-font-3xl)' }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ 
          fontSize: 'var(--tg-font-lg)', 
          fontWeight: '600', 
          color: theme.text_color,
          marginBottom: 'var(--tg-spacing-xs)'
        }}>
          {title}
        </div>
        <div style={{ 
          fontSize: 'var(--tg-font-md)', 
          color: theme.hint_color
        }}>
          {subtitle}
        </div>
      </div>
    </button>
  );
}