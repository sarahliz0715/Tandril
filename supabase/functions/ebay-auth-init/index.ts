// eBay OAuth Initiation Edge Function
// This function generates the eBay OAuth authorization URL

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
'Access-Control-Allow-Origin': '*',
'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
if (req.method === 'OPTIONS') {
return new Response('ok', { headers: corsHeaders, status: 200 });
}

try {
const authHeader = req.headers.get('Authorization');
if (!authHeader) {
throw new Error('Missing authorization header');
}

const supabaseClient = createClient(
Deno.env.get('SUPABASE_URL') ?? '',
Deno.
