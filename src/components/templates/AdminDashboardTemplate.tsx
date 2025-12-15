import React from 'react';
import { Badge, Button, Grid, Section, Text } from '../atoms';
import { Card } from '../molecules';

export interface SystemMetric {
  label: string;
  value: string | number;
  status?: 'success' | 'warning' | 'danger';
}

export interface AdminDashboardTemplateProps {
  systemMetrics: SystemMetric[];
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    user?: string;
  }>;
  onViewUsers?: () => void;
  onViewBusinesses?: () => void;
  onViewLogs?: () => void;
  loading?: boolean;
}

export function AdminDashboardTemplate({
  systemMetrics,
  recentActivity,
  onViewUsers,
  onViewBusinesses,
  onViewLogs,
  loading = false,
}: AdminDashboardTemplateProps) {
  const getStatusVariant = (status?: 'success' | 'warning' | 'danger'): 'success' | 'warning' | 'danger' | 'default' => {
    return status || 'default';
  };

  return (
    <div>
      <Section spacing="lg">
        <Text variant="h1" weight="bold">
          Admin Dashboard
        </Text>
        <Text variant="body" color="secondary">
          System overview and management
        </Text>
      </Section>

      <Section spacing="md">
        {loading && <Text color="secondary">Loading system metrics...</Text>}
        {!loading && (
          <Grid columns={4} gap="md" autoFit minItemWidth="200px">
            {systemMetrics.map((metric, index) => (
              <Card key={index}>
                <div style={{ padding: '20px' }}>
                  <Text variant="small" color="secondary">
                    {metric.label}
                  </Text>
                  <Text variant="h2" weight="bold" style={{ marginTop: '8px' }}>
                    {metric.value}
                  </Text>
                  {metric.status && (
                    <Badge variant={getStatusVariant(metric.status)} size="sm" style={{ marginTop: '8px' }}>
                      {metric.status}
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
          </Grid>
        )}
      </Section>

      <Section spacing="md">
        <div style={{ display: 'flex', gap: '12px' }}>
          {onViewUsers && (
            <Button variant="secondary" onClick={onViewUsers}>
              Manage Users
            </Button>
          )}
          {onViewBusinesses && (
            <Button variant="secondary" onClick={onViewBusinesses}>
              Manage Businesses
            </Button>
          )}
          {onViewLogs && (
            <Button variant="secondary" onClick={onViewLogs}>
              View Logs
            </Button>
          )}
        </div>
      </Section>

      <Section spacing="lg">
        <Text variant="h2" weight="bold" style={{ marginBottom: '16px' }}>
          Recent Activity
        </Text>
        {recentActivity.length === 0 && (
          <Card>
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <Text variant="h3" color="secondary">
                No recent activity
              </Text>
            </div>
          </Card>
        )}
        {recentActivity.length > 0 && (
          <Card>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {recentActivity.map((activity, index) => (
                  <div
                    key={activity.id}
                    style={{
                      paddingBottom: index < recentActivity.length - 1 ? '16px' : '0',
                      borderBottom: index < recentActivity.length - 1 ? '1px solid #e5e7eb' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <Badge variant="default" size="sm">
                          {activity.type}
                        </Badge>
                        <Text variant="body" style={{ marginTop: '8px' }}>
                          {activity.description}
                        </Text>
                        {activity.user && (
                          <Text variant="small" color="secondary" style={{ marginTop: '4px' }}>
                            by {activity.user}
                          </Text>
                        )}
                      </div>
                      <Text variant="small" color="secondary">
                        {new Date(activity.timestamp).toLocaleString()}
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
      </Section>
    </div>
  );
}
