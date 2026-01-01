export interface DashboardMetric {
  id: string;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: string;
  };
  icon?: string;
  color?: string;
  onClick?: () => void;
}

export interface DashboardAction {
  id: string;
  label: string;
  icon?: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

export interface DashboardSection {
  id: string;
  title: string;
  subtitle?: string;
  actions?: DashboardAction[];
  children: React.ReactNode;
}

export interface DashboardConfig {
  title: string;
  subtitle?: string;
  metrics: DashboardMetric[];
  quickActions?: DashboardAction[];
  sections?: DashboardSection[];
  refreshInterval?: number;
  onRefresh?: () => Promise<void>;
}

export interface DashboardLayoutProps {
  config: DashboardConfig;
  loading?: boolean;
  error?: Error | null;
  children?: React.ReactNode;
}

export type MetricVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

export interface MetricCardProps {
  metric: DashboardMetric;
  variant?: MetricVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export interface QuickActionsProps {
  actions: DashboardAction[];
  layout?: 'grid' | 'list';
  columns?: number;
}

export interface SectionProps {
  section: DashboardSection;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}
