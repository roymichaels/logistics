import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface SyncClaimsRequest {
  user_id: string;
  business_id?: string;
  infrastructure_id?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get request body
    const { user_id, business_id, infrastructure_id }: SyncClaimsRequest = await req.json();

    if (!user_id) {
      throw new Error('user_id is required');
    }

    console.log('🔄 Syncing JWT claims for user:', user_id);

    // Fetch user data with all relevant information
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        global_role,
        user_business_roles (
          business_id,
          role_id,
          ownership_percentage,
          is_primary
        ),
        user_business_contexts!inner (
          business_id,
          infrastructure_id,
          is_active
        )
      `)
      .eq('id', user_id)
      .single();

    if (userError) {
      console.error('❌ Error fetching user data:', userError);
      throw userError;
    }

    if (!userData) {
      throw new Error('User not found');
    }

    console.log('✅ User data fetched:', userData);

    // Build JWT claims object
    const claims: Record<string, any> = {
      role: userData.global_role || 'user',
    };

    // Add business context if provided or from active context
    if (business_id) {
      claims.business_id = business_id;
    } else if (userData.user_business_contexts && userData.user_business_contexts.length > 0) {
      // Find active business context
      const activeContext = userData.user_business_contexts.find((ctx: any) => ctx.is_active);
      if (activeContext) {
        claims.business_id = activeContext.business_id;
        claims.infrastructure_id = activeContext.infrastructure_id;
      }
    }

    // Add infrastructure context if provided
    if (infrastructure_id) {
      claims.infrastructure_id = infrastructure_id;
    }

    // Add business roles
    if (userData.user_business_roles && userData.user_business_roles.length > 0) {
      const primaryRole = userData.user_business_roles.find((r: any) => r.is_primary);
      if (primaryRole) {
        claims.primary_business_id = primaryRole.business_id;
        claims.ownership_percentage = primaryRole.ownership_percentage;
      }
    }

    console.log('📝 JWT claims to sync:', claims);

    // Update user metadata in auth.users
    const { data: authData, error: authError } = await supabase.auth.admin.updateUserById(
      user_id,
      {
        app_metadata: claims,
      }
    );

    if (authError) {
      console.error('❌ Error updating user metadata:', authError);
      throw authError;
    }

    console.log('✅ JWT claims synced successfully for user:', user_id);

    // Log to audit trail
    await supabase.from('system_audit_log').insert({
      actor_id: user_id,
      action: 'jwt_claims_synced',
      entity_table: 'auth.users',
      entity_id: user_id,
      metadata: {
        claims: claims,
        synced_at: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        user_id,
        claims,
        message: 'JWT claims synced successfully',
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('❌ Error in sync-user-claims:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
