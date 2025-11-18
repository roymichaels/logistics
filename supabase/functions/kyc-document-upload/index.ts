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

    // Parse multipart form data
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return new Response(
        JSON.stringify({ error: 'Content-Type must be multipart/form-data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('document_type') as string;
    const documentSubtype = formData.get('document_subtype') as string | null;
    const documentNumber = formData.get('document_number') as string | null;
    const issuingCountry = formData.get('issuing_country') as string | null;
    const issueDate = formData.get('issue_date') as string | null;
    const expiryDate = formData.get('expiry_date') as string | null;

    if (!file || !documentType) {
      return new Response(
        JSON.stringify({ error: 'file and document_type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    const ALLOWED_TYPES = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'video/mp4',
      'video/webm'
    ];

    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: 'File size exceeds 50MB limit' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: `File type ${file.type} not allowed` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get or create KYC verification record
    let { data: verification } = await supabase
      .from('kyc_verifications')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!verification) {
      const { data: newVerification, error: verificationError } = await supabase
        .from('kyc_verifications')
        .insert({
          user_id: user.id,
          verification_status: 'document_pending',
          ip_address: req.headers.get('X-Forwarded-For')?.split(',')[0] || req.headers.get('X-Real-IP'),
          user_agent: req.headers.get('User-Agent')
        })
        .select()
        .single();

      if (verificationError) throw verificationError;
      verification = newVerification;
    }

    // Generate file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}_${documentType}.${fileExt}`;
    const filePath = `${user.id}/documents/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('kyc-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get private URL
    const { data: urlData } = supabase.storage
      .from('kyc-documents')
      .createSignedUrl(filePath, 3600); // 1 hour signed URL

    if (!urlData) {
      throw new Error('Failed to generate document URL');
    }

    // Save document record to database
    const { data: document, error: documentError } = await supabase
      .from('kyc_documents')
      .insert({
        kyc_verification_id: verification.id,
        user_id: user.id,
        document_type: documentType,
        document_subtype: documentSubtype,
        document_number: documentNumber,
        issuing_country: issuingCountry,
        issue_date: issueDate,
        expiry_date: expiryDate,
        storage_bucket: 'kyc-documents',
        storage_path: filePath,
        encrypted_url: urlData.signedUrl,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        document_status: 'uploaded'
      })
      .select()
      .single();

    if (documentError) throw documentError;

    // Update verification record
    await supabase
      .from('kyc_verifications')
      .update({
        document_uploaded: true,
        verification_status: 'identity_pending'
      })
      .eq('id', verification.id);

    // Log audit event
    await supabase
      .from('kyc_audit_log')
      .insert({
        user_id: user.id,
        kyc_verification_id: verification.id,
        event_type: 'document_uploaded',
        event_data: {
          document_id: document.id,
          document_type: documentType,
          file_name: file.name,
          file_size: file.size
        },
        event_description: `Document uploaded: ${documentType}`,
        actor_id: user.id,
        actor_ip_address: req.headers.get('X-Forwarded-For')?.split(',')[0] || req.headers.get('X-Real-IP')
      });

    return new Response(JSON.stringify({
      success: true,
      message: 'Document uploaded successfully',
      document: {
        id: document.id,
        document_type: documentType,
        status: document.document_status,
        uploaded_at: document.uploaded_at
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error uploading KYC document:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
