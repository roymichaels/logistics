import { corsHeaders } from '../_shared/cors.ts';

interface SetModeRequest {
  telegram_id: string;
  mode: 'demo' | 'real';
}

Deno.serve(async (req: Request) => {
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
    const body = await req.json() as SetModeRequest;
    
    if (!body.telegram_id || !['demo', 'real'].includes(body.mode)) {
      return new Response(
        JSON.stringify({ error: 'Invalid telegram_id or mode' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`User ${body.telegram_id} set mode to ${body.mode}`);

    return new Response(
      JSON.stringify({ ok: true, mode: body.mode }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Set user mode error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});