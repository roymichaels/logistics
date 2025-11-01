# Comprehensive RBAC and User Flow System

## Overview

This document describes the complete role-based access control (RBAC) system, user onboarding flows, and security architecture implemented in the platform.

## Architecture Principles

### 1. Zero-Trust Security Model
- **Every operation validated at database level** via Row Level Security (RLS) policies
- **No client-side security** - frontend permissions are UX hints only
- **Complete data isolation** between businesses and infrastructure entities
- **Service role bypass** for edge functions with full audit logging

### 2. Multi-Tenant Architecture
- **Infrastructure Level**: Platform owners managing multiple businesses
- **Business Level**: Individual businesses with teams and operations
- **User Level**: Individual user accounts with roles scoped to businesses
- **Driver Level**: Freelance drivers working across multiple businesses

### 3. Automated Role Transitions
- **Business creation** → Automatic promotion to business_owner
- **Driver application approval** → Automatic promotion to driver role
- **JWT claims sync** → Immediate session update with new permissions
- **Audit trail** → Every role change logged with reason and metadata

---

## Role Hierarchy and Scopes

### Global Roles (Platform-Wide)

#### 1. **infrastructure_owner**
- **Scope**: Platform-wide access
- **Permissions**:
  - Manage all businesses and infrastructures
  - Approve driver applications
  - View all financial data
  - Access system configuration
  - Manage user roles globally
- **Use Case**: Platform administrators and owners

#### 2. **user** (Default)
- **Scope**: Personal account only
- **Permissions**:
  - View own profile
  - Update personal information
  - Start onboarding workflows
- **Use Case**: New users before role assignment

### Business-Scoped Roles

#### 3. **business_owner**
- **Scope**: Specific business(es) owned
- **Permissions**:
  - Full control over owned business
  - Manage team members and assign roles
  - View financial data and equity
  - Configure business settings
  - Approve purchases and payouts
- **Use Case**: Business founders and co-owners
- **Assignment**: Automatic upon business creation

#### 4. **manager**
- **Scope**: Specific business
- **Permissions**:
  - Manage operations and orders
  - Assign drivers and dispatch deliveries
  - View inventory and products
  - Approve restock requests
  - Cannot view equity or owner-level financials
- **Use Case**: Operations managers

#### 5. **dispatcher**
- **Scope**: Specific business
- **Permissions**:
  - View and assign orders to drivers
  - Track deliveries in real-time
  - Communicate with drivers
  - View routes and zones
  - Cannot manage inventory or view financials
- **Use Case**: Dispatch coordinators

#### 6. **driver** (Freelance Model)
- **Scope**: Cross-business (freelance)
- **Permissions**:
  - View assigned orders
  - Accept/decline delivery offers
  - Update delivery status
  - Manage personal inventory
  - View own earnings and payouts
  - Cannot access business data
- **Use Case**: Delivery drivers working across multiple businesses
- **Assignment**: Automatic upon application approval

#### 7. **warehouse**
- **Scope**: Specific business
- **Permissions**:
  - Manage inventory and stock levels
  - Approve/fulfill restock requests
  - Track inventory movements
  - View warehouse operations
  - Cannot view orders or customer data
- **Use Case**: Warehouse staff and inventory managers

#### 8. **sales**
- **Scope**: Multi-business (optional)
- **Permissions**:
  - Create and manage orders
  - View product catalog
  - Track sales performance
  - Manage customer relationships
  - Can work across multiple businesses
- **Use Case**: Sales representatives

#### 9. **customer_service**
- **Scope**: Specific business
- **Permissions**:
  - View orders and customer info
  - Update order status
  - Communicate with customers
  - Create support tickets
  - Cannot modify inventory or financials
- **Use Case**: Customer support staff

---

## User Onboarding Flows

### Flow 1: Business Owner Onboarding

```
1. User signs up (Telegram/Web3)
   ↓
2. Default role: 'user'
   ↓
3. Select onboarding pathway: "Business Owner"
   ↓
4. Fill business details:
   - Business name (English + Hebrew)
   - Order prefix
   - Business type (auto: 'logistics')
   - Branding (colors)
   ↓
5. Submit business creation
   ↓
6. **AUTOMATIC TRIGGERS**:
   a. Business record created with created_by = user.id
   b. Database trigger calls promote_user_to_business_owner()
   c. User role updated: 'user' → 'business_owner'
   d. user_business_roles record created (100% ownership)
   e. business_equity record created (100% equity)
   f. JWT claims synced (role + business_id)
   g. Session refreshed with new claims
   h. role_changes_audit log entry created
   ↓
7. User redirected to business dashboard
   ✓ Full business owner permissions active
```

### Flow 2: Driver Application & Approval

```
1. User signs up
   ↓
2. Default role: 'user'
   ↓
3. Select onboarding pathway: "Become a Driver"
   ↓
4. Fill driver application:
   - Vehicle type
   - License number
   - Phone number
   - Availability
   - Additional notes
   ↓
5. Submit application
   ↓
6. **AUTOMATIC ACTIONS**:
   a. driver_applications record created (status: 'pending')
   b. driver_profiles record created (is_active: false)
   ↓
7. Admin/Manager reviews application
   ↓
8. Admin clicks "Approve"
   ↓
9. **AUTOMATIC TRIGGERS**:
   a. approve_driver_application() function called
   b. Application status: 'pending' → 'approved'
   c. Driver profile activated and verified
   d. User role updated: 'user' → 'driver'
   e. JWT claims synced
   f. role_changes_audit log entry
   g. user_onboarding_status marked complete
   ↓
10. Driver receives approval notification
   ↓
11. Driver can now:
    - View available orders in marketplace
    - Accept delivery offers
    - Earn from deliveries
```

### Flow 3: Team Member Assignment

```
1. Business owner invites team member
   ↓
2. Team member signs up (if new)
   ↓
3. Business owner assigns role via UI
   ↓
4. Edge function: manage-user-role called
   ↓
5. **AUTOMATIC ACTIONS**:
   a. User global_role updated
   b. user_business_roles record created
   c. JWT claims synced with business_id
   d. role_changes_audit log entry
   ↓
6. Team member has scoped permissions
```

---

## Database Triggers and Automation

### Trigger 1: Business Owner Promotion

**File**: `20251101200000_comprehensive_rbac_security_fixes.sql`

**Function**: `trigger_promote_business_owner()`

**Trigger**: `after_business_insert_promote` on `businesses` table

**Flow**:
```sql
INSERT INTO businesses (..., created_by) VALUES (..., user_id)
  ↓
TRIGGER FIRES
  ↓
promote_user_to_business_owner(user_id, business_id)
  ↓
1. Update users SET global_role = 'business_owner'
2. Insert into user_business_roles (100% ownership)
3. Insert into business_equity (founder equity)
4. Insert into role_changes_audit (audit trail)
5. Insert into user_onboarding_status (complete)
6. Insert into system_audit_log (system log)
```

### Trigger 2: Driver Approval

**Function**: `approve_driver_application(application_id, approved_by, notes)`

**Called by**: Admin via edge function or direct RPC

**Flow**:
```sql
SELECT approve_driver_application(app_id, admin_id, notes)
  ↓
1. Update driver_applications SET status = 'approved'
2. Update driver_profiles SET application_status = 'approved', is_active = true
3. Update users SET global_role = 'driver'
4. Insert into role_changes_audit
5. Insert into user_onboarding_status (complete)
6. Insert into system_audit_log
```

---

## RLS Policy Architecture

### Core Principle
**Every table has comprehensive RLS policies enforcing zero-trust security**

### Policy Pattern for Business-Scoped Tables

```sql
-- SELECT: Users can view data in their business context
CREATE POLICY "table_select_by_business"
  ON table_name FOR SELECT
  TO authenticated
  USING (
    -- Infrastructure owners see all
    auth.jwt()->>'role' = 'infrastructure_owner'
    OR
    -- Business owners/managers see their business
    (
      business_id::text = auth.jwt()->>'business_id'
      AND auth.jwt()->>'role' IN ('business_owner', 'manager', ...)
    )
  );

-- INSERT: Only authorized roles can create
CREATE POLICY "table_insert_by_business"
  ON table_name FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt()->>'role' IN ('infrastructure_owner', 'business_owner', 'manager')
    AND (
      auth.jwt()->>'role' = 'infrastructure_owner'
      OR business_id::text = auth.jwt()->>'business_id'
    )
  );

-- UPDATE: Scoped by business and role
CREATE POLICY "table_update_by_business"
  ON table_name FOR UPDATE
  TO authenticated
  USING (/* same as SELECT */)
  WITH CHECK (/* same as SELECT */);

-- Service role bypass (for edge functions)
CREATE POLICY "table_service_role"
  ON table_name FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

### Special Cases

#### Orders Table
```sql
-- Drivers can only see assigned orders
CREATE POLICY "orders_driver_view_assigned"
  ON orders FOR SELECT
  TO authenticated
  USING (
    auth.jwt()->>'role' = 'driver'
    AND assigned_driver_id::text = auth.uid()::text
  );
```

#### Driver Profiles
```sql
-- Drivers can view/update own profile
CREATE POLICY "driver_profiles_own"
  ON driver_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all driver profiles
CREATE POLICY "driver_profiles_admin_view"
  ON driver_profiles FOR SELECT
  TO authenticated
  USING (
    auth.jwt()->>'role' IN ('infrastructure_owner', 'business_owner', 'manager')
  );
```

#### Users Table
```sql
-- Users can view own record
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can insert own record on first login
CREATE POLICY "users_insert_own"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Users can update own record
CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
```

---

## JWT Claims Structure

### Standard Claims (in app_metadata)

```typescript
interface JWTClaims {
  // Primary role
  role: 'user' | 'infrastructure_owner' | 'business_owner' | 'manager' |
        'dispatcher' | 'driver' | 'warehouse' | 'sales' | 'customer_service';

  // Business context (for business-scoped roles)
  business_id?: string;

  // Infrastructure context (for infrastructure roles)
  infrastructure_id?: string;

  // Primary business (for multi-business users)
  primary_business_id?: string;

  // Ownership percentage (for business owners)
  ownership_percentage?: number;
}
```

### Claims Synchronization

**When claims are synced**:
1. After business creation
2. After role change
3. After business context switch
4. On driver application approval

**Edge Function**: `sync-user-claims`
- Reads user data from database
- Builds complete claims object
- Updates auth.users app_metadata
- Triggers session refresh

---

## Permission Validation

### Frontend Permission Check (UX Only)

```typescript
// src/lib/rolePermissions.ts
const permissions = getRolePermissions(user.role);

if (permissions.can_manage_orders) {
  // Show order management UI
}
```

**⚠️ This is for UX only - NOT security!**

### Backend Permission Validation (Security)

**Method 1: RLS Policies** (Automatic)
```sql
-- Enforced on every query automatically
SELECT * FROM orders WHERE business_id = '...';
-- RLS policy checks: Does user have access to this business?
```

**Method 2: Helper Functions** (Explicit)
```sql
SELECT user_has_permission(
  p_user_id := auth.uid(),
  p_permission := 'manage_orders',
  p_business_id := 'business-id-here'
);
```

**Method 3: Edge Function Validation**
```typescript
// In edge function
const { data: { user } } = await supabase.auth.getUser(token);

const userRole = user.app_metadata.role;
const businessId = user.app_metadata.business_id;

if (!canPerformAction(userRole, 'manage_orders', businessId)) {
  throw new Error('Unauthorized');
}
```

---

## Audit Logging

### Comprehensive Audit Trail

#### 1. Role Changes (`role_changes_audit`)
```sql
INSERT INTO role_changes_audit (
  user_id,
  old_role,
  new_role,
  changed_by,
  change_reason,
  business_id,
  metadata
);
```

**Logged automatically on**:
- Business owner promotion
- Driver application approval
- Manual role changes
- Role assignments by admins

#### 2. System Audit Log (`system_audit_log`)
```sql
INSERT INTO system_audit_log (
  actor_id,
  business_id,
  action,
  entity_table,
  entity_id,
  metadata
);
```

**Logged for**:
- User role changes
- Business creation
- Driver approvals
- Permission grants
- Financial transactions
- Data exports
- Sensitive operations

#### 3. Onboarding Status (`user_onboarding_status`)
```sql
INSERT INTO user_onboarding_status (
  user_id,
  onboarding_type,
  step_completed,
  is_complete,
  completed_at,
  data
);
```

**Tracks**:
- Onboarding pathway selection
- Progress through steps
- Completion timestamp
- Form data saved

---

## Security Best Practices Implemented

### 1. Data Isolation
- ✅ Business data completely isolated via RLS
- ✅ Users cannot access other businesses' data
- ✅ Cross-business access requires explicit permission
- ✅ Driver data scoped to individual user

### 2. Principle of Least Privilege
- ✅ Default role: 'user' (minimal permissions)
- ✅ Role-specific permissions enforced at DB level
- ✅ Business owners cannot access platform admin functions
- ✅ Drivers cannot view business internal data

### 3. Audit and Accountability
- ✅ Every role change logged with reason
- ✅ Changed_by field tracks who made changes
- ✅ Timestamps for all sensitive operations
- ✅ Metadata field for additional context

### 4. Automated Security
- ✅ RLS policies enforce security automatically
- ✅ No manual permission checks required
- ✅ Database-level enforcement prevents bypassing
- ✅ Service role isolated to edge functions only

### 5. Defense in Depth
- ✅ Frontend permission checks (UX)
- ✅ Edge function validation (API layer)
- ✅ RLS policies (Database layer)
- ✅ Audit logging (Monitoring layer)

---

## Edge Functions

### 1. `sync-user-claims`
**Purpose**: Synchronize user JWT claims after role changes

**Input**:
```json
{
  "user_id": "uuid",
  "business_id": "uuid", // optional
  "infrastructure_id": "uuid" // optional
}
```

**Actions**:
1. Fetch user data with roles and contexts
2. Build JWT claims object
3. Update auth.users app_metadata
4. Log to audit trail

### 2. `manage-user-role`
**Purpose**: Change user role with validation and logging

**Input**:
```json
{
  "user_id": "uuid",
  "new_role": "business_owner",
  "business_id": "uuid", // optional
  "infrastructure_id": "uuid", // optional
  "reason": "Promoted after business creation"
}
```

**Actions**:
1. Validate requester permissions
2. Update user role
3. Create business role records if needed
4. Sync JWT claims
5. Log to audit trails

### 3. `bootstrap` (Existing)
**Purpose**: Initialize system configuration

### 4. `web3-verify` (Existing)
**Purpose**: Verify Web3 wallet signatures

---

## Testing Checklist

### User Flows
- [ ] New user signup creates 'user' role
- [ ] Business creation promotes to 'business_owner'
- [ ] Driver application creates pending profile
- [ ] Driver approval promotes to 'driver' role
- [ ] Team member assignment creates business role
- [ ] Role changes sync JWT claims immediately

### Data Isolation
- [ ] Business owner A cannot see business B data
- [ ] Driver cannot access business internal data
- [ ] Manager cannot view other businesses
- [ ] Warehouse cannot view orders
- [ ] Customer service cannot modify inventory

### Permission Validation
- [ ] RLS blocks unauthorized queries
- [ ] Edge functions validate roles
- [ ] Frontend hides unavailable features
- [ ] Audit logs record all changes

### Edge Cases
- [ ] User with no business context
- [ ] Multi-business sales representative
- [ ] Ownership transfer between users
- [ ] Driver working for multiple businesses
- [ ] Role downgrade (owner → manager)

---

## Deployment Checklist

### 1. Run Migration
```bash
# Apply comprehensive RBAC migration
supabase db push
```

### 2. Deploy Edge Functions
```bash
# Deploy JWT sync function
supabase functions deploy sync-user-claims

# Deploy role management function
supabase functions deploy manage-user-role
```

### 3. Verify RLS Policies
```sql
-- Check all tables have RLS enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false;
-- Should return 0 rows

-- Check policies exist
SELECT schemaname, tablename, COUNT(*)
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename;
```

### 4. Test User Flows
1. Create test business
2. Verify owner promotion
3. Submit driver application
4. Approve application
5. Verify driver role

### 5. Monitor Audit Logs
```sql
-- Check recent role changes
SELECT * FROM role_changes_audit
ORDER BY created_at DESC
LIMIT 20;

-- Check system audit
SELECT * FROM system_audit_log
WHERE action LIKE '%role%'
ORDER BY created_at DESC
LIMIT 20;
```

---

## Troubleshooting

### Issue: User role not updating after business creation

**Check**:
1. Verify trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'after_business_insert_promote';`
2. Check created_by field: `SELECT id, created_by FROM businesses WHERE id = '...';`
3. Review audit log: `SELECT * FROM role_changes_audit WHERE user_id = '...';`

**Fix**: Re-run promotion function manually:
```sql
SELECT promote_user_to_business_owner('user-id', 'business-id', 'admin-id');
```

### Issue: JWT claims not syncing

**Check**:
1. Edge function deployed: `supabase functions list`
2. Check logs: `supabase functions logs sync-user-claims`
3. Verify auth.users metadata: Query auth schema directly

**Fix**: Call sync manually:
```typescript
await supabase.functions.invoke('sync-user-claims', {
  body: { user_id: '...' }
});
```

### Issue: RLS blocking legitimate queries

**Check**:
1. User JWT claims: `SELECT auth.jwt();`
2. Policy definition: `SELECT * FROM pg_policies WHERE tablename = '...';`
3. Test query with service_role

**Fix**: Adjust RLS policy or add missing business context

---

## Future Enhancements

### Phase 2
- [ ] Multi-factor authentication for owner roles
- [ ] Permission inheritance for custom roles
- [ ] Role-based rate limiting
- [ ] Automated permission cache refresh

### Phase 3
- [ ] Blockchain-based role verification
- [ ] Decentralized identity integration
- [ ] Zero-knowledge permission proofs
- [ ] DAO governance for infrastructure

### Phase 4
- [ ] AI-powered anomaly detection
- [ ] Predictive role assignment
- [ ] Automated compliance reporting
- [ ] Smart contract role management

---

## Support and Maintenance

### Regular Tasks
- Weekly audit log review
- Monthly permission policy review
- Quarterly security audit
- Annual compliance check

### Monitoring Alerts
- Unusual role changes
- Failed permission checks
- Cross-business access attempts
- Service role usage spikes

### Documentation Updates
- Keep role permissions matrix current
- Update flow diagrams after changes
- Document new edge functions
- Maintain troubleshooting guide

---

**Last Updated**: 2025-11-01
**Version**: 1.0
**Maintained By**: Platform Security Team
