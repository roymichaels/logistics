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

    const url = new URL(req.url);
    const action = url.searchParams.get('action'); // 'send' or 'verify'

    if (action === 'send') {
      const body = await req.json();
      const { contact_type, contact_value } = body;

      if (!contact_type || !contact_value) {
        return new Response(
          JSON.stringify({ error: 'contact_type and contact_value are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: verification } = await supabase
        .from('kyc_verifications')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!verification) {
        return new Response(
          JSON.stringify({ error: 'KYC verification not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { data: contactVerification, error: insertError } = await supabase
        .from('kyc_contact_verifications')
        .insert({
          kyc_verification_id: verification.id,
          user_id: user.id,
          contact_type,
          contact_value,
          verification_method: contact_type === 'phone' ? 'sms_otp' : 'email_link',
          otp_code: otpCode,
          otp_sent_at: new Date().toISOString(),
          otp_expires_at: expiresAt
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return new Response(JSON.stringify({
        success: true,
        message: `Verification code sent to ${contact_value}`,
        verification_id: contactVerification.id,
        expires_at: expiresAt
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'verify') {
      const body = await req.json();
      const { verification_id, otp_code } = body;

      if (!verification_id || !otp_code) {
        return new Response(
          JSON.stringify({ error: 'verification_id and otp_code are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: contactVerification, error: fetchError } = await supabase
        .from('kyc_contact_verifications')
        .select('*')
        .eq('id', verification_id)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !contactVerification) {
        return new Response(
          JSON.stringify({ error: 'Verification not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (contactVerification.is_verified) {
        return new Response(
          JSON.stringify({ error: 'Already verified' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (new Date(contactVerification.otp_expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Verification code expired' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (contactVerification.otp_attempts >= contactVerification.max_otp_attempts) {
        return new Response(
          JSON.stringify({ error: 'Maximum verification attempts exceeded' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (contactVerification.otp_code !== otp_code) {
        await supabase
          .from('kyc_contact_verifications')
          .update({
            otp_attempts: contactVerification.otp_attempts + 1
          })
          .eq('id', verification_id);

        return new Response(
          JSON.stringify({
            error: 'Invalid verification code',
            attempts_remaining: contactVerification.max_otp_attempts - contactVerification.otp_attempts - 1
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabase
        .from('kyc_contact_verifications')
        .update({
          is_verified: true,
          verified_at: new Date().toISOString()
        })
        .eq('id', verification_id);

      await supabase
        .from('kyc_verifications')
        .update({ contact_verified: true })
        .eq('id', contactVerification.kyc_verification_id);

      return new Response(JSON.stringify({
        success: true,
        message: 'Contact verified successfully'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use ?action=send or ?action=verify' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in contact verification:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
