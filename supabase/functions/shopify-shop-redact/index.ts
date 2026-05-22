import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function verifyShopifyHmac(body: string, hmacHeader: string): Promise<boolean> {
  const secret = Deno.env.get("SHOPIFY_API_SECRET") ?? "";
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const computedHmac = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return computedHmac === hmacHeader;
}

serve(async (req) => {
  try {
    const rawBody = await req.text();
    const hmacHeader = req.headers.get("x-shopify-hmac-sha256") ?? "";

    const isValid = await verifyShopifyHmac(rawBody, hmacHeader);
    if (!isValid) {
      return new Response("Unauthorized", { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const shopDomain = req.headers.get("x-shopify-shop-domain") ?? "unknown";
    const shopId = payload.shop_id ?? null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await supabase.from("gdpr_requests").insert({
      type: "shop/redact",
      shop_domain: shopDomain,
      shop_id: shopId,
      payload: payload,
      received_at: new Date().toISOString(),
    });

    const { data: platform, error: platformLookupError } = await supabase
      .from("platforms")
      .select("id, user_id")
      .eq("shop_domain", shopDomain)
      .eq("platform_type", "shopify")
      .maybeSingle();

    if (platformLookupError) {
      console.error("[GDPR] Error looking up platform:", platformLookupError.message);
    }

    const deletionErrors: string[] = [];

    if (platform) {
      const { user_id } = platform;

      const userPlatformTables = [
        "orders",
        "order_items",
        "platform_product_links",
        "purchase_orders",
        "purchase_order_items",
        "ai_commands",
        "ai_workflows",
        "saved_commands",
        "scheduled_flash_sales",
        "scheduled_restores",
        "smart_alerts",
        "market_intelligence",
        "inventory_sync_log",
        "sync_retry_queue",
        "workflow_runs",
        "workflow_templates",
        "suppliers",
        "product_suppliers",
        "orion_conversations",
        "orion_digests",
        "orion_memory",
        "orion_messages",
        "orion_preferences",
      ];

      for (const table of userPlatformTables) {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq("user_id", user_id)
          .eq("platform_type", "shopify");

        if (error) {
          const { error: fallbackError } = await supabase
            .from(table)
            .delete()
            .eq("user_id", user_id);
          if (fallbackError) {
            deletionErrors.push(`${table}: ${fallbackError.message}`);
          }
        }
      }
    }

    const { error: platformDeleteError } = await supabase
      .from("platforms")
      .delete()
      .eq("shop_domain", shopDomain)
      .eq("platform_type", "shopify");
    if (platformDeleteError) deletionErrors.push(`platforms: ${platformDeleteError.message}`);

    const { error: oauthError } = await supabase
      .from("oauth_states")
      .delete()
      .eq("shop_domain", shopDomain);
    if (oauthError) deletionErrors.push(`oauth_states: ${oauthError.message}`);

    if (deletionErrors.length > 0) {
      console.error("[GDPR] shop/redact partial errors:", deletionErrors.join(" | "));
    }

    console.log(`[GDPR] Shop redact completed for ${shopDomain} (shop_id: ${shopId})`);

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[GDPR] shop/redact error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
});
