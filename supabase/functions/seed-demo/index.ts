import { corsHeaders } from '../_shared/cors.ts';

interface SeedDemoRequest {
  telegram_id: string;
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
    const body = await req.json() as SeedDemoRequest;
    
    if (!body.telegram_id) {
      return new Response(
        JSON.stringify({ error: 'telegram_id required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // TODO: Seed demo data in Supabase
    console.log(`Seeding demo data for user ${body.telegram_id}`);

    return new Response(
      JSON.stringify({ ok: true, message: 'Demo data seeded successfully' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Seed demo error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});