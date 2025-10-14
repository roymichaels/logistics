import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface PermissionResolutionRequest {
  user_id: string;
  business_id?: string;
}

interface ResolvedPermissions {
  user_id: string;
  business_id: string | null;
  role_key: string;
  permissions: string[];
  can_see_financials: boolean;
  can_see_cross_business: boolean;
  scope_level: string;
  cached_at: string;
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
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request
    const { user_id, business_id }: PermissionResolutionRequest = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check cache first
    const { data: cached, error: cacheError } = await supabase
      .from('user_permissions_cache')
      .select('*')
      .eq('user_id', user_id)
      .eq('business_id', business_id || null)
      .maybeSingle();

    // If cache exists and is fresh (less than 5 minutes old), return it
    if (cached && !cacheError) {
      const cacheAge = Date.now() - new Date(cached.cached_at).getTime();
      if (cacheAge < 5 * 60 * 1000) {
        return new Response(
          JSON.stringify({
            ...cached,
            from_cache: true,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Resolve permissions from scratch
    let permissions: string[] = [];
    let role_key = '';
    let can_see_financials = false;
    let can_see_cross_business = false;
    let scope_level = 'business';

    // Get user's role
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if user has infrastructure-level role (uses user.role directly)
    const infrastructureRoles = [
      'infrastructure_owner',
      'infrastructure_manager',
      'infrastructure_dispatcher',
      'infrastructure_driver',
      'infrastructure_warehouse',
      'infrastructure_accountant',
    ];

    if (infrastructureRoles.includes(user.role)) {
      // Infrastructure roles: get permissions from roles table
      const { data: roleData } = await supabase
        .from('roles')
        .select(`
          role_key,
          can_see_financials,
          can_see_cross_business,
          scope_level,
          role_permissions (
            permissions (permission_key)
          )
        `)
        .eq('role_key', user.role)
        .single();

      if (roleData) {
        role_key = roleData.role_key;
        can_see_financials = roleData.can_see_financials;
        can_see_cross_business = roleData.can_see_cross_business;
        scope_level = roleData.scope_level;
        permissions = roleData.role_permissions
          .map((rp: any) => rp.permissions.permission_key)
          .filter((p: string) => p);
      }
    } else if (business_id) {
      // Business-scoped role: check user_business_roles
      const { data: businessRole } = await supabase
        .from('user_business_roles')
        .select(`
          role_id,
          custom_role_id,
          roles (
            role_key,
            can_see_financials,
            can_see_cross_business,
            scope_level,
            role_permissions (
              permissions (permission_key)
            )
          ),
          custom_roles (
            custom_role_name,
            base_role_id,
            custom_role_permissions (
              permission_id,
              is_enabled,
              permissions (permission_key)
            )
          )
        `)
        .eq('user_id', user_id)
        .eq('business_id', business_id)
        .eq('is_active', true)
        .maybeSingle();

      if (businessRole) {
        if (businessRole.custom_role_id && businessRole.custom_roles) {
          // Custom role: merge base role permissions with custom overrides
          const customRole = businessRole.custom_roles;
          role_key = customRole.custom_role_name;

          // Get base role permissions
          const { data: baseRole } = await supabase
            .from('roles')
            .select(`
              can_see_financials,
              can_see_cross_business,
              scope_level,
              role_permissions (
                permissions (permission_key)
              )
            `)
            .eq('id', customRole.base_role_id)
            .single();

          if (baseRole) {
            can_see_financials = baseRole.can_see_financials;
            can_see_cross_business = baseRole.can_see_cross_business;
            scope_level = baseRole.scope_level;

            // Start with base permissions
            const basePermissions = new Set(
              baseRole.role_permissions.map((rp: any) => rp.permissions.permission_key)
            );

            // Apply custom overrides
            customRole.custom_role_permissions.forEach((crp: any) => {
              const permKey = crp.permissions.permission_key;
              if (crp.is_enabled && basePermissions.has(permKey)) {
                // Keep enabled permissions that exist in base role
              } else if (!crp.is_enabled) {
                // Remove disabled permissions
                basePermissions.delete(permKey);
              }
            });

            permissions = Array.from(basePermissions);
          }
        } else if (businessRole.role_id && businessRole.roles) {
          // Standard role
          const roleData = businessRole.roles;
          role_key = roleData.role_key;
          can_see_financials = roleData.can_see_financials;
          can_see_cross_business = roleData.can_see_cross_business;
          scope_level = roleData.scope_level;
          permissions = roleData.role_permissions
            .map((rp: any) => rp.permissions.permission_key)
            .filter((p: string) => p);
        }
      }
    }

    // Build result
    const result: ResolvedPermissions = {
      user_id,
      business_id: business_id || null,
      role_key,
      permissions,
      can_see_financials,
      can_see_cross_business,
      scope_level,
      cached_at: new Date().toISOString(),
    };

    // Update cache
    await supabase
      .from('user_permissions_cache')
      .upsert({
        user_id,
        business_id: business_id || null,
        resolved_permissions: permissions,
        role_key,
        can_see_financials,
        can_see_cross_business,
        cached_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,business_id',
      });

    return new Response(
      JSON.stringify({
        ...result,
        from_cache: false,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Permission resolution error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
