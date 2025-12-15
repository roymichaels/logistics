import React from 'react';
import { Grid, Section, Text } from '../atoms';
import { Card } from '../molecules';

export interface MetricData {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export interface BusinessDashboardTemplateProps {
  metrics: MetricData[];
  businessName: string;
  loading?: boolean;
}

export function BusinessDashboardTemplate({
  metrics,
  businessName,
  loading = false,
}: BusinessDashboardTemplateProps) {
  const getTrendIcon = (trend?: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      case 'neutral':
      default:
        return '→';
    }
  };

  const getTrendColor = (trend?: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return '#10b981';
      case 'down':
        return '#ef4444';
      case 'neutral':
      default:
        return '#6b7280';
    }
  };

  return (
    <div>
      <Section spacing="lg">
        <Text variant="h1" weight="bold">
          {businessName}
        </Text>
        <Text variant="body" color="secondary">
          Business Overview
        </Text>
      </Section>

      <Section spacing="md">
        {loading && <Text color="secondary">Loading metrics...</Text>}
        {!loading && (
          <Grid columns={4} gap="md" autoFit minItemWidth="220px">
            {metrics.map((metric, index) => (
              <Card key={index}>
                <div style={{ padding: '24px' }}>
                  <Text variant="small" color="secondary">
                    {metric.label}
                  </Text>
                  <Text variant="h2" weight="bold" style={{ marginTop: '8px' }}>
                    {metric.value}
                  </Text>
                  {metric.trend && metric.trendValue && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '8px',
                        color: getTrendColor(metric.trend),
                      }}
                    >
                      <span style={{ fontSize: '14px' }}>{getTrendIcon(metric.trend)}</span>
                      <Text variant="small" style={{ color: getTrendColor(metric.trend) }}>
                        {metric.trendValue}
                      </Text>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </Grid>
        )}
      </Section>
    </div>
  );
}
