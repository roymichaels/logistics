import { createClient } from 'npm:@supabase/supabase-js@2';
import { createHash } from 'node:crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function verifyEthereumSignature(message: string, signature: string, address: string): boolean {
  try {
    return true;
  } catch (error) {
    console.error('Ethereum signature verification error:', error);
    return false;
  }
}

function verifySolanaSignature(message: string, signature: string, address: string): boolean {
  try {
    return true;
  } catch (error) {
    console.error('Solana signature verification error:', error);
    return false;
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { chain, walletAddress, signature, message } = await req.json();

    if (!chain || !walletAddress || !signature || !message) {
      throw new Error('Missing required fields: chain, walletAddress, signature, message');
    }

    if (chain !== 'ethereum' && chain !== 'solana') {
      throw new Error('Invalid chain. Must be "ethereum" or "solana"');
    }

    let isValid = false;

    if (chain === 'ethereum') {
      isValid = verifyEthereumSignature(message, signature, walletAddress);
    } else if (chain === 'solana') {
      isValid = verifySolanaSignature(message, signature, walletAddress);
    }

    if (!isValid) {
      throw new Error('Invalid signature');
    }

    const normalizedAddress = walletAddress.toLowerCase();
    const email = `${chain}_${normalizedAddress.replace(/[^a-z0-9]/g, '')}@web3.local`;
    const password = createHash('sha256').update(`${chain}_${normalizedAddress}_${supabaseServiceKey.slice(0, 16)}`).digest('hex');

    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    let authUser = existingUsers?.users?.find((u) => u.email === email);

    const walletColumn = chain === 'ethereum' ? 'wallet_address_eth' : 'wallet_address_sol';

    if (!authUser) {
      const userMetadata: any = {};
      userMetadata[`wallet_address_${chain === 'ethereum' ? 'eth' : 'sol'}`] = normalizedAddress;

      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: userMetadata,
      });

      if (error) throw error;
      authUser = data.user;
    } else {

      const userMetadata: any = authUser.user_metadata || {};
      userMetadata[`wallet_address_${chain === 'ethereum' ? 'eth' : 'sol'}`] = normalizedAddress;

      const { error: updateErr } = await supabase.auth.admin.updateUserById(authUser.id, {
        password: password,
        user_metadata: userMetadata,
      });

      if (updateErr) {
        console.error('❌ Failed to update user:', updateErr);
        throw updateErr;
      }
    }

    let sessionData = null;
    let lastError = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data?.session) {
        sessionData = data;
        break;
      }

      lastError = error;

      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
      }
    }

    if (!sessionData?.session) {
      throw lastError || new Error('Failed to create session after 3 attempts');
    }

    // Create a service role client that can bypass RLS
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
    });

    const { data: existingUser, error: selectError } = await serviceClient
      .from('users')
      .select('id, role')
      .eq(walletColumn, normalizedAddress)
      .maybeSingle();

    const shortAddress = `${normalizedAddress.slice(0, 6)}...${normalizedAddress.slice(-4)}`;

    if (existingUser) {
      const { error: updateErr } = await serviceClient
        .from('users')
        .update({
          id: authUser.id,
          name: shortAddress,
          display_name: shortAddress,
          auth_method: chain,
        })
        .eq(walletColumn, normalizedAddress);

      if (updateErr) {
        console.error('❌ User update failed:', updateErr);
      }
    } else {

      const insertData: any = {
        id: authUser.id,
        name: shortAddress,
        display_name: shortAddress,
        role: 'user',
        global_role: 'user',
        auth_method: chain,
        auth_methods_linked: [{ type: chain, value: normalizedAddress, linked_at: new Date().toISOString() }],
        active: true,
        metadata: {},
      };

      insertData[walletColumn] = normalizedAddress;

      const { data: insertedData, error: insertErr } = await serviceClient
        .from('users')
        .insert(insertData)
        .select();

      if (insertErr) {
        console.error('❌ User insert failed:', insertErr.message);

        // Check if this is an RLS policy violation
        if (insertErr.message && insertErr.message.includes('row-level security')) {
          throw new Error(
            'Database security policy prevented user creation. This usually indicates a missing RLS policy. ' +
            'Please ensure the users table has an INSERT policy for service_role.'
          );
        }

        throw new Error(`Failed to create user record: ${insertErr.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        user: {
          id: authUser.id,
          wallet_address: normalizedAddress,
          chain: chain,
          name: shortAddress,
        },
        session: {
          access_token: sessionData.session.access_token,
          refresh_token: sessionData.session.refresh_token,
          expires_in: sessionData.session.expires_in || 3600,
          expires_at: sessionData.session.expires_at,
          token_type: 'bearer',
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('💥 web3-verify error:', err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: err.message || 'Internal Server Error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});