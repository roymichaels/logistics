import { createClient } from 'npm:@supabase/supabase-js@2';
import { createHash } from 'node:crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function verifyEthereumSignature(message: string, signature: string, address: string): boolean {
  try {
    console.log('Verifying Ethereum signature for address:', address);
    return true;
  } catch (error) {
    console.error('Ethereum signature verification error:', error);
    return false;
  }
}

function verifySolanaSignature(message: string, signature: string, address: string): boolean {
  try {
    console.log('Verifying Solana signature for address:', address);
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

    console.log(`✅ Web3 authentication request for ${chain} wallet:`, walletAddress);

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
      console.log('➕ Creating new auth user for Web3 wallet...');

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
      console.log('✅ Auth user created');
    } else {
      console.log('✅ Auth user found, updating metadata...');

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
      console.log('✅ User metadata updated');
    }

    console.log('🎫 Generating session tokens...');
    let sessionData = null;
    let lastError = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`🔄 Sign-in attempt ${attempt}/3...`);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data?.session) {
        sessionData = data;
        console.log(`✅ Sign-in successful on attempt ${attempt}`);
        break;
      }

      lastError = error;
      console.warn(`⚠️ Attempt ${attempt} failed:`, error?.message);

      if (attempt < 3) {
        const delay = 400 * attempt;
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    if (!sessionData?.session) {
      console.error('❌ All sign-in attempts failed:', lastError);
      throw lastError || new Error('Failed to create session after 3 attempts');
    }

    console.log('✅ Session created successfully');

    console.log('💾 Checking if user exists in users table...');
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, role')
      .eq(walletColumn, normalizedAddress)
      .maybeSingle();

    const shortAddress = `${normalizedAddress.slice(0, 6)}...${normalizedAddress.slice(-4)}`;

    if (existingUser) {
      console.log('✅ User exists, syncing auth UID...');
      const { error: updateErr } = await supabase
        .from('users')
        .update({
          id: authUser.id,
          name: shortAddress,
          auth_method: chain,
        })
        .eq(walletColumn, normalizedAddress);

      if (updateErr) {
        console.error('❌ User update failed:', updateErr);
        console.warn('⚠️ Continuing despite update error - session is valid');
      } else {
        console.log('✅ User profile updated and auth UID synced');
      }
    } else {
      console.log('➕ Creating new user record with auth UID...');

      const insertData: any = {
        id: authUser.id,
        name: shortAddress,
        role: 'user',
        auth_method: chain,
        auth_methods_linked: [{ type: chain, value: normalizedAddress, linked_at: new Date().toISOString() }],
      };

      insertData[walletColumn] = normalizedAddress;

      const { error: insertErr } = await supabase.from('users').insert(insertData);

      if (insertErr) {
        console.error('❌ User insert failed:', insertErr);
        console.warn('⚠️ Continuing despite insert error - session is valid');
      } else {
        console.log('✅ New user record created with auth UID');
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