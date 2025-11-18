import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');
    const businessId = url.searchParams.get('business_id');
    const includeUnpublished = url.searchParams.get('include_unpublished') === 'true';

    if (!slug && !businessId) {
      return new Response(
        JSON.stringify({ error: 'Either slug or business_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get authenticated user if present
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      if (!authError && user) {
        userId = user.id;
      }
    }

    // Build query
    let query = supabase
      .from('business_pages')
      .select(`
        *,
        business:businesses (
          id,
          name,
          name_hebrew,
          business_type,
          logo_url,
          active
        )
      `)
      .limit(1);

    if (slug) {
      query = query.eq('page_slug', slug);
    } else if (businessId) {
      query = query.eq('business_id', businessId);
    }

    // Only show published pages unless user is owner/admin
    if (!includeUnpublished) {
      query = query.eq('is_published', true);
    }

    const { data: page, error: pageError } = await query.maybeSingle();

    if (pageError) {
      throw pageError;
    }

    if (!page) {
      return new Response(
        JSON.stringify({ error: 'Business page not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has permission to view unpublished page
    if (!page.is_published && includeUnpublished) {
      const { data: membership } = await supabase
        .from('business_memberships')
        .select('role')
        .eq('business_id', page.business_id)
        .eq('user_id', userId || '')
        .maybeSingle();

      if (!membership && userId) {
        const { data: user } = await supabase
          .from('users')
          .select('role, global_role')
          .eq('id', userId)
          .maybeSingle();

        const isSuperadmin = user?.role === 'superadmin' || user?.global_role === 'superadmin';
        if (!isSuperadmin) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized to view unpublished page' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Get sections
    const { data: sections } = await supabase
      .from('business_page_sections')
      .select('*')
      .eq('business_page_id', page.id)
      .eq('is_visible', true)
      .order('display_order', { ascending: true });

    // Get gallery
    const { data: gallery } = await supabase
      .from('business_page_gallery')
      .select('*')
      .eq('business_page_id', page.id)
      .order('display_order', { ascending: true });

    // Get operating hours
    const { data: operatingHours } = await supabase
      .from('business_operating_hours')
      .select('*')
      .eq('business_id', page.business_id)
      .order('day_of_week', { ascending: true });

    // Get amenities
    const { data: amenities } = await supabase
      .from('business_amenities')
      .select('*')
      .eq('business_id', page.business_id)
      .eq('is_available', true)
      .order('category, display_order', { ascending: true });

    // Get special hours for next 30 days
    const { data: specialHours } = await supabase
      .from('business_special_hours')
      .select('*')
      .eq('business_id', page.business_id)
      .gte('date', new Date().toISOString().split('T')[0])
      .lte('date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: true });

    // Check if business is currently open
    const { data: isOpenData } = await supabase.rpc('is_business_open_now', {
      business_id_input: page.business_id
    });

    // Increment view count (fire and forget)
    if (page.is_published) {
      supabase
        .from('business_pages')
        .update({ view_count: (page.view_count || 0) + 1 })
        .eq('id', page.id)
        .then(() => {});

      // Log analytics event
      const visitorId = req.headers.get('X-Visitor-ID') || crypto.randomUUID();
      supabase
        .from('business_page_analytics')
        .insert({
          business_page_id: page.id,
          visitor_id: visitorId,
          user_id: userId,
          event_type: 'page_view',
          referrer_url: req.headers.get('Referer'),
          user_agent: req.headers.get('User-Agent'),
          ip_address: req.headers.get('X-Forwarded-For')?.split(',')[0] || req.headers.get('X-Real-IP')
        })
        .then(() => {});
    }

    const response = {
      page,
      sections: sections || [],
      gallery: gallery || [],
      operating_hours: operatingHours || [],
      amenities: amenities || [],
      special_hours: specialHours || [],
      is_open_now: isOpenData || false,
      metadata: {
        fetched_at: new Date().toISOString(),
        is_owner: !!userId && !!userId
      }
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': page.is_published ? 'public, max-age=300' : 'no-cache'
      }
    });

  } catch (error) {
    console.error('Error fetching business page:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
