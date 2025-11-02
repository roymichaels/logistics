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
    console.log('📋 Request payload:', { user_id, business_id, infrastructure_id });

    // Fetch user data - using separate queries to avoid JOIN issues
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, global_role')
      .eq('id', user_id)
      .maybeSingle();

    if (userError) {
      console.error('❌ Error fetching user data:', userError);
      console.error('❌ Error details:', JSON.stringify(userError, null, 2));
      throw new Error(`Failed to fetch user: ${userError.message}`);
    }

    if (!userData) {
      console.error('❌ User not found for ID:', user_id);
      throw new Error('User not found');
    }

    console.log('✅ User data fetched:', userData);

    // Fetch user business roles separately
    const { data: businessRoles, error: rolesError } = await supabase
      .from('user_business_roles')
      .select('business_id, role_id, ownership_percentage, is_primary')
      .eq('user_id', user_id);

    if (rolesError) {
      console.error('❌ Error fetching user business roles:', rolesError);
      console.error('❌ Error details:', JSON.stringify(rolesError, null, 2));
    } else {
      console.log('✅ User business roles fetched:', businessRoles?.length || 0, 'roles');
    }

    // Fetch user business context separately (no is_active column exists)
    const { data: businessContext, error: contextError } = await supabase
      .from('user_business_contexts')
      .select('business_id, infrastructure_id')
      .eq('user_id', user_id)
      .maybeSingle();

    if (contextError) {
      console.error('❌ Error fetching user business context:', contextError);
      console.error('❌ Error details:', JSON.stringify(contextError, null, 2));
    } else {
      console.log('✅ User business context fetched:', businessContext || 'none');
    }

    // Combine the data
    const combinedUserData = {
      ...userData,
      user_business_roles: businessRoles || [],
      user_business_contexts: businessContext,
    };

    // Build JWT claims object
    const claims: Record<string, any> = {
      role: combinedUserData.global_role || 'user',
    };

    // Add business context if provided or from stored context
    if (business_id) {
      console.log('📌 Using provided business_id:', business_id);
      claims.business_id = business_id;
    } else if (businessContext) {
      console.log('📌 Using stored business context');
      claims.business_id = businessContext.business_id;
      if (businessContext.infrastructure_id) {
        claims.infrastructure_id = businessContext.infrastructure_id;
      }
    }

    // Add infrastructure context if provided
    if (infrastructure_id) {
      console.log('📌 Using provided infrastructure_id:', infrastructure_id);
      claims.infrastructure_id = infrastructure_id;
    }

    // Add business roles
    if (businessRoles && businessRoles.length > 0) {
      const primaryRole = businessRoles.find((r: any) => r.is_primary);
      if (primaryRole) {
        console.log('📌 Setting primary business role:', primaryRole);
        claims.primary_business_id = primaryRole.business_id;
        claims.ownership_percentage = primaryRole.ownership_percentage;
      }
    } else {
      console.log('⚠️ No business roles found for user');
    }

    console.log('📝 JWT claims to sync:', claims);

    // Update user metadata in auth.users
    console.log('🔐 Updating auth.users metadata...');
    const { data: authData, error: authError } = await supabase.auth.admin.updateUserById(
      user_id,
      {
        app_metadata: claims,
      }
    );

    if (authError) {
      console.error('❌ Error updating user metadata:', authError);
      console.error('❌ Auth error details:', JSON.stringify(authError, null, 2));
      throw new Error(`Failed to update user metadata: ${authError.message}`);
    }

    console.log('✅ JWT claims synced successfully for user:', user_id);
    console.log('✅ Auth data response:', authData);

    // Log to audit trail (non-blocking)
    try {
      const { error: auditError } = await supabase.from('system_audit_log').insert({
        actor_id: user_id,
        action: 'jwt_claims_synced',
        entity_table: 'auth.users',
        entity_id: user_id,
        metadata: {
          claims: claims,
          synced_at: new Date().toISOString(),
          business_id: business_id || null,
          infrastructure_id: infrastructure_id || null,
        },
      });

      if (auditError) {
        console.warn('⚠️ Failed to log to audit trail:', auditError);
      }
    } catch (auditError) {
      console.warn('⚠️ Audit log error (non-fatal):', auditError);
    }

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

    // Enhanced error details
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'UnknownError',
    };

    console.error('❌ Full error details:', JSON.stringify(errorDetails, null, 2));

    return new Response(
      JSON.stringify({
        success: false,
        error: errorDetails.message,
        error_type: errorDetails.name,
        details: 'Check Edge Function logs for more information',
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