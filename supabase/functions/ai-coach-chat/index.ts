import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Retired. Orion chat runs in smart-api. This stub replaces the old code so the next
// auto-deploy switches the live function off (deleting the folder would leave the old
// version running). Once it's deleted in Supabase → Edge Functions, delete this folder too.
serve(() =>
  new Response(JSON.stringify({ error: 'ai-coach-chat is retired; use smart-api' }), {
    status: 410,
    headers: { 'Content-Type': 'application/json' },
  })
);
