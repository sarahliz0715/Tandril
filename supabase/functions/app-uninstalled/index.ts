// Shopify Webhook: app/uninstalled
// Fires immediately when a merchant uninstalls the app.
// Primary job: revoke the stored access token so Tandril can no longer
// make API calls to that store. Full data deletion happens 48 hours
// later via the shop/redact GDPR webhook.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

async function verifyShopifyWebhook(
  body: string,
  hmacHeader: string | null,
  secret: string
): Promise<boolean> {
  if (!hmacHeader) return false;

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const hashArray = Array.from(new Uint8Array(signature));
    const hashBase64 = btoa(String.fromCharCode(...hashArray));

    return hashBase64 === hmacHeader;
  } catch (error) {
    console.error('[app/uninstalled] HMAC verification error:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const hmacHeader  = req.headers.get('X-Shopify-Hmac-Sha256');
    const shopDomain  = req.headers.get('X-Shopify-Shop-Domain');
    const rawBody     = await req.text();

    const shopifyApiSecret = Deno.env.get('SHOPIFY_API_SECRET');
    if (!shopifyApiSecret) {
      console.error('[app/uninstalled] SHOPIFY_API_SECRET not configured');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isValid = await verifyShopifyWebhook(rawBody, hmacHeader, shopifyApiSecret);
    if (!isValid) {
      console.error('[app/uninstalled] Invalid HMAC signature — rejecting');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.parse(rawBody);
    const domain = payload.domain ?? shopDomain ?? payload.myshopify_domain;

    console.log('[app/uninstalled] Received uninstall event:', {
      shop_id: payload.id,
      domain,
    });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Immediately revoke the access token — most important step.
    //    Nulling the token means even if the row stays, no API calls succeed.
    const { error: revokeError } = await supabase
      .from('platform_connections')
      .update({
        access_token: null,
        status: 'disconnected',
        disconnected_at: new Date().toISOString(),
      })
      .eq('platform_type', 'shopify')
      .or(`shop_domain.eq.${domain},shop_domain.eq.${domain?.replace('.myshopify.com', '')}`);

    if (revokeError) {
      console.error('[app/uninstalled] Error revoking access token:', revokeError);
    } else {
      console.log('[app/uninstalled] Access token revoked for:', domain);
    }

    // 2. Cancel active Shopify billing subscription in user metadata
    //    (the actual Shopify-side cancellation happens automatically on uninstall)
    try {
      const { data: platform } = await supabase
        .from('platform_connections')
        .select('user_id')
        .eq('platform_type', 'shopify')
        .or(`shop_domain.eq.${domain},shop_domain.eq.${domain?.replace('.myshopify.com', '')}`)
        .single();

      if (platform?.user_id) {
        // Look up the user and clear shopify_subscription_id if they had a Shopify billing plan
        const { data: userData } = await supabase.auth.admin.getUserById(platform.user_id);
        const meta = userData?.user?.user_metadata ?? {};

        if (meta.shopify_subscription_id) {
          await supabase.auth.admin.updateUserById(platform.user_id, {
            user_metadata: {
              ...meta,
              shopify_subscription_id: null,
              // Downgrade to free — their Shopify billing is cancelled
              subscription_tier: 'free',
              api_usage_limit: 50,
              platforms_limit: 2,
            },
          });
          console.log('[app/uninstalled] Shopify subscription cleared for user:', platform.user_id);
        }
      }
    } catch (billingError) {
      // Non-fatal — log and continue
      console.warn('[app/uninstalled] Could not clear billing metadata:', billingError.message);
    }

    // 3. Log the uninstall for compliance tracking
    try {
      await supabase.from('compliance_requests').insert({
        request_type: 'app/uninstalled',
        shop_id: String(payload.id ?? ''),
        shop_domain: domain,
        received_at: new Date().toISOString(),
        status: 'completed',
      });
    } catch (logError) {
      console.warn('[app/uninstalled] Could not log to compliance_requests:', logError.message);
    }

    console.log('[app/uninstalled] Uninstall handling complete for:', domain);

    // Always return 200 — Shopify will retry on non-2xx
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[app/uninstalled] Unhandled error:', error);
    // Still 200 — don't let Shopify retry on server errors
    return new Response(JSON.stringify({ received: true, error: error.message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
