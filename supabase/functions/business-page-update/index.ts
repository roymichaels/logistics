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

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { business_id, page_data, sections, gallery_items, operating_hours, amenities, special_hours } = body;

    if (!business_id) {
      return new Response(
        JSON.stringify({ error: 'business_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has permission to edit this business page
    const { data: membership } = await supabase
      .from('business_memberships')
      .select('role')
      .eq('business_id', business_id)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: userData } = await supabase
      .from('users')
      .select('role, global_role')
      .eq('id', user.id)
      .maybeSingle();

    const isSuperadmin = userData?.role === 'superadmin' || userData?.global_role === 'superadmin';
    const canEdit = membership && ['business_owner', 'manager'].includes(membership.role) || isSuperadmin;

    if (!canEdit) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized to edit this business page' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Start transaction-like operations
    const results: any = {};

    // 1. Upsert business page
    if (page_data) {
      // Generate slug if not provided
      if (!page_data.page_slug && page_data.page_title) {
        page_data.page_slug = page_data.page_title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();
      }

      const { data: existingPage } = await supabase
        .from('business_pages')
        .select('id')
        .eq('business_id', business_id)
        .maybeSingle();

      if (existingPage) {
        // Update existing page
        const { data: updatedPage, error: updateError } = await supabase
          .from('business_pages')
          .update(page_data)
          .eq('id', existingPage.id)
          .select()
          .single();

        if (updateError) throw updateError;
        results.page = updatedPage;
      } else {
        // Create new page
        const { data: newPage, error: insertError } = await supabase
          .from('business_pages')
          .insert({
            ...page_data,
            business_id
          })
          .select()
          .single();

        if (insertError) throw insertError;
        results.page = newPage;
      }
    }

    // Get page ID for related operations
    const { data: pageRecord } = await supabase
      .from('business_pages')
      .select('id')
      .eq('business_id', business_id)
      .single();

    if (!pageRecord) {
      throw new Error('Business page not found after upsert');
    }

    const pageId = pageRecord.id;

    // 2. Update sections
    if (sections && Array.isArray(sections)) {
      // Delete existing sections not in update
      const sectionIds = sections.filter(s => s.id).map(s => s.id);
      if (sectionIds.length > 0) {
        await supabase
          .from('business_page_sections')
          .delete()
          .eq('business_page_id', pageId)
          .not('id', 'in', `(${sectionIds.join(',')})`);
      }

      // Upsert sections
      const sectionsToUpsert = sections.map((section, index) => ({
        ...section,
        business_page_id: pageId,
        display_order: section.display_order ?? index
      }));

      const { data: upsertedSections, error: sectionsError } = await supabase
        .from('business_page_sections')
        .upsert(sectionsToUpsert, { onConflict: 'id' })
        .select();

      if (sectionsError) throw sectionsError;
      results.sections = upsertedSections;
    }

    // 3. Update gallery
    if (gallery_items && Array.isArray(gallery_items)) {
      const galleryIds = gallery_items.filter(g => g.id).map(g => g.id);
      if (galleryIds.length > 0) {
        await supabase
          .from('business_page_gallery')
          .delete()
          .eq('business_page_id', pageId)
          .not('id', 'in', `(${galleryIds.join(',')})`);
      }

      const galleryToUpsert = gallery_items.map((item, index) => ({
        ...item,
        business_page_id: pageId,
        display_order: item.display_order ?? index,
        uploaded_by: user.id
      }));

      const { data: upsertedGallery, error: galleryError } = await supabase
        .from('business_page_gallery')
        .upsert(galleryToUpsert, { onConflict: 'id' })
        .select();

      if (galleryError) throw galleryError;
      results.gallery = upsertedGallery;
    }

    // 4. Update operating hours
    if (operating_hours && Array.isArray(operating_hours)) {
      const hoursToUpsert = operating_hours.map(hour => ({
        ...hour,
        business_id
      }));

      const { data: upsertedHours, error: hoursError } = await supabase
        .from('business_operating_hours')
        .upsert(hoursToUpsert, { onConflict: 'business_id,day_of_week' })
        .select();

      if (hoursError) throw hoursError;
      results.operating_hours = upsertedHours;
    }

    // 5. Update amenities
    if (amenities && Array.isArray(amenities)) {
      const amenityIds = amenities.filter(a => a.id).map(a => a.id);
      if (amenityIds.length > 0) {
        await supabase
          .from('business_amenities')
          .delete()
          .eq('business_id', business_id)
          .not('id', 'in', `(${amenityIds.join(',')})`);
      }

      const amenitiesToUpsert = amenities.map(amenity => ({
        ...amenity,
        business_id
      }));

      const { data: upsertedAmenities, error: amenitiesError } = await supabase
        .from('business_amenities')
        .upsert(amenitiesToUpsert, { onConflict: 'id' })
        .select();

      if (amenitiesError) throw amenitiesError;
      results.amenities = upsertedAmenities;
    }

    // 6. Update special hours
    if (special_hours && Array.isArray(special_hours)) {
      const specialHoursToUpsert = special_hours.map(sh => ({
        ...sh,
        business_id
      }));

      const { data: upsertedSpecialHours, error: specialHoursError } = await supabase
        .from('business_special_hours')
        .upsert(specialHoursToUpsert, { onConflict: 'business_id,date' })
        .select();

      if (specialHoursError) throw specialHoursError;
      results.special_hours = upsertedSpecialHours;
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Business page updated successfully',
      data: results
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating business page:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
