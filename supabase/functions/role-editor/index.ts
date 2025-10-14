import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface CreateCustomRoleRequest {
  business_id: string;
  base_role_key: string;
  custom_role_name: string;
  custom_role_label: string;
  description?: string;
  permissions_to_disable?: string[];
}

interface UpdateCustomRoleRequest {
  custom_role_id: string;
  custom_role_label?: string;
  description?: string;
  permissions_to_enable?: string[];
  permissions_to_disable?: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const path = url.pathname;

    // GET /role-editor - List custom roles for user's businesses
    if (req.method === 'GET') {
      const business_id = url.searchParams.get('business_id');

      if (!business_id) {
        return new Response(
          JSON.stringify({ error: 'business_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify user is business owner
      const { data: userRole } = await supabase
        .from('user_business_roles')
        .select('role_id, roles(role_key)')
        .eq('user_id', user.id)
        .eq('business_id', business_id)
        .eq('is_active', true)
        .single();

      if (!userRole || userRole.roles.role_key !== 'business_owner') {
        return new Response(
          JSON.stringify({ error: 'Only business owners can manage custom roles' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get custom roles for this business
      const { data: customRoles, error: rolesError } = await supabase
        .from('custom_roles')
        .select(`
          *,
          custom_role_permissions(
            id,
            permission_id,
            is_enabled,
            permissions(permission_key, module, description)
          )
        `)
        .eq('business_id', business_id)
        .eq('is_active', true);

      if (rolesError) throw rolesError;

      return new Response(
        JSON.stringify({ custom_roles: customRoles }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /role-editor - Create custom role
    if (req.method === 'POST') {
      const {
        business_id,
        base_role_key,
        custom_role_name,
        custom_role_label,
        description,
        permissions_to_disable,
      }: CreateCustomRoleRequest = await req.json();

      // Verify user is business owner
      const { data: userRole } = await supabase
        .from('user_business_roles')
        .select('role_id, roles(role_key)')
        .eq('user_id', user.id)
        .eq('business_id', business_id)
        .eq('is_active', true)
        .single();

      if (!userRole || userRole.roles.role_key !== 'business_owner') {
        return new Response(
          JSON.stringify({ error: 'Only business owners can create custom roles' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get base role
      const { data: baseRole, error: baseRoleError } = await supabase
        .from('roles')
        .select('id, role_key, can_be_customized, scope_level')
        .eq('role_key', base_role_key)
        .single();

      if (baseRoleError || !baseRole) {
        return new Response(
          JSON.stringify({ error: 'Base role not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!baseRole.can_be_customized) {
        return new Response(
          JSON.stringify({ error: 'This role cannot be customized' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create custom role
      const { data: customRole, error: createError } = await supabase
        .from('custom_roles')
        .insert({
          business_id,
          base_role_id: baseRole.id,
          custom_role_name,
          custom_role_label,
          description,
          created_by: user.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Get all base role permissions
      const { data: basePermissions } = await supabase
        .from('role_permissions')
        .select('permission_id, permissions(permission_key)')
        .eq('role_id', baseRole.id);

      // Create custom role permissions (disabled by default if in disable list)
      const permissionsToDisable = new Set(permissions_to_disable || []);
      const customRolePermissions = basePermissions.map((bp: any) => ({
        custom_role_id: customRole.id,
        permission_id: bp.permission_id,
        is_enabled: !permissionsToDisable.has(bp.permissions.permission_key),
        modified_by: user.id,
      }));

      const { error: permsError } = await supabase
        .from('custom_role_permissions')
        .insert(customRolePermissions);

      if (permsError) throw permsError;

      // Log role creation
      await supabase
        .from('role_change_log')
        .insert({
          action_type: 'custom_role_created',
          actor_id: user.id,
          target_custom_role_id: customRole.id,
          business_id,
          new_state: customRole,
        });

      return new Response(
        JSON.stringify({ success: true, custom_role: customRole }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PUT /role-editor - Update custom role permissions
    if (req.method === 'PUT') {
      const {
        custom_role_id,
        custom_role_label,
        description,
        permissions_to_enable,
        permissions_to_disable,
      }: UpdateCustomRoleRequest = await req.json();

      // Get custom role and verify ownership
      const { data: customRole, error: roleError } = await supabase
        .from('custom_roles')
        .select('*, businesses(id)')
        .eq('id', custom_role_id)
        .single();

      if (roleError || !customRole) {
        return new Response(
          JSON.stringify({ error: 'Custom role not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify user is business owner
      const { data: userRole } = await supabase
        .from('user_business_roles')
        .select('role_id, roles(role_key)')
        .eq('user_id', user.id)
        .eq('business_id', customRole.business_id)
        .eq('is_active', true)
        .single();

      if (!userRole || userRole.roles.role_key !== 'business_owner') {
        return new Response(
          JSON.stringify({ error: 'Only business owners can update custom roles' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update basic info if provided
      if (custom_role_label || description) {
        await supabase
          .from('custom_roles')
          .update({
            custom_role_label: custom_role_label || customRole.custom_role_label,
            description: description || customRole.description,
            version: customRole.version + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', custom_role_id);
      }

      // Update permissions
      if (permissions_to_enable || permissions_to_disable) {
        const updates = [];

        if (permissions_to_enable) {
          for (const perm_key of permissions_to_enable) {
            const { data: perm } = await supabase
              .from('permissions')
              .select('id')
              .eq('permission_key', perm_key)
              .single();

            if (perm) {
              updates.push(
                supabase
                  .from('custom_role_permissions')
                  .update({ is_enabled: true, modified_by: user.id })
                  .eq('custom_role_id', custom_role_id)
                  .eq('permission_id', perm.id)
              );
            }
          }
        }

        if (permissions_to_disable) {
          for (const perm_key of permissions_to_disable) {
            const { data: perm } = await supabase
              .from('permissions')
              .select('id')
              .eq('permission_key', perm_key)
              .single();

            if (perm) {
              updates.push(
                supabase
                  .from('custom_role_permissions')
                  .update({ is_enabled: false, modified_by: user.id })
                  .eq('custom_role_id', custom_role_id)
                  .eq('permission_id', perm.id)
              );
            }
          }
        }

        await Promise.all(updates);
      }

      // Invalidate permissions cache for users with this role
      const { data: usersWithRole } = await supabase
        .from('user_business_roles')
        .select('user_id')
        .eq('custom_role_id', custom_role_id);

      if (usersWithRole) {
        for (const ubr of usersWithRole) {
          await supabase
            .from('user_permissions_cache')
            .delete()
            .eq('user_id', ubr.user_id);
        }
      }

      // Log update
      await supabase
        .from('role_change_log')
        .insert({
          action_type: 'custom_role_updated',
          actor_id: user.id,
          target_custom_role_id: custom_role_id,
          business_id: customRole.business_id,
          previous_state: customRole,
          new_state: { permissions_to_enable, permissions_to_disable },
        });

      return new Response(
        JSON.stringify({ success: true, message: 'Custom role updated' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Role editor error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
