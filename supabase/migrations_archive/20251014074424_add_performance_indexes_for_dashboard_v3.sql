/*
  # Add Performance Indexes for Infrastructure Owner Dashboard
  
  1. New Indexes
    - orders(business_id) - for cross-business order queries
    - orders(created_at) - for date-based revenue filtering
    - orders(status) - for pending/active order counts
    - stock_allocations(to_business_id, allocation_status) - for pending allocation counts
    - users(role) - for driver count queries
    - users(business_id, role) - composite index for business-specific role queries
    - businesses(active) - for active business filtering
  
  2. Performance
    - All queries in dashboard will use these indexes
    - Significantly faster cross-business aggregations
    - Better performance for infrastructure_owner role queries
*/

-- Orders table indexes
CREATE INDEX IF NOT EXISTS idx_orders_business_id ON orders(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_business_status ON orders(business_id, status);

-- Stock allocations indexes (using to_business_id column)
CREATE INDEX IF NOT EXISTS idx_stock_allocations_to_business ON stock_allocations(to_business_id);
CREATE INDEX IF NOT EXISTS idx_stock_allocations_status ON stock_allocations(allocation_status);
CREATE INDEX IF NOT EXISTS idx_stock_allocations_business_status ON stock_allocations(to_business_id, allocation_status);

-- Users table indexes (no status column exists, so skip that)
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_business_role ON users(business_id, role) WHERE business_id IS NOT NULL;

-- Businesses table indexes
CREATE INDEX IF NOT EXISTS idx_businesses_active ON businesses(active);
CREATE INDEX IF NOT EXISTS idx_businesses_created_at ON businesses(created_at DESC);

-- System audit log indexes (already exist but verify)
CREATE INDEX IF NOT EXISTS idx_system_audit_business_created ON system_audit_log(business_id, created_at DESC);

-- Add helpful comments
COMMENT ON INDEX idx_orders_business_id IS 'Fast cross-business order queries for infrastructure owner';
COMMENT ON INDEX idx_stock_allocations_business_status IS 'Fast pending allocation counts per business';
COMMENT ON INDEX idx_users_business_role IS 'Fast driver counts per business';
