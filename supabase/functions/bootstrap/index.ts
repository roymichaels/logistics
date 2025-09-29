import { corsHeaders } from '../_shared/cors.ts';

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

  if (req.method !== "POST") {
    return new Response("Method not allowed", { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const body = await req.json();
    const { telegram_id } = body;
    
    if (!telegram_id) {
      return new Response(
        JSON.stringify({ error: 'telegram_id required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // TODO: Get user preferences from Supabase
    // For now, return null to force lobby selection
    const userPrefs = null;

    // Default configuration
    const config: BootstrapConfig = {
      app: 'miniapp',
      adapters: {
        data: 'mock'
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