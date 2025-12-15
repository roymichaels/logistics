import React, { useState } from 'react';
import { Box, Typography, Button, Grid, Section } from '@/components/atoms';

export interface MetricCard {
  id: string;
  label: string;
  value: string | number;
  change?: {
    value: number;
    direction: 'up' | 'down';
    period?: string;
  };
  trend?: 'positive' | 'negative' | 'neutral';
  icon?: string;
}

export interface ChartWidget {
  id: string;
  title: string;
  description?: string;
  component: React.ComponentType<any>;
  span?: 1 | 2 | 3 | 4;
  height?: 'small' | 'medium' | 'large' | 'auto';
}

export interface DateRange {
  label: string;
  value: string;
  startDate?: Date;
  endDate?: Date;
}

export interface AnalyticsTemplateProps {
  title: string;
  actions?: React.ReactNode;

  // Time Period Selection
  dateRanges?: DateRange[];
  selectedDateRange?: string;
  onDateRangeChange?: (rangeValue: string) => void;
  allowCustomDateRange?: boolean;

  // Metrics Row
  metrics: MetricCard[];

  // Charts/Widgets
  charts: ChartWidget[];

  // Comparison Mode
  allowComparison?: boolean;
  comparisonActive?: boolean;
  onToggleComparison?: () => void;

  // Export
  allowExport?: boolean;
  onExport?: (format: 'csv' | 'pdf' | 'xlsx') => void;

  // Filters
  filters?: Array<{
    id: string;
    label: string;
    options: Array<{ value: string; label: string }>;
    value: string;
    onChange: (value: string) => void;
  }>;

  // Loading
  loading?: boolean;
}

export const AnalyticsTemplate: React.FC<AnalyticsTemplateProps> = ({
  title,
  actions,
  dateRanges = [],
  selectedDateRange,
  onDateRangeChange,
  allowCustomDateRange = true,
  metrics,
  charts,
  allowComparison = true,
  comparisonActive = false,
  onToggleComparison,
  allowExport = true,
  onExport,
  filters = [],
  loading = false,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExport = (format: 'csv' | 'pdf' | 'xlsx') => {
    onExport?.(format);
    setShowExportMenu(false);
  };

  return (
    <Box className="analytics-template">
      {/* Header */}
      <Box style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <Typography variant="h1">{title}</Typography>

        {/* Header Actions */}
        <Box style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {/* Date Range Selector */}
          {dateRanges.length > 0 && (
            <select
              value={selectedDateRange}
              onChange={(e) => onDateRangeChange?.(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                fontSize: '14px'
              }}
            >
              {dateRanges.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
              {allowCustomDateRange && (
                <option value="custom">Custom Range</option>
              )}
            </select>
          )}

          {/* Comparison Toggle */}
          {allowComparison && onToggleComparison && (
            <Button
              variant={comparisonActive ? 'primary' : 'secondary'}
              size="small"
              onClick={onToggleComparison}
            >
              {comparisonActive ? '✓ Compare' : 'Compare'}
            </Button>
          )}

          {/* Export Menu */}
          {allowExport && onExport && (
            <Box style={{ position: 'relative' }}>
              <Button
                variant="secondary"
                size="small"
                onClick={() => setShowExportMenu(!showExportMenu)}
              >
                ↓ Export
              </Button>
              {showExportMenu && (
                <Box style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  zIndex: 10,
                  minWidth: '120px'
                }}>
                  <Button
                    variant="text"
                    onClick={() => handleExport('csv')}
                    style={{ width: '100%', textAlign: 'left', padding: '8px 12px' }}
                  >
                    Export CSV
                  </Button>
                  <Button
                    variant="text"
                    onClick={() => handleExport('xlsx')}
                    style={{ width: '100%', textAlign: 'left', padding: '8px 12px' }}
                  >
                    Export Excel
                  </Button>
                  <Button
                    variant="text"
                    onClick={() => handleExport('pdf')}
                    style={{ width: '100%', textAlign: 'left', padding: '8px 12px' }}
                  >
                    Export PDF
                  </Button>
                </Box>
              )}
            </Box>
          )}

          {actions}
        </Box>
      </Box>

      {/* Filters */}
      {filters.length > 0 && (
        <Box style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px',
          flexWrap: 'wrap'
        }}>
          {filters.map((filter) => (
            <Box key={filter.id} style={{ minWidth: '150px' }}>
              <select
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  fontSize: '14px'
                }}
              >
                <option value="">{filter.label}</option>
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Box>
          ))}
        </Box>
      )}

      {/* Loading State */}
      {loading ? (
        <Box style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '60px'
        }}>
          <Typography>Loading analytics...</Typography>
        </Box>
      ) : (
        <>
          {/* Metrics Row */}
          <Grid
            columns={{ mobile: 2, tablet: 4, desktop: 4 }}
            gap={16}
            style={{ marginBottom: '32px' }}
          >
            {metrics.map((metric) => {
              const getTrendColor = () => {
                if (metric.trend === 'positive') return '#10b981';
                if (metric.trend === 'negative') return '#ef4444';
                return '#6b7280';
              };

              return (
                <Box
                  key={metric.id}
                  style={{
                    padding: '20px',
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  <Box style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <Typography variant="caption" style={{ color: '#6b7280' }}>
                      {metric.label}
                    </Typography>
                    {metric.icon && <span>{metric.icon}</span>}
                  </Box>
                  <Typography variant="h2" style={{ marginBottom: '4px' }}>
                    {metric.value}
                  </Typography>
                  {metric.change && (
                    <Box style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Typography
                        variant="caption"
                        style={{ color: getTrendColor() }}
                      >
                        {metric.change.direction === 'up' ? '↑' : '↓'}{' '}
                        {Math.abs(metric.change.value)}%
                      </Typography>
                      {metric.change.period && (
                        <Typography variant="caption" style={{ color: '#9ca3af' }}>
                          vs {metric.change.period}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              );
            })}
          </Grid>

          {/* Charts Grid */}
          <Grid
            columns={{ mobile: 1, tablet: 2, desktop: 2 }}
            gap={24}
          >
            {charts.map((chart) => {
              const ChartComponent = chart.component;
              const getHeight = () => {
                if (chart.height === 'small') return '250px';
                if (chart.height === 'medium') return '400px';
                if (chart.height === 'large') return '600px';
                return 'auto';
              };

              return (
                <Section
                  key={chart.id}
                  style={{
                    gridColumn: chart.span ? `span ${chart.span}` : 'auto',
                    minHeight: getHeight(),
                  }}
                >
                  <Box style={{ marginBottom: '16px' }}>
                    <Typography variant="h3" style={{ marginBottom: '4px' }}>
                      {chart.title}
                    </Typography>
                    {chart.description && (
                      <Typography variant="caption" style={{ color: '#6b7280' }}>
                        {chart.description}
                      </Typography>
                    )}
                  </Box>
                  <ChartComponent />
                </Section>
              );
            })}
          </Grid>
        </>
      )}
    </Box>
  );
};
