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

    // Verify user is superadmin
    const { data: userData } = await supabase
      .from('users')
      .select('role, global_role')
      .eq('id', user.id)
      .maybeSingle();

    const isSuperadmin = userData?.role === 'superadmin' || userData?.global_role === 'superadmin';
    if (!isSuperadmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Superadmin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const method = req.method;

    // GET: List pending verifications or get specific verification
    if (method === 'GET') {
      const verificationId = url.searchParams.get('verification_id');
      const status = url.searchParams.get('status') || 'under_review';
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      if (verificationId) {
        // Get specific verification with all details
        const { data: verification, error: verificationError } = await supabase
          .from('kyc_verifications')
          .select(`
            *,
            user:users (
              id,
              telegram_username,
              full_name,
              email,
              phone_number
            )
          `)
          .eq('id', verificationId)
          .single();

        if (verificationError) throw verificationError;

        // Get documents
        const { data: documents } = await supabase
          .from('kyc_documents')
          .select('*')
          .eq('kyc_verification_id', verificationId)
          .order('created_at', { ascending: false });

        // Get identity checks
        const { data: identityChecks } = await supabase
          .from('kyc_identity_checks')
          .select('*')
          .eq('kyc_verification_id', verificationId)
          .order('created_at', { ascending: false });

        // Get contact verifications
        const { data: contactVerifications } = await supabase
          .from('kyc_contact_verifications')
          .select('*')
          .eq('kyc_verification_id', verificationId)
          .order('created_at', { ascending: false });

        // Get address verifications
        const { data: addressVerifications } = await supabase
          .from('kyc_address_verifications')
          .select('*')
          .eq('kyc_verification_id', verificationId)
          .order('created_at', { ascending: false });

        // Get review history
        const { data: reviewHistory } = await supabase
          .from('kyc_admin_reviews')
          .select(`
            *,
            reviewer:reviewed_by (
              id,
              full_name,
              telegram_username
            )
          `)
          .eq('kyc_verification_id', verificationId)
          .order('created_at', { ascending: false });

        // Calculate completeness
        const { data: completeness } = await supabase.rpc('calculate_kyc_completeness', {
          verification_id_input: verificationId
        });

        return new Response(JSON.stringify({
          verification,
          documents,
          identity_checks: identityChecks,
          contact_verifications: contactVerifications,
          address_verifications: addressVerifications,
          review_history: reviewHistory,
          completeness_percentage: completeness
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        // List verifications
        const { data: verifications, error: listError } = await supabase
          .from('kyc_verifications')
          .select(`
            *,
            user:users (
              id,
              telegram_username,
              full_name
            )
          `)
          .eq('verification_status', status)
          .order('submitted_for_review_at', { ascending: true, nullsFirst: false })
          .range(offset, offset + limit - 1);

        if (listError) throw listError;

        // Get count
        const { count } = await supabase
          .from('kyc_verifications')
          .select('*', { count: 'exact', head: true })
          .eq('verification_status', status);

        return new Response(JSON.stringify({
          verifications,
          total: count,
          limit,
          offset
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // POST: Review verification (approve/reject)
    if (method === 'POST') {
      const body = await req.json();
      const {
        verification_id,
        action, // 'approve', 'reject', 'request_resubmit'
        review_notes,
        rejection_reason,
        verification_level
      } = body;

      if (!verification_id || !action) {
        return new Response(
          JSON.stringify({ error: 'verification_id and action are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get current verification
      const { data: currentVerification, error: fetchError } = await supabase
        .from('kyc_verifications')
        .select('*')
        .eq('id', verification_id)
        .single();

      if (fetchError) throw fetchError;

      const previousStatus = currentVerification.verification_status;
      let newStatus: string;
      let updateData: any = {
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      };

      if (action === 'approve') {
        newStatus = 'approved';
        updateData = {
          ...updateData,
          verification_status: 'approved',
          approved_at: new Date().toISOString(),
          verification_level: verification_level || 2,
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
          renewal_required_at: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000).toISOString() // 30 days before expiry
        };
      } else if (action === 'reject') {
        if (!rejection_reason) {
          return new Response(
            JSON.stringify({ error: 'rejection_reason is required for reject action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        newStatus = 'rejected';
        updateData = {
          ...updateData,
          verification_status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejection_reason,
          rejection_notes: review_notes
        };
      } else if (action === 'request_resubmit') {
        newStatus = 'document_pending';
        updateData = {
          ...updateData,
          verification_status: 'document_pending',
          rejection_notes: review_notes
        };
      } else {
        return new Response(
          JSON.stringify({ error: 'Invalid action. Must be approve, reject, or request_resubmit' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update verification
      const { data: updatedVerification, error: updateError } = await supabase
        .from('kyc_verifications')
        .update(updateData)
        .eq('id', verification_id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Create review record
      await supabase
        .from('kyc_admin_reviews')
        .insert({
          kyc_verification_id: verification_id,
          reviewed_by: user.id,
          review_action: action,
          review_notes,
          rejection_reason: action === 'reject' ? rejection_reason : null,
          previous_status: previousStatus,
          new_status: newStatus,
          ip_address: req.headers.get('X-Forwarded-For')?.split(',')[0] || req.headers.get('X-Real-IP'),
          user_agent: req.headers.get('User-Agent')
        });

      // Log audit event
      await supabase
        .from('kyc_audit_log')
        .insert({
          user_id: currentVerification.user_id,
          kyc_verification_id: verification_id,
          event_type: `verification_${action}ed`,
          event_data: {
            action,
            rejection_reason,
            verification_level: verification_level || 2
          },
          event_description: `KYC verification ${action}ed by admin`,
          actor_id: user.id,
          actor_role: 'superadmin',
          actor_ip_address: req.headers.get('X-Forwarded-For')?.split(',')[0] || req.headers.get('X-Real-IP')
        });

      // TODO: Send notification to user about verification status

      return new Response(JSON.stringify({
        success: true,
        message: `Verification ${action}ed successfully`,
        verification: updatedVerification
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in KYC admin review:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
