// eBay Account Deletion Notification Handler
// This function handles marketplace account deletion notifications from eBay
// Required for GDPR compliance

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[eBay Account Deletion] Received notification');

    // Create Supabase client with service role for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Parse the notification payload from eBay
    const payload = await req.json();
    console.log('[eBay Account Deletion] Payload:', JSON.stringify(payload, null, 2));

    // eBay sends notifications in this format:
    // {
    //   "metadata": {
    //     "topic": "MARKETPLACE_ACCOUNT_DELETION",
    //     "schemaVersion": "1.0",
    //     "deprecated": false
    //   },
    //   "notification": {
    //     "notificationId": "...",
    //     "eventDate": "2024-01-15T10:30:00.000Z",
    //     "publishDate": "2024-01-15T10:30:05.000Z",
    //     "publishAttemptCount": 1,
    //     "data": {
    //       "username": "ebay_user_123",
    //       "userId": "...",
    //       "eiasToken": "..."
    //     }
    //   }
    // }

    const topic = payload?.metadata?.topic;
    const username = payload?.notification?.data?.username;
    const userId = payload?.notification?.data?.userId;

    if (topic !== 'MARKETPLACE_ACCOUNT_DELETION') {
      console.log(`[eBay Account Deletion] Ignoring topic: ${topic}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Notification ignored' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (!username && !userId) {
      throw new Error('Missing username or userId in notification');
    }

    console.log(`[eBay Account Deletion] Processing deletion for eBay user: ${username || userId}`);

    // Find all platforms connected to this eBay account
    const { data: platforms, error: fetchError } = await supabaseClient
      .from('platforms')
      .select('*')
      .eq('platform_type', 'ebay')
      .or(`metadata->>username.eq.${username},credentials->>userId.eq.${userId}`);

    if (fetchError) {
      console.error('[eBay Account Deletion] Error fetching platforms:', fetchError);
      throw fetchError;
    }

    if (!platforms || platforms.length === 0) {
      console.log('[eBay Account Deletion] No platforms found for this eBay account');
      return new Response(
        JSON.stringify({ success: true, message: 'No platforms found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`[eBay Account Deletion] Found ${platforms.length} platform(s) to process`);

    // Delete or anonymize the platform connections
    // Option 1: Delete completely (recommended for GDPR compliance)
    const platformIds = platforms.map(p => p.id);
    const { error: deleteError } = await supabaseClient
      .from('platforms')
      .delete()
      .in('id', platformIds);

    if (deleteError) {
      console.error('[eBay Account Deletion] Error deleting platforms:', deleteError);
      throw deleteError;
    }

    console.log(`[eBay Account Deletion] Successfully deleted ${platforms.length} platform(s)`);

    // Log the deletion for audit purposes
    const { error: auditError } = await supabaseClient
      .from('audit_logs')
      .insert({
        event_type: 'ebay_account_deletion',
        metadata: {
          ebay_username: username,
          ebay_user_id: userId,
          platforms_deleted: platformIds,
          notification_payload: payload,
        },
        created_at: new Date().toISOString(),
      });

    if (auditError) {
      console.warn('[eBay Account Deletion] Failed to create audit log:', auditError);
      // Don't throw - audit log failure shouldn't fail the deletion
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account deletion processed successfully',
        platforms_deleted: platforms.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[eBay Account Deletion] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to process account deletion',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
