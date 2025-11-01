# Shared Utilities for Edge Functions

This directory contains shared utility functions that are imported by other edge functions.

**Important:** Files in this directory are NOT deployed as standalone edge functions. They are imported by actual edge functions.

## Files

- `auditLog.ts` - Audit logging utilities
- `cors.ts` - CORS configuration
- `supabaseClient.ts` - Supabase client initialization
- `tenantGuard.ts` - Multi-tenant security guards

## Usage

Import these utilities in your edge functions:

```typescript
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from '../_shared/supabaseClient.ts';
import { tenantGuard } from '../_shared/tenantGuard.ts';
import { logAudit } from '../_shared/auditLog.ts';
```

## Warning Suppression

If you see warnings like "Could not resolve an edge function slug from /home/project/supabase/functions/_shared/...", this is expected and can be safely ignored. These files are utilities, not standalone edge functions.
