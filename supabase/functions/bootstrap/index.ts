import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface BootstrapConfig {
  app: string;
  adapters: {
    data: 'postgres' | 'mock';
  };
  features: {
    offline_mode: boolean;
    photo_upload: boolean;
    gps_tracking: boolean;
    group_chats: boolean;
    notifications: boolean;
  };
  ui: {
    brand: string;
    accent: string;
    theme: 'light' | 'dark' | 'auto';
    language: string;
  };
  defaults: {
    mode: 'real';
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    let telegram_id = null;
    let user = null;

    if (req.method === "GET") {
      const url = new URL(req.url);
      telegram_id = url.searchParams.get('telegram_id');
    } else if (req.method === "POST") {
      const body = await req.json();
      telegram_id = body.telegram_id;
      user = body.user;
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let config: BootstrapConfig;

    try {
      const { data: appConfig } = await supabase
        .from('app_config')
        .select('config')
        .eq('app', 'logistics')
        .maybeSingle();

      config = appConfig?.config || getDefaultConfig();
    } catch (error) {
      console.warn('Failed to load app config from database, using defaults:', error);
      config = getDefaultConfig();
    }

    let userPrefs = null;
    if (telegram_id) {
      try {
        const { data: preferences } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('telegram_id', telegram_id)
          .eq('app', 'logistics')
          .maybeSingle();

        userPrefs = preferences;

        if (user) {
          const { error: upsertError } = await supabase
            .from('users')
            .upsert({
              telegram_id: user.telegram_id,
              name: user.first_name + (user.last_name ? ` ${user.last_name}` : ''),
              username: user.username,
              photo_url: user.photo_url,
              role: user.role || 'user',
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'telegram_id'
            });

          if (upsertError) {
            console.warn('Failed to upsert user:', upsertError);
          }
        }
      } catch (error) {
        console.warn('Failed to load user preferences:', error);
      }
    }

    return new Response(
      JSON.stringify({
        config,
        user,
        prefMode: userPrefs?.mode || null,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Bootstrap error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function getDefaultConfig(): BootstrapConfig {
  return {
    app: 'logistics',
    adapters: {
      data: 'postgres'
    },
    features: {
      offline_mode: true,
      photo_upload: true,
      gps_tracking: true,
      group_chats: true,
      notifications: true
    },
    ui: {
      brand: 'מערכת לוגיסטיקה',
      accent: '#007aff',
      theme: 'auto',
      language: 'he'
    },
    defaults: {
      mode: 'real'
    }
  };
}