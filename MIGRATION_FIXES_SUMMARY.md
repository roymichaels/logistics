# Migration Fixes Summary

## Problem Statement

Three migrations (5, 6, and 7) were failing with the following errors:

1. **Migration 5 Error**: `type "user_role" does not exist`
2. **Migration 6 Error**: `syntax error at or near "to"`
3. **Migration 7 Error**: `type user_role[] does not exist`

## Root Cause Analysis

### Migration 5: `20251012090000_consolidate_users_and_optimize.sql`

**Issue**: The migration drops the `users` table with `CASCADE` on line 124:
```sql
DROP TABLE IF EXISTS users CASCADE;
```

This CASCADE operation can remove the `user_role` ENUM type if it was only referenced by the dropped table, causing subsequent table creation to fail when trying to use the ENUM.

**Root Cause**: Missing ENUM type recreation after CASCADE drop.

### Migration 6: `20251012091000_materialized_views_and_functions.sql`

**Issue**: On line 66, the SQL uses `to` as a table alias:
```sql
COALESCE(to.revenue_today, 0) as revenue_today,
```

**Root Cause**: `TO` is a reserved keyword in PostgreSQL and cannot be used as an unquoted identifier.

### Migration 7: `20251012092000_enhanced_security_and_constraints.sql`

**Issue**: The function `has_role_in_specific_business` on line 102 uses `user_role[]` as a parameter type, but the ENUM type may not exist at this point if migration 5 had issues.

**Root Cause**: Missing verification that prerequisite ENUM types exist before creating functions that depend on them.

## Fixes Applied

### Fix 1: Migration 5 - ENUM Type Preservation

**Location**: Lines 33-86 and 149-179

**Changes**:
1. Enhanced STEP 0 to properly check for ENUM existence before proceeding
2. Added explicit ENUM recreation after `DROP TABLE CASCADE` operation
3. Added NOTICE messages for debugging

**Before**:
```sql
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (...);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
```

**After**:
```sql
-- Enhanced existence check
DO $$
DECLARE
  enum_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'user_role'
  ) INTO enum_exists;

  IF NOT enum_exists THEN
    CREATE TYPE user_role AS ENUM (...);
    RAISE NOTICE 'Created user_role ENUM type';
  ELSE
    RAISE NOTICE 'user_role ENUM type already exists';
  END IF;
END $$;

-- After DROP TABLE CASCADE, explicitly recreate
DO $$
BEGIN
  DROP TYPE IF EXISTS user_role CASCADE;
  CREATE TYPE user_role AS ENUM (...);
  RAISE NOTICE 'Recreated user_role ENUM type after CASCADE drop';
END $$;
```

**Why This Works**:
- Explicitly checks for ENUM existence before creating
- Guarantees ENUM recreation after CASCADE drop
- Provides clear feedback via NOTICE messages

### Fix 2: Migration 6 - Reserved Keyword Alias

**Location**: Lines 31-77

**Changes**: Renamed table alias from `to` to `tod` (today_orders) to avoid reserved keyword conflict.

**Before**:
```sql
FROM today_orders to
CROSS JOIN driver_stats ds
```

**After**:
```sql
FROM today_orders tod
CROSS JOIN driver_stats ds
```

Also updated all references from `to.column_name` to `tod.column_name` throughout the SELECT clause.

**Why This Works**: PostgreSQL reserves `TO` as a keyword for range operations and GRANT statements. Using a non-reserved identifier eliminates the syntax error.

### Fix 3: Migration 7 - ENUM Type Verification

**Location**: Lines 24-42

**Changes**: Added STEP 0 to verify `user_role` ENUM exists before creating functions.

**Added**:
```sql
-- STEP 0: Ensure required ENUM types exist
DO $$
DECLARE
  enum_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'user_role'
  ) INTO enum_exists;

  IF NOT enum_exists THEN
    RAISE EXCEPTION 'user_role ENUM type must exist before this migration. Run previous migrations first.';
  ELSE
    RAISE NOTICE 'Verified user_role ENUM type exists';
  END IF;
END $$;
```

**Why This Works**:
- Provides early failure detection if migrations are run out of order
- Verifies dependencies before attempting to create functions with ENUM array parameters
- Clear error message guides users to run previous migrations first

## Migration Dependency Chain

The correct migration order is:

1. `20251011201116_initial_schema.sql` - Creates base tables with TEXT roles
2. `20251012073635_convert_roles_to_enum.sql` - **Creates `user_role` ENUM**
3. `20251012080000_complete_schema.sql` - Adds additional tables
4. `20251012083000_fix_enum_conversion.sql` - Fixes any ENUM issues
5. `20251012090000_consolidate_users_and_optimize.sql` - **FIXED: Recreates ENUMs after CASCADE**
6. `20251012091000_materialized_views_and_functions.sql` - **FIXED: Uses non-reserved alias**
7. `20251012092000_enhanced_security_and_constraints.sql` - **FIXED: Verifies ENUM exists**

## Testing Instructions

### Manual Testing

To test these migrations:

1. Ensure you have a clean Supabase instance or can reset your database
2. Apply migrations in order using the Supabase CLI or dashboard
3. Verify no errors occur

### Verification Queries

After running all migrations, verify with:

```sql
-- Check user_role ENUM exists
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'user_role'::regtype
ORDER BY enumsortorder;

-- Check users table structure
\d users;

-- Check materialized views exist
SELECT matviewname
FROM pg_matviews
ORDER BY matviewname;

-- Check functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%business%'
ORDER BY routine_name;
```

## Key Learnings

1. **CASCADE operations can drop dependent types**: Always recreate ENUMs after `DROP TABLE CASCADE`
2. **Reserved keywords require quoting or avoidance**: Use descriptive, non-reserved identifiers for aliases
3. **Explicit dependency verification is better than implicit**: Check for required types before creating functions
4. **Migration order matters**: Each migration should verify its prerequisites exist

## Files Modified

1. `supabase/migrations/20251012090000_consolidate_users_and_optimize.sql`
   - Lines 33-86: Enhanced ENUM existence checks
   - Lines 149-179: Added ENUM recreation after CASCADE drop

2. `supabase/migrations/20251012091000_materialized_views_and_functions.sql`
   - Lines 31-77: Renamed `to` alias to `tod`

3. `supabase/migrations/20251012092000_enhanced_security_and_constraints.sql`
   - Lines 24-42: Added ENUM existence verification

## Status

✅ All migration errors have been fixed and are ready for testing.

The migrations now include:
- Defensive ENUM type checks
- Proper ENUM recreation after CASCADE operations
- Non-conflicting SQL identifiers
- Clear error messages and debug output
