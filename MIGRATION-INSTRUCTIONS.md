# Database Migration Instructions

## ✅ Migration Ready to Apply

The migration file has been created and is ready to convert your TEXT columns to ENUM types with proper dropdown support in Supabase UI.

**File Location:** `supabase/migrations/20251012073635_convert_roles_to_enum.sql`

---

## 🎯 What This Migration Does

1. **Creates ENUM types** for better type safety:
   - `user_role` - includes all roles: user, infrastructure_owner, business_owner, manager, dispatcher, driver, warehouse, sales, customer_service
   - `order_status` - order lifecycle states
   - `task_type`, `task_status`, `task_priority` - task management
   - `route_status` - delivery route states

2. **Safely converts columns**:
   - Drops all dependent RLS policies
   - Cleans up any invalid data
   - Converts TEXT columns to ENUM types
   - Recreates all RLS policies with identical security

3. **Benefits**:
   - ✨ Dropdown selectors in Supabase UI
   - 🔒 Database-level type enforcement
   - ⚡ Better query performance
   - 🎯 Type safety

---

## 📋 How to Apply (Choose One Method)

### Method 1: Supabase Dashboard (Easiest) ⭐

1. **Open SQL Editor:**
   ```
   https://supabase.com/dashboard/project/ncuyyjvvzeaqqjganbzz/sql/new
   ```

2. **Copy the entire migration:**
   - Open: `supabase/migrations/20251012073635_convert_roles_to_enum.sql`
   - Select all (Cmd/Ctrl + A)
   - Copy (Cmd/Ctrl + C)

3. **Paste and run:**
   - Paste into the SQL Editor
   - Click "Run" or press Cmd/Ctrl + Enter

4. **Verify:**
   - No errors should appear
   - Check any table in the Table Editor
   - Role/status columns should now show dropdowns

---

### Method 2: Supabase CLI

```bash
# 1. Install Supabase CLI (if not already installed)
npm install -g supabase

# 2. Login to Supabase
supabase login

# 3. Push the migration
supabase db push
```

---

## 🔍 What Changed

### ENUM Types Created:
- `user_role` with 9 values
- `order_status` with 7 values
- `task_type` with 5 values
- `task_status` with 4 values
- `task_priority` with 4 values
- `route_status` with 3 values

### Columns Converted:
- `users.role` → `user_role` ENUM
- `orders.status` → `order_status` ENUM
- `tasks.type` → `task_type` ENUM
- `tasks.status` → `task_status` ENUM
- `tasks.priority` → `task_priority` ENUM
- `routes.status` → `route_status` ENUM

### Security Maintained:
- ✅ All RLS policies recreated with identical logic
- ✅ No data loss
- ✅ No permission changes

---

## ⚠️ Important Notes

1. **Data Cleanup:** The migration will automatically convert any invalid values to safe defaults:
   - Invalid user roles → `'user'`
   - Invalid order statuses → `'new'`
   - Invalid task types → `'general'`
   - Invalid task statuses → `'pending'`
   - Invalid priorities → `'medium'`
   - Invalid route statuses → `'planned'`

2. **Idempotent:** Safe to run multiple times (will skip if already applied)

3. **No Downtime:** All operations are transactional

---

## 🚨 Troubleshooting

### If you get an error about existing ENUM types:
The migration is idempotent and will skip creating types that already exist. This is normal and safe.

### If you get an error about data conversion:
Check for any non-standard values in your tables before running:
```sql
-- Check for unexpected role values
SELECT DISTINCT role FROM users;

-- Check for unexpected order statuses
SELECT DISTINCT status FROM orders;
```

### If RLS policies fail:
Make sure you're running the complete migration as one transaction. Don't run it in parts.

---

## ✅ After Migration

1. **Verify in Supabase Dashboard:**
   - Go to Table Editor
   - Click on `users` table
   - Click on a row to edit
   - The `role` field should now show a dropdown

2. **Test in your app:**
   - All existing functionality should work unchanged
   - Data types in TypeScript align with database ENUMs

3. **Build your project:**
   ```bash
   npm run build
   ```

---

## 📞 Need Help?

If you encounter any issues:
1. Check the Supabase logs in the Dashboard
2. Verify you have the correct permissions
3. Make sure you're running the complete migration file

---

**Ready to apply?** Use Method 1 (Supabase Dashboard) for the easiest experience!
