# Superadmin Password System

## Overview
The system now uses a simple superadmin password instead of username-based admin detection. **The first user to set a password becomes an owner**, and anyone who knows the password can become an owner.

## How It Works

### First User Experience
1. User logs in via Telegram
2. After login, they see a screen: **"Set Admin Password"**
3. They create a password (minimum 6 characters)
4. They are automatically promoted to `owner` role
5. They can now access all admin features

### Subsequent Users
1. User logs in via Telegram
2. After login, they see a screen: **"Enter Admin Password"**
3. They can either:
   - Enter the superadmin password → Get promoted to `owner`
   - Click "Continue as regular user" → Stay as `user` role

## Password Security
- Password is hashed using SHA-256
- Stored in `system_config` table
- Only owners can view/update system config (RLS protected)
- Cannot be reset once set

## Edge Function: `superadmin-auth`

### Endpoints

#### Check Status
```json
POST /functions/v1/superadmin-auth
{
  "action": "status"
}

Response:
{
  "ok": true,
  "passwordSet": true/false
}
```

#### Set Password (First Time)
```json
POST /functions/v1/superadmin-auth
{
  "action": "set",
  "password": "your-password",
  "telegram_id": "user-telegram-id",
  "username": "username"
}

Response:
{
  "ok": true,
  "message": "Superadmin password set successfully. You are now an owner."
}
```

#### Verify Password
```json
POST /functions/v1/superadmin-auth
{
  "action": "verify",
  "password": "your-password",
  "telegram_id": "user-telegram-id"
}

Response:
{
  "ok": true,
  "message": "Password verified. You are now an owner."
}
```

## Database Schema

### system_config Table
```sql
CREATE TABLE public.system_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);
```

Key stored:
- `superadmin_password_hash` - SHA-256 hash of the password

## User Flow Diagram

```
User logs in with Telegram
         ↓
Is password set in system?
         ↓
    ┌────┴────┐
   No        Yes
    ↓          ↓
Show "Set     Show "Enter
Password"     Password"
    ↓          ↓
User sets     User can:
password      - Enter password
    ↓         - Skip
Promoted      ↓
to owner    If correct:
            Promoted to owner
```

## Important Notes

1. **First User Advantage**: The first person to log in should set the password immediately
2. **Share Carefully**: Anyone with the password becomes an owner
3. **No Reset**: There's no password reset mechanism (by design for security)
4. **Multiple Owners**: Multiple users can be owners if they all know the password
5. **Manual Promotion**: Owners can also manually change user roles in Supabase

## Manual Role Management

You can always manually promote users in Supabase:

```sql
UPDATE users
SET role = 'owner'
WHERE username = 'username_here';
```

Or demote:

```sql
UPDATE users
SET role = 'user'
WHERE username = 'username_here';
```
