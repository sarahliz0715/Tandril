import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Verify that the webhook actually came from Shopify
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

    // Reject anything that didn't come from Shopify
    const isValid = await verifyShopifyHmac(rawBody, hmacHeader);
    if (!isValid) {
      return new Response("Unauthorized", { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const shopDomain = req.headers.get("x-shopify-shop-domain") ?? "unknown";

    // Log the request for your records (good practice + shows compliance)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await supabase.from("gdpr_requests").insert({
      type: "customers/data_request",
      shop_domain: shopDomain,
      customer_id: payload.customer?.id ?? null,
      customer_email: payload.customer?.email ?? null,
      orders_requested: payload.orders_requested ?? [],
      payload: payload,
      received_at: new Date().toISOString(),
    });

    console.log(`[GDPR] Data request received for customer ${payload.customer?.id} on ${shopDomain}`);

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[GDPR] customers/data_request error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
});
