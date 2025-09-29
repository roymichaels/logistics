import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface BootstrapConfig {
  app: string;
  adapters: {
    data: 'supabase' | 'mock';
  };
  features: {
    offline_mode: boolean;
    photo_upload: boolean;
    gps_tracking: boolean;
    route_optimization: boolean;
  };
  ui: {
    brand: string;
    accent: string;
    theme: 'light' | 'dark' | 'auto';
  };
  defaults: {
    mode: 'demo' | 'real';
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get user preferences
    const { data: userPrefs } = await supabase
      .from('user_preferences')
      .select('mode')
      .eq('telegram_id', user.user_metadata.telegram_id)
      .eq('app', 'miniapp')
      .single();

    // Default configuration
    const config: BootstrapConfig = {
      app: 'miniapp',
      adapters: {
        data: 'supabase'
      },
      features: {
        offline_mode: true,
        photo_upload: true,
        gps_tracking: true,
        route_optimization: false
      },
      ui: {
        brand: 'Logistics Mini App',
        accent: '#007aff',
        theme: 'auto'
      },
      defaults: {
        mode: 'demo'
      }
    };

    return new Response(
      JSON.stringify({
        config,
        prefMode: userPrefs?.mode || null,
        user: {
          telegram_id: user.user_metadata.telegram_id,
          first_name: user.user_metadata.first_name,
          last_name: user.user_metadata.last_name,
          username: user.user_metadata.username,
          photo_url: user.user_metadata.photo_url
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Bootstrap error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});