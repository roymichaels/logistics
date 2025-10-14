# Deployed Database Schema - Current State

**Generated:** 2025-10-14
**Source:** Live Supabase Database
**Purpose:** Complete reference of actually deployed schema (not migration files)

---

## Database Overview

This document reflects the **actual deployed state** of the Supabase database, extracted directly from the live database instance. This is the source of truth for what currently exists in production.

### Applied Migrations (35 total)
Latest migration: `20251014083154_fix_business_rls_policies_v2.sql`

---

## Core Tables

### 1. Users & Authentication

#### `users` - Core user table
- **Primary Key:** `id` (uuid)
- **Unique:** `telegram_id` (text)
- **Key Columns:**
  - `id` (uuid) - Auth UUID from Supabase Auth
  - `telegram_id` (text) - Telegram user identifier
  - `name` (text)
  - `role` (user_role enum) - Infrastructure-level role
  - `business_id` (uuid, nullable) - Current active business context
  - `session_token`, `session_expires_at` - Session management
  - `is_online`, `last_active`, `last_login` - Presence tracking
  - `registration_status` (text)

#### `user_registrations` - Registration requests
- Tracks pending/approved/rejected user registration requests
- Status: pending, approved, rejected

#### `user_business_roles` - Business-specific role assignments
- Maps users to businesses with specific roles
- Supports both system roles and custom roles
- One role per user per business
- Fields: `ownership_percentage`, `commission_percentage`

#### `user_business_contexts` - Active business context
- Tracks which business a user is currently operating in
- One context per user

#### `user_preferences` - User settings
- Per-app user preferences
- Currently supports 'mode' (only 'real' mode)

#### `user_presence` - Online status
- Real-time user presence tracking
- Status: online, away, busy, offline

#### `user_pins` - PIN authentication
- Stores hashed PINs for users
- Failed attempt tracking and lockout

#### `pin_sessions` - Active PIN sessions
- Session tokens for PIN-authenticated sessions
- Expiration tracking

#### `pin_settings` - PIN configuration per business
- PIN length requirements (4-8 digits)
- Max failed attempts, lockout duration
- PIN change requirements

#### `pin_audit_log` - PIN security audit trail
- Tracks all PIN-related actions

#### `login_history` - Login audit trail
- Success/failure tracking
- IP addresses, suspicious activity flagging

---

### 2. Businesses & Organizations

#### `businesses` - Business entities
- **Primary Key:** `id` (uuid)
- **Key Fields:**
  - `name`, `description`, `business_type`
  - `active` (boolean)
  - `owned_by_infrastructure_owner` (uuid) - Infrastructure owner reference
  - `infrastructure_equity_percentage` (numeric)
  - `default_currency` (ILS, USD, EUR)
  - Financial fields: `revenue_share_percentage`, `profit_margin_target`

#### `business_types` - Business type definitions
- Managed by infrastructure owners
- Fields: `type_value`, `display_name`, `description`, `display_order`, `active`

#### `business_users` - Legacy business membership (still in use)
- Links telegram_id to businesses
- Role assignments, ownership %, commission %
- Active status tracking

#### `business_equity` - Equity ownership records
- Tracks stakeholder equity in businesses
- Equity types: common, preferred, founder, employee
- Vesting tracking with `vested_percentage`
- Validation: total equity cannot exceed 100%

#### `infrastructure_ownership` - Infrastructure owner equity
- Tracks infrastructure owner ownership of businesses
- Acquisition types: creation, investment, acquisition, transfer
- One record per infrastructure_owner per business

---

### 3. Role-Based Access Control (RBAC)

#### `roles` - System roles
- Infrastructure and business-scoped roles
- Hierarchy levels for permission inheritance
- Key roles: infrastructure_owner, business_owner, manager, driver, warehouse, etc.

#### `permissions` - System permissions
- Granular permission definitions
- Organized by module (e.g., 'orders', 'inventory', 'users')

#### `role_permissions` - Role-to-permission mappings
- Maps system roles to permissions

#### `custom_roles` - Business-specific custom roles
- Businesses can create custom roles based on system roles
- Business-scoped only

#### `custom_role_permissions` - Custom role permissions
- Maps custom roles to permissions
- Can enable/disable specific permissions

#### `user_permissions_cache` - Performance cache
- Cached permission sets for users per business
- Includes cache version for invalidation

#### `role_change_log` - Audit trail for role changes
- Tracks all role assignments, removals, and modifications

---

### 4. Products & Inventory

#### `products` - Product catalog
- **Primary Key:** `id` (uuid)
- **Unique:** `sku` (text)
- **Business-scoped** - All products belong to a business
- Fields: name, description, category, price, unit, barcode

#### `inventory_locations` - Storage locations
- **Unique:** `code` (text)
- Types: central, warehouse, hub, vehicle, storefront
- Business-scoped

#### `inventory_records` - Current stock levels
- **Unique:** (product_id, location_id)
- Tracks: on_hand_quantity, reserved_quantity, damaged_quantity
- Real-time stock tracking

#### `inventory_logs` - Inventory transaction history
- Log types: restock, transfer, adjustment, reservation, release, sale
- Audit trail for all inventory movements

#### `inventory_movements` - Warehouse-to-warehouse/driver movements
- Movement types: infrastructure_allocation, business_transfer, driver_loading, delivery_fulfillment, return_to_warehouse, adjustment, damaged_write_off, theft_loss
- Tracks: from/to warehouses, from/to drivers
- Approval workflow

#### `driver_vehicle_inventory` - Driver-specific inventory
- Tracks products loaded on driver vehicles
- Vehicle identifier support for multiple vehicles per driver
- Zone tracking, source warehouse tracking
- Reserved and damaged quantity tracking

#### `inventory_reconciliation` - Stock counting
- Status: scheduled, in_progress, completed, approved, rejected
- Generates unique reconciliation numbers

#### `reconciliation_items` - Individual count items
- Links to reconciliation, tracks variance
- Variance reasons: damaged, theft, miscount, system_error, expired, other

#### `warehouse_capacity_limits` - Capacity management
- Product-specific capacity limits per warehouse
- Utilization percentage tracking
- Warning thresholds

---

### 5. Orders & Fulfillment

#### `orders` - Customer orders
- **Business-scoped**
- Status: new, confirmed, preparing, ready, out_for_delivery, delivered, cancelled
- Fields: customer info, delivery address, total amount, payment status
- Driver assignment tracking
- Customer rating (1-5)
- Entry mode: dm (direct message) or storefront

#### `tasks` - Task management
- Types: delivery, warehouse, sales, customer_service, general
- Priority: low, medium, high, urgent
- Status: pending, in_progress, completed, cancelled
- Can link to orders

#### `routes` - Driver routes
- **Unique:** (driver_id, date)
- Status: planned, active, completed
- Route optimization data

---

### 6. Warehouses & Stock Management

#### `warehouses` - Warehouse locations
- **Unique:** `warehouse_code`
- **Scope-aware:** infrastructure or business-level
- Types: infrastructure_central, infrastructure_regional, business_main, business_satellite
- Managed by specific users

#### `stock_allocations` - Stock allocation requests
- Allocation from infrastructure/central warehouses to business warehouses
- Status: pending, approved, in_transit, delivered, partial, rejected, cancelled
- Priority: low, normal, high, urgent
- Auto-generated allocation numbers
- Approval workflow: requested → approved → delivered

#### `restock_requests` - Restock requests
- Status: pending, approved, in_transit, fulfilled, rejected
- From/to location tracking

---

### 7. Zones & Geographic Management

#### `zones` - Geographic delivery zones
- **Unique:** `code`
- **Business-scoped**
- Soft delete support (`deleted_at`)
- City, region, postal codes
- Active status

#### `driver_zone_assignments` - Driver-to-zone mapping
- Active/inactive tracking
- Assignment dates

#### `driver_status_records` - Real-time driver status
- Online/offline tracking
- Current zone tracking

#### `driver_movement_logs` - Driver movement history
- Actions: zone_joined, zone_left, status_changed, inventory_added, inventory_removed, order_assigned
- Zone and product tracking

---

### 8. Messaging & Communication

#### `chat_rooms` - Chat room definitions
- Types: direct, group, channel
- Business-scoped (optional)
- Last message tracking

#### `direct_message_participants` - DM participants
- Links telegram_id to chat rooms
- Unread count tracking

#### `group_chats` - Group chat definitions
- Types: department, project, general
- Member list (text array)
- Active status

#### `channels` - Announcement channels
- Types: announcements, updates, alerts
- Subscriber list (text array)
- Business-scoped

#### `messages` - Chat messages
- Types: text, image, file, system, notification
- Reply threading support
- Edit tracking
- Business context

#### `message_read_receipts` - Read status tracking
- Per-message, per-user read tracking

---

### 9. Financial Management

#### `business_revenue` - Revenue tracking
- **Unique:** (business_id, revenue_date, revenue_source)
- Sources: orders, services, other
- Gross and net amounts

#### `business_costs` - Cost tracking
- Categories: inventory, labor, delivery, overhead, marketing, other
- Date-based tracking

#### `profit_distributions` - Profit distribution records
- Status: calculated, approved, processing, completed, cancelled
- Period-based (start/end dates)
- Total profit and distribution amount tracking

#### `equity_transactions` - Equity change events
- Types: grant, transfer, buyback, dilution, vesting
- Equity types: common, preferred, founder, employee
- From/to stakeholder tracking
- Approval workflow

#### `equity_transfer_log` - Equity transfer audit
- Types: sale, gift, inheritance, compensation, adjustment
- Status: pending, approved, completed, rejected, cancelled
- Percentage and approval tracking

#### `financial_audit_log` - Financial activity audit
- Operations: revenue_viewed, profit_viewed, costs_viewed, distribution_created, commission_calculated, equity_transferred, etc.
- Amount tracking
- Actor and target user tracking

---

### 10. Audit & Logging

#### `system_audit_log` - System-wide audit trail
- Event types: user/business/order/inventory/role/permission operations
- Severity: debug, info, warning, error, critical
- Entity tracking (type + ID)

#### `business_lifecycle_log` - Business lifecycle events
- Events: business_created, activated, deactivated, settings_updated, ownership_restructured, manager_assigned/removed, merged, split
- Approval tracking

#### `permission_check_failures` - Failed permission checks
- Security threat detection
- Failed permission key tracking

#### `cross_scope_access_log` - Cross-business access tracking
- Access types: read, write, delete
- Flagging for review
- Override tracking for infrastructure managers

#### `data_export_log` - Data export tracking
- Export types: financial_report, order_report, inventory_report, user_data, business_analytics, audit_log
- Export formats: csv, pdf, excel, json, xml

#### `zone_audit_logs` - Zone change tracking
- Actions: created, updated, deleted, restored

---

### 11. Support & Override System

#### `support_override_sessions` - Infrastructure manager override sessions
- Time-limited cross-business access
- Status: active, expired, deactivated, revoked
- Expiration tracking

#### `support_override_actions` - Actions taken during override
- Action types: read, update, create, support_assist
- Previous/new state tracking
- Entity targeting

---

### 12. Application Configuration

#### `app_config` - Application-wide settings
- Key-value configuration storage
- Supports JSON config data

#### `notifications` - User notifications
- Types: info, warning, error, success
- Read/unread tracking

#### `sales_logs` - Sales transaction logs
- Product, location, quantity, amount tracking

---

## Enums

### `user_role`
```
user, infrastructure_owner, business_owner, manager, dispatcher, driver,
warehouse, sales, customer_service, infrastructure_manager,
infrastructure_dispatcher, infrastructure_driver, infrastructure_warehouse,
infrastructure_accountant
```

### `user_registration_status`
```
pending, approved, rejected
```

### `order_entry_mode`
```
dm, storefront
```

### `order_priority`
```
low, medium, high, urgent
```

### `inventory_location_type`
```
central, warehouse, hub, vehicle, storefront
```

### `inventory_log_type`
```
restock, transfer, adjustment, reservation, release, sale
```

### `driver_availability_status`
```
available, on_break, delivering, off_shift
```

### `driver_movement_action`
```
zone_joined, zone_left, status_changed, inventory_added,
inventory_removed, order_assigned
```

### `restock_request_status`
```
pending, approved, in_transit, fulfilled, rejected
```

---

## Database Functions (56 total)

### Authentication & Authorization
- `get_auth_uid()` - Get current user's UUID from JWT
- `get_telegram_id_from_jwt()` - Get Telegram ID from JWT
- `is_infra_owner_from_jwt()` - Check if user is infrastructure owner
- `has_valid_pin_session()` - Validate PIN session
- `is_pin_required()` - Check if business requires PIN
- `validate_user_session()` - Validate session token
- `update_user_session()` - Update user session
- `invalidate_user_session()` - Invalidate session
- `cleanup_expired_sessions()` - Remove expired sessions

### Permission System
- `get_user_permissions()` - Get user's permissions for a business
- `user_has_permission_check()` - Check specific permission
- `has_business_role()` - Check if user has role in business
- `can_manage_users()` - Check user management permission
- `debug_user_permissions()` - Debug permission system

### Business Management
- `get_business_summaries()` - Get business dashboard summaries
- `ensure_infrastructure_owner_business_access()` - Ensure infrastructure owners have access to all businesses
- `get_business_equity_breakdown()` - Get equity distribution for a business

### Financial Functions
- `calculate_profit_distribution()` - Calculate profit distribution by ownership
- `get_business_profitability_report()` - Profitability metrics
- `get_cross_business_revenue()` - Revenue across businesses
- `get_cost_center_analysis()` - Cost analysis
- `get_financial_summary_by_period()` - Period-based financial summary
- `get_financial_export_data()` - Export financial data

### Warehouse & Inventory
- `get_pending_allocations()` - Get pending stock allocations
- `approve_stock_allocation()` - Approve allocation request
- `reject_stock_allocation()` - Reject allocation request
- `fulfill_stock_allocation()` - Mark allocation as fulfilled
- `generate_allocation_number()` - Generate unique allocation number
- `get_warehouse_stock_summary()` - Stock summary for warehouse

### Support Override System
- `activate_support_override()` - Create override session
- `deactivate_support_override()` - End override session
- `has_active_support_override()` - Check active override
- `log_support_override_action()` - Log override action
- `expire_old_support_override_sessions()` - Cleanup expired overrides

### Messaging
- `get_or_create_dm_room()` - Get/create direct message room
- `add_group_member()` - Add member to group chat
- `remove_group_member()` - Remove member from group chat
- `add_channel_subscriber()` - Subscribe to channel
- `remove_channel_subscriber()` - Unsubscribe from channel
- `reset_dm_unread_count()` - Mark messages as read

### Sync & Maintenance
- `sync_all_users_with_auth()` - Sync users table with auth.users
- `sync_user_id_from_auth()` - Sync single user
- `validate_data_integrity()` - Run integrity checks

---

## Triggers (51 total)

### Auto-update `updated_at` timestamps
- businesses, business_users, business_types, channels, driver_inventory_records
- group_chats, inventory_locations, inventory_records, restock_requests
- user_registrations, zones

### Audit Triggers
- businesses: audit_trigger_func (INSERT/UPDATE/DELETE)
- orders: audit_trigger_func (INSERT/UPDATE/DELETE)
- stock_allocations: audit_trigger_func (INSERT/UPDATE)
- zones: log_zone_change (INSERT/UPDATE)
- user_business_roles: log_role_change (INSERT/UPDATE/DELETE)

### Business ID Validation
- orders, products, zones: prevent_null_business_id (INSERT/UPDATE)

### Equity Validation
- business_equity: validate_business_equity_total (INSERT/UPDATE)
- infrastructure_ownership: validate_business_equity (INSERT/UPDATE)

### Permission Cache Invalidation
- user_business_roles: invalidate_user_permissions_cache (INSERT/UPDATE/DELETE)

### Infrastructure Owner Sync
- users: sync_infrastructure_owner_on_role_change (INSERT/UPDATE)
- users: sync_user_role_to_auth_metadata (INSERT/UPDATE)
- businesses: add_infrastructure_owners_to_new_business (AFTER INSERT)

### Stock Allocation
- stock_allocations: set_allocation_number (BEFORE INSERT)
- stock_allocations: validate_allocation_scope (BEFORE INSERT)

### Messaging
- messages: increment_dm_unread_count (AFTER INSERT)

---

## Row Level Security (RLS) Policies

**Total Policies:** 300+

### Key RLS Patterns

1. **Infrastructure Owner Access:** Infrastructure owners can access all data across all businesses
   - Uses `is_infra_owner_from_jwt()` helper function

2. **Business-Scoped Access:** Users can only access data for businesses they're associated with
   - Checks `user_business_roles` table for active role assignments

3. **Self-Service:** Users can always access their own data
   - Uses `auth.uid()` or JWT telegram_id

4. **Role-Based:** Actions restricted by role
   - Business owners can manage their businesses
   - Managers have subset of owner permissions
   - Drivers access their own assignments

5. **Anon Access:** Limited anonymous access for registration
   - `user_registrations` allows anon SELECT and authenticated INSERT

### Critical Security Rules
- All financial data restricted to infrastructure_owner, infrastructure_accountant, and business owners
- PIN data only accessible by user or infrastructure_owner
- Cross-scope access is logged and flagged
- Support overrides are time-limited and fully audited

---

## Indexes

**Total Indexes:** 400+

### High-Performance Query Patterns

1. **Business Context Lookups**
   - `idx_user_business_roles_lookup` on (user_id, business_id, is_active)
   - `idx_businesses_infrastructure_owner`

2. **Order Processing**
   - `idx_orders_business_status` on (business_id, status)
   - `idx_orders_assigned_driver`

3. **Inventory Tracking**
   - `idx_driver_vehicle_inv_driver`, `idx_driver_vehicle_inv_product`
   - `idx_inventory_records_product_id`, `idx_inventory_records_location_id`

4. **Financial Queries**
   - `idx_business_revenue_lookup` on (business_id, revenue_date, revenue_source)
   - `idx_business_costs_lookup` on (business_id, cost_date, cost_category)

5. **Audit & Security**
   - `idx_system_audit_business_created` on (business_id, created_at DESC)
   - `idx_login_history_suspicious` (partial, where is_suspicious = true)

---

## Critical Dependencies

### Foreign Key Relationships

1. **Users → Businesses:** users.business_id → businesses.id (nullable, current context)
2. **Business Equity → Users:** business_equity.stakeholder_id → users.id
3. **Orders → Businesses:** orders.business_id → businesses.id (mandatory)
4. **Products → Businesses:** products.business_id → businesses.id (mandatory)
5. **Warehouses → Businesses:** warehouses.business_id → businesses.id (nullable for infrastructure warehouses)
6. **User Business Roles → Users/Businesses:** Links users to businesses with roles

### Cascade Behaviors

**ON DELETE CASCADE:**
- business_equity → businesses
- business_revenue → businesses
- business_costs → businesses
- inventory_records → inventory_locations
- custom_roles → businesses
- user_business_roles → users, businesses

**ON DELETE RESTRICT:**
- infrastructure_ownership → users (infrastructure_owner_id)
- business_equity → users (stakeholder_id)
- warehouses → businesses (for business warehouses)

**ON DELETE SET NULL:**
- users → businesses (business_id, current context can be cleared)
- orders → drivers (assigned_driver can be unassigned)

---

## Schema Health Checks

### Data Integrity Rules

1. **Equity Validation:** Total equity per business cannot exceed 100%
2. **Business ID Enforcement:** Orders, products, zones must have business_id
3. **Stock Allocation Scope:** Allocations must respect infrastructure/business boundaries
4. **Session Management:** Expired sessions are automatically cleaned up
5. **Warehouse Scope:** Infrastructure warehouses must have null business_id, business warehouses must have business_id

### Validation Functions
- `validate_data_integrity()` - Comprehensive integrity check function
- `validate_business_equity()` - Equity percentage validation
- `validate_business_equity_total()` - Total equity validation

---

## Notes

1. **No Demo Data:** All demo data has been removed from the schema
2. **Production Ready:** Schema is designed for multi-tenant production use
3. **Audit Trail:** Comprehensive audit logging for all critical operations
4. **Security First:** RLS policies enforce data isolation and role-based access
5. **Performance Optimized:** Extensive indexing for common query patterns
6. **Business-Centric:** Most data is scoped to businesses with infrastructure oversight

---

## Migration Status

**Latest Applied Migration:** `20251014083154_fix_business_rls_policies_v2.sql`

All migrations in `supabase/migrations/` have been successfully applied to the database.

---

**End of Schema Documentation**
