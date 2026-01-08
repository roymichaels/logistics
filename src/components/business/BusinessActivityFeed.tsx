import React, { useMemo } from 'react';
import { ActivityFeed, Activity } from '../organisms/ActivityFeed';
import { formatTimeAgo } from '../../utils/businessFormatters';
import type { BusinessStats } from '../../hooks/useBusinessStats';

interface BusinessActivityFeedProps {
  stats: BusinessStats;
  auditLogs?: Array<{
    id: string;
    action: string;
    table_name: string;
    created_at: string;
  }>;
}

export function BusinessActivityFeed({ stats, auditLogs }: BusinessActivityFeedProps) {
  const activities = useMemo(() => {
    const acts: Activity[] = [];

    if (stats.recentOrders > 0) {
      acts.push({
        id: 'orders',
        type: 'order',
        message: `${stats.recentOrders} הזמנות חדשות בוצעו`,
        time: 'היום'
      });
    }

    if (stats.lowStockItems > 0) {
      acts.push({
        id: 'stock-low',
        type: 'alert',
        message: `${stats.lowStockItems} מוצרים במלאי נמוך`,
        time: 'עכשיו'
      });
    }

    if (stats.outOfStockItems > 0) {
      acts.push({
        id: 'stock-out',
        type: 'alert',
        message: `${stats.outOfStockItems} מוצרים אזלו מהמלאי`,
        time: 'עכשיו'
      });
    }

    if (stats.pendingOrders > 5) {
      acts.push({
        id: 'pending',
        type: 'alert',
        message: `${stats.pendingOrders} הזמנות ממתינות לטיפול`,
        time: 'עכשיו'
      });
    }

    if (auditLogs && auditLogs.length > 0) {
      auditLogs.slice(0, 5).forEach((log, idx) => {
        const timeAgo = formatTimeAgo(new Date(log.created_at));
        acts.push({
          id: `log-${idx}`,
          type: log.action === 'DELETE' ? 'alert' : 'info',
          message: `${log.action} ב-${log.table_name}`,
          time: timeAgo
        });
      });
    }

    if (acts.length === 0) {
      acts.push({
        id: 'no-activity',
        type: 'info',
        message: 'אין פעילות אחרונה',
        time: ''
      });
    }

    return acts;
  }, [stats, auditLogs]);

  return <ActivityFeed activities={activities} />;
}
