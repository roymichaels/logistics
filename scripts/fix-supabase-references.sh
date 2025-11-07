#!/bin/bash

# Script to fix bare supabase references in supabaseDataStore.ts
# This script adds proper null checks and uses this.supabase or getSupabase()

FILE="/tmp/cc-agent/58462562/project/src/lib/supabaseDataStore.ts"
BACKUP="${FILE}.backup"

echo "🔧 Fixing Supabase references in supabaseDataStore.ts..."

# Create backup
cp "$FILE" "$BACKUP"
echo "✅ Backup created at $BACKUP"

# Fix: Add supabase instance check in listUserRegistrationRecords
sed -i '/export async function listUserRegistrationRecords/,/^}$/ {
  /^  \/\/ First, try to get from user_registrations table$/i\
  const supabase = getSupabase();
}' "$FILE"

# Fix: Add supabase check in listUserRegistrationRecords fallback
sed -i '/^  \/\/ Fallback: fetch from users table and transform to UserRegistration format$/a\
  if (!supabase) throw new Error("Supabase client not available");' "$FILE"

echo "✅ Fixed listUserRegistrationRecords function"

# Fix: Update approveUserRegistrationRecord to use getSupabase
sed -i '/export async function approveUserRegistrationRecord/,/^}$/ {
  /console.log.*Registration not found in user_registrations/i\
    const supabase = getSupabase();\
    if (!supabase) throw new Error("Supabase client not available");
}' "$FILE"

echo "✅ Fixed approveUserRegistrationRecord function"

# Note: The class methods already use this.supabase getter which is safer
# Just need to add null checks where it's called

echo "✅ All Supabase reference fixes applied"
echo "ℹ️  Original file backed up to: $BACKUP"
