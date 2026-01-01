import { DashboardConfig, DashboardMetric } from '@components/dashboard-v2/types';

export type DashboardRole =
  | 'infrastructure_owner'
  | 'business_owner'
  | 'manager'
  | 'warehouse'
  | 'dispatcher'
  | 'sales'
  | 'customer_service'
  | 'driver'
  | 'customer';

export interface RoleDashboardConfig {
  role: DashboardRole;
  title: string;
  subtitle?: string;
  metricsFetcher: string;
  quickActions: Array<{
    id: string;
    label: string;
    icon?: string;
    route: string;
    variant?: 'primary' | 'secondary' | 'danger';
  }>;
  sections: Array<{
    id: string;
    title: string;
    component: string;
    collapsible?: boolean;
  }>;
}

export const dashboardConfigs: Record<DashboardRole, RoleDashboardConfig> = {
  infrastructure_owner: {
    role: 'infrastructure_owner',
    title: 'Platform Dashboard',
    subtitle: 'System-wide metrics and management',
    metricsFetcher: 'fetchPlatformMetrics',
    quickActions: [
      { id: 'businesses', label: 'Manage Businesses', icon: '🏢', route: '/admin/businesses' },
      { id: 'users', label: 'Manage Users', icon: '👥', route: '/admin/users' },
      { id: 'analytics', label: 'View Analytics', icon: '📊', route: '/admin/analytics' },
      { id: 'settings', label: 'Platform Settings', icon: '⚙️', route: '/admin/settings', variant: 'secondary' }
    ],
    sections: [
      { id: 'businesses', title: 'Business Overview', component: 'BusinessesTable' },
      { id: 'activity', title: 'Recent Activity', component: 'ActivityFeed' },
      { id: 'system', title: 'System Health', component: 'SystemHealth', collapsible: true }
    ]
  },

  business_owner: {
    role: 'business_owner',
    title: 'Business Dashboard',
    subtitle: 'Your business at a glance',
    metricsFetcher: 'fetchBusinessMetrics',
    quickActions: [
      { id: 'orders', label: 'View Orders', icon: '📦', route: '/business/orders' },
      { id: 'inventory', label: 'Manage Inventory', icon: '📊', route: '/business/inventory' },
      { id: 'team', label: 'Team Members', icon: '👥', route: '/business/team' },
      { id: 'reports', label: 'Reports', icon: '📈', route: '/business/reports', variant: 'secondary' }
    ],
    sections: [
      { id: 'revenue', title: 'Revenue Overview', component: 'RevenueChart' },
      { id: 'orders', title: 'Recent Orders', component: 'OrdersList' },
      { id: 'team', title: 'Team Performance', component: 'TeamPerformance' }
    ]
  },

  manager: {
    role: 'manager',
    title: 'Manager Dashboard',
    subtitle: 'Team operations and performance',
    metricsFetcher: 'fetchManagerMetrics',
    quickActions: [
      { id: 'orders', label: 'Manage Orders', icon: '📦', route: '/orders' },
      { id: 'team', label: 'Team Members', icon: '👥', route: '/team' },
      { id: 'approvals', label: 'Pending Approvals', icon: '✅', route: '/approvals' },
      { id: 'reports', label: 'Team Reports', icon: '📊', route: '/reports', variant: 'secondary' }
    ],
    sections: [
      { id: 'team', title: 'Team Overview', component: 'TeamTable' },
      { id: 'orders', title: 'Orders Today', component: 'OrdersList' },
      { id: 'approvals', title: 'Pending Approvals', component: 'ApprovalsList' }
    ]
  },

  warehouse: {
    role: 'warehouse',
    title: 'Warehouse Dashboard',
    subtitle: 'Inventory and fulfillment',
    metricsFetcher: 'fetchWarehouseMetrics',
    quickActions: [
      { id: 'incoming', label: 'Receive Shipment', icon: '📥', route: '/warehouse/incoming' },
      { id: 'inventory', label: 'Inventory', icon: '📦', route: '/warehouse/inventory' },
      { id: 'restock', label: 'Restock Requests', icon: '🔄', route: '/warehouse/restock' }
    ],
    sections: [
      { id: 'pending', title: 'Pending Orders', component: 'PendingOrdersList' },
      { id: 'low-stock', title: 'Low Stock Alerts', component: 'LowStockList' },
      { id: 'recent', title: 'Recent Activity', component: 'RecentActivity' }
    ]
  },

  dispatcher: {
    role: 'dispatcher',
    title: 'Dispatch Console',
    subtitle: 'Live delivery coordination',
    metricsFetcher: 'fetchDispatchMetrics',
    quickActions: [
      { id: 'assign', label: 'Assign Orders', icon: '🚚', route: '/dispatch/assign' },
      { id: 'map', label: 'Live Map', icon: '🗺️', route: '/dispatch/map' },
      { id: 'drivers', label: 'Drivers', icon: '👥', route: '/dispatch/drivers' }
    ],
    sections: [
      { id: 'active', title: 'Active Deliveries', component: 'ActiveDeliveriesList' },
      { id: 'drivers', title: 'Available Drivers', component: 'DriversList' },
      { id: 'queue', title: 'Delivery Queue', component: 'DeliveryQueue' }
    ]
  },

  sales: {
    role: 'sales',
    title: 'Sales Dashboard',
    subtitle: 'Customer relationships and orders',
    metricsFetcher: 'fetchSalesMetrics',
    quickActions: [
      { id: 'create-order', label: 'Create Order', icon: '➕', route: '/sales/orders/new' },
      { id: 'customers', label: 'Customers', icon: '👥', route: '/sales/customers' },
      { id: 'follow-ups', label: 'Follow-ups', icon: '📞', route: '/sales/follow-ups', variant: 'secondary' }
    ],
    sections: [
      { id: 'customers', title: 'Recent Customers', component: 'CustomersList' },
      { id: 'orders', title: 'Recent Orders', component: 'OrdersList' },
      { id: 'targets', title: 'Sales Targets', component: 'SalesTargets' }
    ]
  },

  customer_service: {
    role: 'customer_service',
    title: 'Support Dashboard',
    subtitle: 'Customer support and tickets',
    metricsFetcher: 'fetchSupportMetrics',
    quickActions: [
      { id: 'tickets', label: 'View Tickets', icon: '🎫', route: '/support/tickets' },
      { id: 'orders', label: 'Order Lookup', icon: '🔍', route: '/support/orders' },
      { id: 'chat', label: 'Live Chat', icon: '💬', route: '/support/chat' }
    ],
    sections: [
      { id: 'tickets', title: 'Open Tickets', component: 'TicketsList' },
      { id: 'recent', title: 'Recent Interactions', component: 'InteractionsList' }
    ]
  },

  driver: {
    role: 'driver',
    title: 'Driver Dashboard',
    subtitle: 'Your deliveries and earnings',
    metricsFetcher: 'fetchDriverMetrics',
    quickActions: [
      { id: 'deliveries', label: 'My Deliveries', icon: '📦', route: '/driver/deliveries' },
      { id: 'earnings', label: 'Earnings', icon: '💰', route: '/driver/earnings' },
      { id: 'status', label: 'Update Status', icon: '🔄', route: '/driver/status', variant: 'secondary' }
    ],
    sections: [
      { id: 'active', title: 'Active Delivery', component: 'ActiveDelivery' },
      { id: 'upcoming', title: 'Upcoming Deliveries', component: 'UpcomingDeliveries' },
      { id: 'earnings', title: "Today's Earnings", component: 'EarningsSummary' }
    ]
  },

  customer: {
    role: 'customer',
    title: 'My Orders',
    subtitle: 'Track your orders',
    metricsFetcher: 'fetchCustomerMetrics',
    quickActions: [
      { id: 'browse', label: 'Browse Products', icon: '🛍️', route: '/store/catalog' },
      { id: 'orders', label: 'My Orders', icon: '📦', route: '/store/orders' },
      { id: 'cart', label: 'Cart', icon: '🛒', route: '/store/cart', variant: 'secondary' }
    ],
    sections: [
      { id: 'active', title: 'Active Orders', component: 'ActiveOrdersList' },
      { id: 'history', title: 'Order History', component: 'OrderHistory' }
    ]
  }
};

export function getDashboardConfig(role: DashboardRole): RoleDashboardConfig {
  return dashboardConfigs[role];
}

export function createMetricsFromData(role: DashboardRole, data: any): DashboardMetric[] {
  const metricDefinitions: Record<DashboardRole, (data: any) => DashboardMetric[]> = {
    infrastructure_owner: (data) => [
      {
        id: 'total-businesses',
        label: 'Total Businesses',
        value: data.totalBusinesses || 0,
        icon: '🏢',
        trend: data.businessesTrend
      },
      {
        id: 'total-orders',
        label: 'Platform Orders',
        value: data.totalOrders || 0,
        icon: '📦',
        trend: data.ordersTrend
      },
      {
        id: 'revenue',
        label: 'Platform Revenue',
        value: `$${(data.totalRevenue || 0).toLocaleString()}`,
        icon: '💰',
        trend: data.revenueTrend
      },
      {
        id: 'active-users',
        label: 'Active Users',
        value: data.activeUsers || 0,
        icon: '👥',
        trend: data.usersTrend
      }
    ],

    business_owner: (data) => [
      {
        id: 'revenue-today',
        label: "Today's Revenue",
        value: `$${(data.revenueToday || 0).toLocaleString()}`,
        icon: '💰',
        trend: data.revenueTrend
      },
      {
        id: 'orders-today',
        label: "Today's Orders",
        value: data.ordersToday || 0,
        icon: '📦',
        trend: data.ordersTrend
      },
      {
        id: 'profit-margin',
        label: 'Profit Margin',
        value: `${(data.profitMargin || 0).toFixed(1)}%`,
        icon: '📈',
        trend: data.profitTrend
      },
      {
        id: 'avg-order',
        label: 'Avg Order Value',
        value: `$${(data.avgOrderValue || 0).toFixed(2)}`,
        icon: '💵',
        trend: data.avgOrderTrend
      }
    ],

    manager: (data) => [
      {
        id: 'team-members',
        label: 'Team Members',
        value: data.totalMembers || 0,
        subValue: `${data.activeMembers || 0} active`,
        icon: '👥'
      },
      {
        id: 'orders-today',
        label: "Today's Orders",
        value: data.ordersToday || 0,
        icon: '📦',
        trend: data.ordersTrend
      },
      {
        id: 'pending-approvals',
        label: 'Pending Approvals',
        value: data.pendingApprovals || 0,
        icon: '✅'
      },
      {
        id: 'team-revenue',
        label: 'Team Revenue',
        value: `$${(data.teamRevenue || 0).toLocaleString()}`,
        icon: '💰',
        trend: data.revenueTrend
      }
    ],

    warehouse: (data) => [
      {
        id: 'pending-orders',
        label: 'Pending Orders',
        value: data.pendingOrders || 0,
        icon: '📦'
      },
      {
        id: 'low-stock',
        label: 'Low Stock Items',
        value: data.lowStockItems || 0,
        icon: '⚠️'
      },
      {
        id: 'packed-today',
        label: 'Packed Today',
        value: data.packedToday || 0,
        icon: '✅',
        trend: data.packedTrend
      },
      {
        id: 'receiving',
        label: 'Receiving',
        value: data.incomingShipments || 0,
        icon: '📥'
      }
    ],

    dispatcher: (data) => [
      {
        id: 'active-deliveries',
        label: 'Active Deliveries',
        value: data.activeDeliveries || 0,
        icon: '🚚'
      },
      {
        id: 'available-drivers',
        label: 'Available Drivers',
        value: data.availableDrivers || 0,
        subValue: `${data.totalDrivers || 0} total`,
        icon: '👥'
      },
      {
        id: 'delivery-queue',
        label: 'Delivery Queue',
        value: data.queuedOrders || 0,
        icon: '⏳'
      },
      {
        id: 'avg-time',
        label: 'Avg Delivery Time',
        value: `${data.avgDeliveryTime || 0}m`,
        icon: '⏱️',
        trend: data.deliveryTimeTrend
      }
    ],

    sales: (data) => [
      {
        id: 'today-sales',
        label: "Today's Sales",
        value: `$${(data.salesToday || 0).toLocaleString()}`,
        icon: '💰',
        trend: data.salesTrend
      },
      {
        id: 'orders-created',
        label: 'Orders Created',
        value: data.ordersCreated || 0,
        icon: '📦'
      },
      {
        id: 'follow-ups',
        label: 'Follow-ups Due',
        value: data.followUpsDue || 0,
        icon: '📞'
      },
      {
        id: 'conversion',
        label: 'Conversion Rate',
        value: `${(data.conversionRate || 0).toFixed(1)}%`,
        icon: '📈',
        trend: data.conversionTrend
      }
    ],

    customer_service: (data) => [
      {
        id: 'open-tickets',
        label: 'Open Tickets',
        value: data.openTickets || 0,
        icon: '🎫'
      },
      {
        id: 'avg-response',
        label: 'Avg Response Time',
        value: `${data.avgResponseTime || 0}m`,
        icon: '⏱️',
        trend: data.responseTrend
      },
      {
        id: 'resolved-today',
        label: 'Resolved Today',
        value: data.resolvedToday || 0,
        icon: '✅',
        trend: data.resolvedTrend
      },
      {
        id: 'satisfaction',
        label: 'Satisfaction Rate',
        value: `${(data.satisfactionRate || 0).toFixed(1)}%`,
        icon: '⭐',
        trend: data.satisfactionTrend
      }
    ],

    driver: (data) => [
      {
        id: 'earnings-today',
        label: "Today's Earnings",
        value: `$${(data.earningsToday || 0).toFixed(2)}`,
        icon: '💰',
        trend: data.earningsTrend
      },
      {
        id: 'deliveries-today',
        label: "Today's Deliveries",
        value: data.deliveriesToday || 0,
        icon: '📦'
      },
      {
        id: 'active-delivery',
        label: 'Active Delivery',
        value: data.hasActiveDelivery ? 'In Progress' : 'None',
        icon: '🚚'
      },
      {
        id: 'rating',
        label: 'Your Rating',
        value: (data.rating || 0).toFixed(1),
        subValue: `${data.totalRatings || 0} ratings`,
        icon: '⭐'
      }
    ],

    customer: (data) => [
      {
        id: 'active-orders',
        label: 'Active Orders',
        value: data.activeOrders || 0,
        icon: '📦'
      },
      {
        id: 'total-spent',
        label: 'Total Spent',
        value: `$${(data.totalSpent || 0).toLocaleString()}`,
        icon: '💰'
      },
      {
        id: 'orders-count',
        label: 'Total Orders',
        value: data.totalOrders || 0,
        icon: '📊'
      },
      {
        id: 'rewards',
        label: 'Reward Points',
        value: data.rewardPoints || 0,
        icon: '🎁'
      }
    ]
  };

  return metricDefinitions[role]?.(data) || [];
}
