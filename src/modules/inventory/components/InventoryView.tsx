import React, { useState } from 'react';
import { PageContainer } from '../../../components/layout/PageContainer';
import { PageHeader } from '../../../components/layout/PageHeader';
import { ContentCard } from '../../../components/layout/ContentCard';
import { Spinner } from '../../../components/atoms/Spinner';
import { Button } from '../../../components/atoms/Button';
import { tokens } from '../../../styles/tokens';
import { InventoryCard } from './InventoryCard';
import { InventoryFiltersPanel } from './InventoryFiltersPanel';
import { InventoryStatsCards } from './InventoryStatsCards';
import { StockAdjustmentForm } from './StockAdjustmentForm';
import type { AggregatedInventory, InventoryFilters, InventoryStats, StockAdjustment } from '../types';

interface InventoryViewProps {
  inventory: AggregatedInventory[];
  stats: InventoryStats;
  loading: boolean;
  error: Error | null;
  filters: InventoryFilters;
  lowStockCount?: number;
  onFilterChange: (filters: InventoryFilters) => void;
  onAdjustStock: (adjustment: StockAdjustment) => Promise<void>;
  onRefresh: () => void;
  adjusting?: boolean;
}

export function InventoryView({
  inventory,
  stats,
  loading,
  error,
  filters,
  lowStockCount = 0,
  onFilterChange,
  onAdjustStock,
  onRefresh,
  adjusting,
}: InventoryViewProps) {
  const [selectedProduct, setSelectedProduct] = useState<AggregatedInventory | null>(null);
  const [showAdjustForm, setShowAdjustForm] = useState(false);

  const handleAdjustSubmit = async (adjustment: StockAdjustment) => {
    await onAdjustStock(adjustment);
    setShowAdjustForm(false);
    setSelectedProduct(null);
  };

  if (loading && inventory.length === 0) {
    return (
      <PageContainer>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh'
        }}>
          <div style={{ textAlign: 'center' }}>
            <Spinner />
            <p style={{ marginTop: '16px', color: tokens.colors.text.secondary }}>טוען מלאי...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh'
        }}>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
            <p style={{ color: tokens.colors.text.primary, marginBottom: '20px' }}>
              {error.message || 'שגיאה בטעינת מלאי'}
            </p>
            <Button onClick={onRefresh}>נסה שוב</Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (showAdjustForm && selectedProduct) {
    return (
      <PageContainer>
        <StockAdjustmentForm
          product={selectedProduct}
          onSubmit={handleAdjustSubmit}
          onCancel={() => {
            setShowAdjustForm(false);
            setSelectedProduct(null);
          }}
          loading={adjusting}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        icon="📦"
        title="מלאי"
        subtitle="ניהול מלאי מוצרים"
      />

      {lowStockCount > 0 && (
        <ContentCard style={{
          background: 'rgba(255, 212, 0, 0.15)',
          border: `1px solid ${tokens.colors.status.warning}`,
          marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <span style={{ color: tokens.colors.status.warning, fontWeight: '600' }}>
              {lowStockCount} פריטים במלאי נמוך
            </span>
          </div>
        </ContentCard>
      )}

      <InventoryStatsCards stats={stats} />

      <InventoryFiltersPanel
        filters={filters}
        onFilterChange={onFilterChange}
      />

      <div style={{ display: 'grid', gap: '12px' }}>
        {inventory.map((item) => (
          <InventoryCard
            key={item.product_id}
            item={item}
            onClick={() => {
              setSelectedProduct(item);
              setShowAdjustForm(true);
            }}
          />
        ))}
      </div>

      {inventory.length === 0 && (
        <ContentCard>
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
            <p style={{ color: tokens.colors.text.secondary }}>
              {filters.status === 'all' ? 'אין פריטי מלאי' : `אין פריטים ב${filters.status === 'low' ? 'מלאי נמוך' : 'מלאי אזל'}`}
            </p>
          </div>
        </ContentCard>
      )}
    </PageContainer>
  );
}
