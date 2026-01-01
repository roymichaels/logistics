import React from 'react';
import { OrderFilters } from '../types';
import { Button, Input } from '@ui/primitives';
import { Select, Card } from '@ui/molecules';

interface OrderFiltersPanelProps {
  filters: OrderFilters;
  onChange: (filters: OrderFilters) => void;
  onClear: () => void;
}

export function OrderFiltersPanel({ filters, onChange, onClear }: OrderFiltersPanelProps) {
  return (
    <Card style={{ padding: '1rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'end', flexWrap: 'wrap' }}>
        <div style={{ flex: '1', minWidth: '200px' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
            Status
          </label>
          <Select
            value={filters.status || ''}
            onChange={(e: any) => onChange({ ...filters, status: e.target.value || undefined })}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>

        <Button variant="secondary" onClick={onClear}>
          Clear Filters
        </Button>
      </div>
    </Card>
  );
}
