import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface ChangeRoleRequest {
  user_id: string;
  new_role: string;
  business_id?: string;
  infrastructure_id?: string;
  reason?: string;
}

const VALID_ROLES = [
  'user',
  'infrastructure_owner',
  'business_owner',
  'manager',
  'dispatcher',
  'driver',
  'warehouse',
  'sales',
  'customer_service',
];

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

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authUser) {
      throw new Error('Unauthorized');
    }

    // Get request body
    const { user_id, new_role, business_id, infrastructure_id, reason }: ChangeRoleRequest = await req.json();

    console.log('🔄 Managing user role:', {
      user_id,
      new_role,
      business_id,
      infrastructure_id,
      requested_by: authUser.id,
    });

    // Validate role
    if (!VALID_ROLES.includes(new_role)) {
      throw new Error(`Invalid role: ${new_role}`);
    }

    // Get current user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, global_role')
      .eq('id', user_id)
      .single();

    if (userError) throw userError;
    if (!userData) throw new Error('User not found');

    const oldRole = userData.global_role;

    console.log(`📝 Changing role from ${oldRole} to ${new_role}`);

    // Update user role
    const { error: updateError } = await supabase
      .from('users')
      .update({
        global_role: new_role,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user_id);

    if (updateError) throw updateError;

    // If promoting to business_owner and business_id provided, create business role
    if (new_role === 'business_owner' && business_id) {
      await supabase.from('user_business_roles').upsert({
        user_id,
        business_id,
        ownership_percentage: 100,
        is_primary: true,
        assigned_by: authUser.id,
        assigned_at: new Date().toISOString(),
      });

      // Create business equity
      await supabase.from('business_equity').upsert({
        business_id,
        stakeholder_id: user_id,
        equity_type: 'founder',
        percentage: 100,
        vested_percentage: 100,
        is_active: true,
        created_by: authUser.id,
      });
    }

    // Log role change
    await supabase.from('role_changes_audit').insert({
      user_id,
      old_role: oldRole,
      new_role,
      changed_by: authUser.id,
      change_reason: reason || `Role changed by ${authUser.email || authUser.id}`,
      business_id: business_id || null,
      metadata: {
        infrastructure_id: infrastructure_id || null,
        timestamp: new Date().toISOString(),
      },
    });

    // Build JWT claims
    const claims: Record<string, any> = {
      role: new_role,
    };

    if (business_id) {
      claims.business_id = business_id;
    }

    if (infrastructure_id) {
      claims.infrastructure_id = infrastructure_id;
    }

    // Update JWT claims in auth.users
    const { error: jwtError } = await supabase.auth.admin.updateUserById(user_id, {
      app_metadata: claims,
    });

    if (jwtError) {
      console.warn('⚠️ Failed to update JWT claims:', jwtError);
    } else {
      console.log('✅ JWT claims updated successfully');
    }

    // Log to system audit
    await supabase.from('system_audit_log').insert({
      actor_id: authUser.id,
      action: 'user_role_changed',
      entity_table: 'users',
      entity_id: user_id,
      metadata: {
        old_role: oldRole,
        new_role,
        business_id: business_id || null,
        infrastructure_id: infrastructure_id || null,
        reason: reason || null,
      },
    });

    console.log(`✅ Role changed successfully: ${oldRole} → ${new_role}`);

    return new Response(
      JSON.stringify({
        success: true,
        user_id,
        old_role: oldRole,
        new_role,
        message: 'Role changed successfully',
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
    console.error('❌ Error in manage-user-role:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
